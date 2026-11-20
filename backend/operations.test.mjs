import { strict as assert } from "node:assert";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { grantMembership, listMemberships, resetPassword, revokeMembership, setAccountEnabled } from "./accounts.mjs";
import { checkCredentials, createSession, readSession } from "./auth.mjs";
import { backupDatabase, restoreDatabase } from "./backup.mjs";
import { DATABASE_VERSION, openDatabase, readInventory } from "./database.mjs";

const actor = "operator:test";
const password = "operations-fixture-password";
const replacement = "operations-replacement-password";
const email = "manager@pilot.example";
const second = "second@pilot.example";

const grant = (db, target, storeId = "north", role = "manager") => grantMembership(db, {
  email: target, password, storeId, storeName: storeId, actor, role,
});

test("account operations preserve store access, revoke credentials, and append non-secret audit events", async (t) => {
  const db = openDatabase(":memory:");
  t.after(() => db.close());
  await grant(db, email);
  await grant(db, email, "south");
  await assert.rejects(grant(db, email, "north", "viewer"), /another active account/);
  assert.throws(() => setAccountEnabled(db, { email, enabled: false, actor }), /another active account/);

  await grant(db, second);
  await grant(db, second, "south");
  const credentials = await checkCredentials(db, email, password);
  const cookie = createSession(db, { headers: {} }, credentials, true);
  assert.match(cookie, /; HttpOnly; SameSite=Strict; Secure$/);
  const request = { headers: { cookie: cookie.split(";")[0] } };

  assert.ok(revokeMembership(db, { email, storeId: "north", actor }));
  assert.equal(readSession(db, request).email, email);
  assert.deepEqual(listMemberships(db).filter((row) => row.email === email).map((row) => row.storeId), ["south"]);

  await resetPassword(db, { email, password: replacement, actor });
  assert.equal(readSession(db, request), null);
  assert.equal(createSession(db, { headers: {} }, credentials, true), null);
  assert.equal(await checkCredentials(db, email, password), null);
  const newCredentials = await checkCredentials(db, email, replacement);
  request.headers.cookie = createSession(db, { headers: {} }, newCredentials, true).split(";")[0];

  assert.ok(setAccountEnabled(db, { email, enabled: false, actor }));
  assert.equal(readSession(db, request), null);
  assert.equal(await checkCredentials(db, email, replacement), null);
  assert.ok(setAccountEnabled(db, { email, enabled: true, actor }));
  assert.ok(await checkCredentials(db, email, replacement));
  assert.equal(readSession(db, request), null);

  const events = db.prepare("SELECT * FROM audit_events ORDER BY id").all();
  assert.deepEqual(events.slice(-4).map((event) => event.action), [
    "membership.revoke", "account.password_reset", "account.disable", "account.enable",
  ]);
  const content = JSON.stringify(events);
  for (const secret of [password, replacement, cookie.split(";")[0].split("=")[1], email]) {
    assert.ok(!content.includes(secret));
  }
  assert.throws(() => db.exec("DELETE FROM audit_events"), /cannot be deleted/);
  assert.throws(() => db.exec("UPDATE audit_events SET actor = 'other'"), /cannot be updated/);
});

test("legacy version zero is upgraded without dropping existing users and memberships", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ri-legacy-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "legacy.sqlite");
  const old = new DatabaseSync(file);
  old.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL) STRICT;
    CREATE TABLE stores (id TEXT PRIMARY KEY, name TEXT NOT NULL) STRICT;
    CREATE TABLE memberships (
      user_id TEXT NOT NULL REFERENCES users(id), store_id TEXT NOT NULL REFERENCES stores(id),
      role TEXT NOT NULL CHECK(role IN ('manager', 'viewer')), PRIMARY KEY (user_id, store_id)
    ) STRICT;
    INSERT INTO users VALUES ('legacy-id', 'legacy@pilot.example', 'fixture-hash');
    INSERT INTO stores VALUES ('legacy-store', 'Legacy Store');
    INSERT INTO memberships VALUES ('legacy-id', 'legacy-store', 'manager');
  `);
  old.close();

  const upgraded = openDatabase(file);
  try {
    assert.equal(upgraded.prepare("PRAGMA user_version").get().user_version, DATABASE_VERSION);
    assert.deepEqual(listMemberships(upgraded).map((entry) => ({ ...entry })), [{
      email: "legacy@pilot.example", disabledAt: null, storeId: "legacy-store", storeName: "Legacy Store", role: "manager",
    }]);
    assert.equal(upgraded.prepare("SELECT password_hash FROM users").get().password_hash, "fixture-hash");
  } finally {
    upgraded.close();
  }
  const reopened = openDatabase(file);
  reopened.close();
});

test("online backup includes committed WAL data and isolated restore clears sessions", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ri-recovery-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const live = join(directory, "live.sqlite");
  const snapshot = join(directory, "backup.sqlite");
  const restored = join(directory, "isolated.sqlite");
  const db = openDatabase(live);
  try {
    await grant(db, email);
    const session = createSession(db, { headers: {} }, await checkCredentials(db, email, password), false);
    const request = { headers: { cookie: session.split(";")[0] } };
    db.exec(`
      INSERT INTO products (store_id, id, name, category, current_stock, stock_date, updated_at, details_date)
        VALUES ('north', 'SKU-1', 'Beans', 'Pantry', 60, '2026-01-20', '2026-01-20', '2026-01-20');
      INSERT INTO monthly_sales VALUES ('north', 'SKU-1', '2026-01', 32, 42);
    `);
    const inventory = readInventory(db, "north");
    assert.ok((await stat(live + "-wal")).size > 0);
    await backupDatabase(live, snapshot);
    assert.equal((await stat(snapshot)).mode & 0o777, 0o600);
    await assert.rejects(backupDatabase(live, snapshot), /new destination/);
    await assert.rejects(restoreDatabase(snapshot, live, actor), /new destination/);

    await restoreDatabase(snapshot, restored, actor);
    const recovered = openDatabase(restored);
    try {
      assert.deepEqual(readInventory(recovered, "north"), inventory);
      assert.equal(readSession(recovered, request), null);
      assert.equal(readSession(db, request).email, email);
      assert.equal(recovered.prepare("SELECT action FROM audit_events ORDER BY id DESC LIMIT 1").get().action, "database.restore");
      assert.equal(Math.max(0, 250 + 30 - readInventory(recovered, "north").products[0].currentStock - 20), 200);
    } finally {
      recovered.close();
    }
  } finally {
    db.close();
  }
});
