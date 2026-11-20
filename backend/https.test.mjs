import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { grantMembership } from "./accounts.mjs";
import { backupDatabase, restoreDatabase } from "./backup.mjs";
import { openDatabase } from "./database.mjs";
import { createInventoryServer } from "./server.mjs";

async function listen(options, cert, t) {
  const server = createInventoryServer(options);
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return (path, { method = "GET", cookie, body } = {}) => new Promise((resolve, reject) => {
    const req = request({
      host: "127.0.0.1", port: server.address().port, path, method, ca: cert,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    }, (response) => {
      let text = "";
      response.setEncoding("utf8").on("data", (chunk) => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, text }));
      response.on("error", reject);
    });
    req.on("error", reject).end(body ? JSON.stringify(body) : undefined);
  });
}

test("a synthetic store survives backup and restore over verified HTTPS", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "retail-https-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const config = join(dir, "openssl.cnf");
  const keyFile = join(dir, "key.pem");
  const certFile = join(dir, "cert.pem");
  await writeFile(config, "[req]\ndistinguished_name=dn\nx509_extensions=cert\nprompt=no\n[dn]\nCN=localhost\n[cert]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-config", config, "-keyout", keyFile, "-out", certFile], { stdio: "ignore" });
  const cert = await readFile(certFile);
  const tls = { cert, key: await readFile(keyFile) };
  const dbFile = join(dir, "inventory.sqlite");
  const db = openDatabase(dbFile);
  t.after(() => db.close());
  const staticRoot = join(dir, "dist");
  await mkdir(staticRoot);
  await mkdir(join(staticRoot, "assets"));
  await writeFile(join(staticRoot, "index.html"), "<title>Retail Intelligence</title>");
  await writeFile(join(staticRoot, "private.csv"), "private fixture");
  await symlink(join(staticRoot, "private.csv"), join(staticRoot, "assets", "linked.csv"));
  const fetchLive = await listen({ db, tls, staticRoot }, cert, t);
  assert.equal((await fetchLive("/healthz")).status, 200);
  assert.match((await fetchLive("/store-inventory")).text, /Retail Intelligence/);
  for (const forbidden of ["/private.csv", "/assets/linked.csv", "/inventory.sqlite"]) {
    assert.equal((await fetchLive(forbidden)).status, 404);
  }
  const body = { email: "manager@https.example", password: "synthetic-https-password" };
  await grantMembership(db, { ...body, storeId: "north", storeName: "North", actor: "test:https" });
  const signIn = { method: "POST", body };
  const session = await fetchLive("/api/session", signIn);
  assert.equal(session.status, 200);
  const setCookie = session.headers["set-cookie"][0];
  assert.match(setCookie, /; Secure/);
  assert.match(setCookie, /; HttpOnly/);
  const cookie = setCookie.split(";")[0];
  const base = "/api/stores/north";
  const csv = await readFile(new URL("../sample-data/inventory_valid.csv", import.meta.url), "utf8");
  assert.equal((await fetchLive(`${base}/imports`, {
    method: "POST", cookie, body: { fileName: "inventory.csv", csv },
  })).status, 200);
  const conflictingCsv = [
    "product_id,product_name,date,ordered_quantity,sold_quantity,current_stock",
    "P-1013,Bread,2026-10-01,1,1,3",
    "P-1013,Bread,2026-10-01,1,1,8",
  ].join("\n");
  const rejected = await fetchLive(`${base}/imports`, {
    method: "POST", cookie, body: { fileName: "conflicting.csv", csv: conflictingCsv },
  });
  assert.equal(rejected.status, 422);
  assert.match(rejected.text, /Conflicting stock counts/);

  const backup = await backupDatabase(dbFile, join(dir, "backup.sqlite"));
  const restored = await restoreDatabase(backup, join(dir, "restored.sqlite"), "test:https");
  const restoredDb = openDatabase(restored);
  t.after(() => restoredDb.close());
  const fetchRestored = await listen({ db: restoredDb, tls }, cert, t);
  assert.equal((await fetchRestored("/api/session", { cookie })).status, 401);
  assert.equal((await fetchLive("/api/session", { cookie })).status, 200);
  const newSession = await fetchRestored("/api/session", signIn);
  assert.equal(newSession.status, 200);
  const newCookie = newSession.headers["set-cookie"][0].split(";")[0];
  const restoredInventory = await fetchRestored(`${base}/inventory`, { cookie: newCookie });
  assert.equal(restoredInventory.status, 200);
  const { products, imports } = JSON.parse(restoredInventory.text);
  assert.equal(products.length, 3);
  assert.equal(imports.length, 1);
  assert.equal(imports[0].rowCount, 36);
  assert.equal(products.find(({ id }) => id === "P-1013").currentStock, 150);
  const reorder = await fetchRestored(`${base}/reorder`, {
    method: "POST", cookie: newCookie,
    body: { productId: "P-1013", forecastDemand: 250, safetyStock: 30, incomingStock: 20 },
  });
  assert.equal(reorder.status, 200);
  assert.equal(JSON.parse(reorder.text).recommendedOrder, 110);

  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetchLive("/api/session", {
      method: "POST",
      body: { email: `unknown-${Math.floor(attempt / 10)}@https.example`, password: "wrong-password" },
    });
    assert.equal(response.status, 401);
  }
  assert.equal((await fetchLive("/api/session", signIn)).status, 429);
});
