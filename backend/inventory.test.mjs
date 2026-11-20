import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { grantMembership } from "./accounts.mjs";
import { openDatabase } from "./database.mjs";
import { createInventoryServer } from "./server.mjs";

const password = "integration-fixture-password";
const csvHead = "product_id,product_name,date,ordered_quantity,sold_quantity,current_stock";
const csvRows = (...rows) => [csvHead, ...rows].join("\n");

async function runServer(db) {
  const server = createInventoryServer({ db });
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    async beginUpload(path, cookie, body) {
      const payload = JSON.stringify(body);
      const connection = request(base + path, {
        method: "POST",
        headers: {
          Cookie: cookie, Expect: "100-continue",
          "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload),
        },
      });
      const result = new Promise((resolve, reject) => {
        connection.on("error", reject);
        connection.on("response", (response) => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        });
      });
      await new Promise((resolve, reject) => {
        connection.on("error", reject);
        connection.once("continue", resolve);
        connection.flushHeaders();
      });
      return () => {
        connection.end(payload);
        return result;
      };
    },
    request(path, { method = "GET", body, cookie, headers } = {}) {
      return fetch(base + path, {
        method,
        headers: { ...(body && { "Content-Type": "application/json" }), ...(cookie && { Cookie: cookie }), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function login(server, email) {
  const response = await server.request("/api/session", { method: "POST", body: { email, password } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /; HttpOnly; SameSite=Strict/);
  return { cookie: cookie.split(";")[0], session: await response.json() };
}

const south = "/api/stores/south";
const north = "/api/stores/north";
const post = (server, path, cookie, body) => server.request(path, { method: "POST", cookie, body });
const upload = (server, store, cookie, csv, fileName = "inventory.csv") => post(server, store + "/imports", cookie, { fileName, csv });
const get = async (server, store, cookie) => {
  const response = await server.request(store + "/inventory", { cookie });
  assert.equal(response.status, 200);
  return response.json();
};

test("authenticated inventory persists across server restarts and is isolated by store and role", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "retail-inventory-test-"));
  const file = join(directory, "inventory.sqlite");
  let db = openDatabase(file);
  let server;
  t.after(async () => {
    await server?.close();
    db.close();
    await rm(directory, { recursive: true, force: true });
  });
  await grantMembership(db, { actor: "test", email: "manager@north.example", password, storeId: "north", storeName: "North" });
  await grantMembership(db, { actor: "test", email: "viewer@north.example", password, storeId: "north", storeName: "North", role: "viewer" });
  await grantMembership(db, { actor: "test", email: "manager@south.example", password, storeId: "south", storeName: "South" });
  server = await runServer(db);
  let northCookie, southCookie, viewerCookie;

  await t.test("sign-in and membership", async () => {
    assert.equal((await server.request(north + "/inventory")).status, 401);
    assert.equal((await post(server, "/api/session", null, { email: "manager@north.example", password: "wrong" })).status, 401);
    const loginResponse = await login(server, "manager@north.example");
    northCookie = loginResponse.cookie;
    assert.deepEqual(loginResponse.session.stores, [{ id: "north", name: "North", role: "manager" }]);
    const crossSite = await server.request("/api/session", { cookie: northCookie, headers: { "Sec-Fetch-Site": "cross-site" } });
    assert.equal(crossSite.status, 403);
    southCookie = (await login(server, "manager@south.example")).cookie;
    viewerCookie = (await login(server, "viewer@north.example")).cookie;
  });

  const first = csvRows("SKU-1,North Beans,2026-01-10,24,20,60", "SKU-1,North Beans,2026-01-20,18,12,60");
  await t.test("bad files do not write data; repeated valid imports only write once", async () => {
    const invalid = await upload(server, north, northCookie, csvRows("SKU-1,North Beans,2026-02-30,24,20,60"));
    assert.equal(invalid.status, 422);
    assert.deepEqual(await get(server, north, northCookie), { products: [], imports: [] });
    const firstResponse = await upload(server, north, northCookie, first);
    assert.equal(firstResponse.status, 200);
    const firstBatch = await firstResponse.json();
    const retry = await upload(server, north, northCookie, first, "renamed.csv");
    assert.deepEqual(await retry.json(), firstBatch);
    const { products, imports } = await get(server, north, viewerCookie);
    assert.equal(imports.length, 1);
    assert.equal(db.prepare("SELECT count(*) AS count FROM audit_events WHERE action = 'inventory.import'").get().count, 1);
    assert.deepEqual(products[0].history, [{ month: "2026-01", soldQuantity: 32, orderedQuantity: 42 }]);
  });

  await t.test("store members can only read and write their own store; viewers cannot import", async () => {
    const otherStoreCsv = csvRows("SKU-1,South Beans,2026-01-20,3,2,7");
    const viewerWrite = await upload(server, north, viewerCookie, otherStoreCsv);
    assert.equal(viewerWrite.status, 403);
    assert.equal((await server.request(south + "/inventory", { cookie: northCookie })).status, 404);
    assert.equal((await upload(server, south, northCookie, otherStoreCsv)).status, 404);
    assert.equal((await post(server, south + "/reorder", northCookie, {
      productId: "SKU-1", forecastDemand: 100, safetyStock: 0, incomingStock: 0,
    })).status, 404);
    assert.equal((await upload(server, south, southCookie, otherStoreCsv)).status, 200);
    assert.equal((await get(server, south, southCookie)).products[0].name, "South Beans");
    assert.equal((await get(server, north, northCookie)).products[0].name, "North Beans");
  });

  await t.test("overlapping history is replaced, older stock is ignored, and reorder returns its inputs", async () => {
    const historyUpdate = csvRows("SKU-1,Old Name,2026-01-02,11,9,87", "SKU-2,Stock Unknown,2026-02-01,12,8,");
    assert.equal((await upload(server, north, northCookie, historyUpdate)).status, 200);
    const { products } = await get(server, north, northCookie);
    assert.equal(products[0].name, "North Beans");
    assert.equal(products[0].currentStock, 60);
    assert.equal(products[0].stockDate, "2026-01-20");
    assert.equal(products[0].history[0].soldQuantity, 9);

    const inputs = { productId: "SKU-1", forecastDemand: 250, safetyStock: 30, incomingStock: 20 };
    const quote = await post(server, north + "/reorder", viewerCookie, inputs);
    assert.equal(quote.status, 200);
    assert.deepEqual(await quote.json(), {
      ...inputs, currentStock: 60, stockDate: "2026-01-20", formulaVersion: 1, recommendedOrder: 200,
    });
    const noStock = await post(server, north + "/reorder", viewerCookie, { ...inputs, productId: "SKU-2" });
    assert.equal(noStock.status, 422);
    const invalidInputs = await post(server, north + "/reorder", viewerCookie, { ...inputs, incomingStock: -1 });
    assert.equal(invalidInputs.status, 422);
  });


  await t.test("an import rechecks the session and manager role after the request body arrives", async () => {
    await grantMembership(db, { actor: "test", email: "second@north.example", password, storeId: "north", storeName: "North" });
    const csv = csvRows("SKU-3,Test Beans,2026-04-01,10,8,4");
    const finishDemoted = await server.beginUpload(north + "/imports", northCookie, { fileName: "late.csv", csv });
    await grantMembership(db, {
      actor: "test", email: "manager@north.example", storeId: "north", storeName: "North", role: "viewer",
    });
    assert.equal(await finishDemoted(), 403);
    await grantMembership(db, {
      actor: "test", email: "manager@north.example", storeId: "north", storeName: "North", role: "manager",
    });

    const finishSignedOut = await server.beginUpload(north + "/imports", northCookie, { fileName: "late.csv", csv });
    assert.equal((await server.request("/api/session", { method: "DELETE", cookie: northCookie })).status, 204);
    assert.equal(await finishSignedOut(), 401);
    northCookie = (await login(server, "manager@north.example")).cookie;
    const { products, imports } = await get(server, north, northCookie);
    assert.equal(products.length, 2);
    assert.equal(imports.length, 2);
  });

  await t.test("data is durable and signing out revokes the session", async () => {
    await server.close();
    server = undefined;
    db.close();
    db = openDatabase(file);
    server = await runServer(db);
    assert.equal((await get(server, north, northCookie)).imports.length, 2);
    assert.equal((await get(server, north, northCookie)).products[0].currentStock, 60);
    assert.equal((await server.request("/api/session", { method: "DELETE", cookie: northCookie })).status, 204);
    assert.equal((await server.request(north + "/inventory", { cookie: northCookie })).status, 401);
  });
});

test("three synthetic stores reconcile inventory independently", async (t) => {
  const db = openDatabase(":memory:");
  const server = await runServer(db);
  t.after(async () => {
    await server.close();
    db.close();
  });
  const scenarios = [
    { id: "cedar-grocery", name: "Cedar Grocery", stock: 9, octoberSales: 160, order: 40 },
    { id: "harbour-market", name: "Harbour Market", stock: 90, octoberSales: 19, order: 0 },
    { id: "maple-produce", name: "Maple Produce", stock: 22, octoberSales: 69, order: 27 },
  ];
  const fixture = (name) => readFile(new URL(`../sample-data/stores/${name}.csv`, import.meta.url), "utf8");

  for (const store of scenarios) {
    const email = `manager@${store.id}.example`;
    await grantMembership(db, { actor: "test:synthetic", email, password, storeId: store.id, storeName: store.name });
    const { cookie } = await login(server, email);
    store.cookie = cookie;
    store.path = `/api/stores/${store.id}`;
    const csv = await fixture(store.id);
    const response = await upload(server, store.path, cookie, csv, `${store.id}.csv`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).rowCount, 8);
  }

  for (const store of scenarios) {
    const { products, imports } = await get(server, store.path, store.cookie);
    assert.equal(products.length, 2);
    assert.equal(imports.length, 1);
    const bread = products.find(({ id }) => id === "SHARED-01");
    assert.equal(bread.currentStock, store.stock);
    assert.equal(bread.history.at(-1).soldQuantity, store.octoberSales);
    const result = await post(server, store.path + "/reorder", store.cookie, {
      productId: bread.id, forecastDemand: 50, safetyStock: 4, incomingStock: 5,
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).recommendedOrder, store.order);
    for (const other of scenarios.filter(({ id }) => id !== store.id)) {
      assert.equal((await server.request(other.path + "/inventory", { cookie: store.cookie })).status, 404);
      assert.equal((await upload(server, other.path, store.cookie, await fixture(store.id))).status, 404);
    }
  }

  const [cedar, , maple] = scenarios;
  assert.equal((await upload(server, cedar.path, cedar.cookie, await fixture("cedar-grocery-correction"))).status, 200);
  assert.equal((await upload(server, cedar.path, cedar.cookie, await fixture("cedar-grocery-conflict"))).status, 422);
  const corrected = await get(server, cedar.path, cedar.cookie);
  const bread = corrected.products.find(({ id }) => id === "SHARED-01");
  assert.equal(corrected.imports.length, 2);
  assert.equal(bread.currentStock, 9);
  assert.equal(bread.history.find(({ month }) => month === "2026-09").soldQuantity, 145);

  const apples = (await get(server, maple.path, maple.cookie)).products.find(({ id }) => id === "MAP-02");
  assert.equal(apples.stockKnown, false);
  assert.equal(apples.history.find(({ month }) => month === "2026-09").soldQuantity, 0);
  assert.equal((await post(server, maple.path + "/reorder", maple.cookie, {
    productId: apples.id, forecastDemand: 50, safetyStock: 4, incomingStock: 5,
  })).status, 422);
});
