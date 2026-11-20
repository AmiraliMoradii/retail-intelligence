import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrations = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL REFERENCES users(id),
      store_id TEXT NOT NULL REFERENCES stores(id),
      role TEXT NOT NULL CHECK(role IN ('manager', 'viewer')),
      PRIMARY KEY (user_id, store_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS products (
      store_id TEXT NOT NULL REFERENCES stores(id),
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      current_stock INTEGER,
      stock_date TEXT,
      supplier_lead_time INTEGER,
      unit_cost REAL,
      updated_at TEXT NOT NULL,
      details_date TEXT NOT NULL,
      PRIMARY KEY (store_id, id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS monthly_sales (
      store_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      month TEXT NOT NULL,
      sold INTEGER NOT NULL,
      ordered INTEGER NOT NULL,
      PRIMARY KEY (store_id, product_id, month),
      FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS imports (
      store_id TEXT NOT NULL REFERENCES stores(id),
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      digest TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (store_id, id),
      UNIQUE (store_id, digest)
    ) STRICT;
  `,
  `
    ALTER TABLE users ADD COLUMN disabled_at TEXT;
    ALTER TABLE users ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX sessions_by_user ON sessions(user_id);
    CREATE TABLE audit_events (
      id INTEGER PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      store_id TEXT REFERENCES stores(id),
      import_id TEXT,
      from_role TEXT,
      to_role TEXT,
      FOREIGN KEY (store_id, import_id) REFERENCES imports(store_id, id)
    ) STRICT;
    CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events
      BEGIN SELECT RAISE(ABORT, 'Audit events cannot be updated.'); END;
    CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
      BEGIN SELECT RAISE(ABORT, 'Audit events cannot be deleted.'); END;
  `,
];

export const DATABASE_VERSION = migrations.length;

export function openDatabase(file = process.env.RI_DB_PATH ?? ".ri-data/inventory.sqlite") {
  if (file !== ":memory:") {
    file = resolve(file);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  }
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    transaction(db, () => {
      const version = db.prepare("PRAGMA user_version").get().user_version;
      if (version > DATABASE_VERSION) throw new Error("The database requires a newer application version.");
      // The original preview database did not set a schema version. Migration 1 recognizes its existing tables.
      for (let next = version + 1; next <= DATABASE_VERSION; next++) {
        db.exec(migrations[next - 1]);
        db.exec(`PRAGMA user_version = ${next}`);
      }
    });
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function appendAudit(db, { action, actor, userId = null, storeId = null, importId = null, fromRole = null, toRole = null }) {
  db.prepare(`
    INSERT INTO audit_events (occurred_at, action, actor, user_id, store_id, import_id, from_role, to_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(new Date().toISOString(), action, actor, userId, storeId, importId, fromRole, toRole);
}

export function transaction(db, work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const categories = [
  "Dairy", "Bakery", "Produce", "Pantry", "Beverages", "Frozen", "Snacks", "Uncategorized",
];

function categoryFor(input) {
  if (!input) return null;
  return categories.find((category) => category.toLowerCase() === input.toLowerCase()) ?? "Uncategorized";
}

export const MAX_WHOLE_QUANTITY = 1_000_000_000;

export function readInventory(db, storeId) {
  const sales = db.prepare(`
    SELECT product_id, month, sold AS soldQuantity, ordered AS orderedQuantity
    FROM monthly_sales WHERE store_id = ? ORDER BY month
  `).all(storeId);
  const historyByProduct = new Map();
  for (const { product_id, ...month } of sales) {
    const history = historyByProduct.get(product_id) ?? [];
    history.push(month);
    historyByProduct.set(product_id, history);
  }

  const products = db.prepare("SELECT * FROM products WHERE store_id = ? ORDER BY name, id")
    .all(storeId).map((row) => {
      const history = historyByProduct.get(row.id) ?? [];
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        unit: "unit",
        unitCost: row.unit_cost ?? 0,
        supplierLeadTimeDays: row.supplier_lead_time ?? 0,
        currentStock: row.current_stock ?? 0,
        stockKnown: row.current_stock !== null,
        stockDate: row.stock_date,
        safetyStock: 0,
        incomingStock: 0,
        lastOrderedQuantity: history.at(-1)?.orderedQuantity ?? 0,
        history,
        importedAt: row.updated_at,
      };
    });
  const imports = db.prepare("SELECT data FROM imports WHERE store_id = ? ORDER BY rowid DESC")
    .all(storeId).map((row) => JSON.parse(row.data));
  return { products, imports };
}

export function groupInventoryRows(records) {
  const groups = new Map();
  for (const row of records) {
    const group = groups.get(row.product_id) ?? { months: new Map() };
    const month = row.date.slice(0, 7);
    const date = row.date.length === 7 ? `${row.date}-01` : row.date;
    const sales = group.months.get(month) ?? { sold: 0, ordered: 0 };
    sales.sold += row.sold_quantity;
    sales.ordered += row.ordered_quantity;
    if (sales.sold > MAX_WHOLE_QUANTITY || sales.ordered > MAX_WHOLE_QUANTITY) {
      return { error: `Combined quantities for ${row.product_id} in ${month} exceed ${MAX_WHOLE_QUANTITY}.` };
    }
    group.months.set(month, sales);
    if (!group.latest || date >= group.latest.date) group.latest = { ...row, date };
    if (row.current_stock !== undefined && (!group.stock || date >= group.stock.date)) {
      group.stock = { date, quantity: row.current_stock };
    }
    groups.set(row.product_id, group);
  }
  return { groups };
}

export function saveImport(db, { storeId, fileName, csv, rowCount, groups, authorize }) {
  const digest = createHash("sha256").update(csv).digest("hex");
  return transaction(db, () => {
    const { id: userId } = authorize();
    const prior = db.prepare("SELECT data FROM imports WHERE store_id = ? AND digest = ?").get(storeId, digest);
    if (prior) return JSON.parse(prior.data);

    const importedAt = new Date().toISOString();
    const batch = { id: randomUUID(), fileName, importedAt, rowCount, productIds: [], newProductIds: [] };
    const lookup = db.prepare("SELECT * FROM products WHERE store_id = ? AND id = ?");
    const putProduct = db.prepare(`
      INSERT INTO products (
        store_id, id, name, category, current_stock, stock_date, supplier_lead_time,
        unit_cost, updated_at, details_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (store_id, id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        current_stock = excluded.current_stock,
        stock_date = excluded.stock_date,
        supplier_lead_time = excluded.supplier_lead_time,
        unit_cost = excluded.unit_cost,
        updated_at = excluded.updated_at,
        details_date = excluded.details_date
    `);
    // Imports supply complete totals for any SKU/month they contain. Other months stay intact.
    const putMonth = db.prepare(`
      INSERT INTO monthly_sales (store_id, product_id, month, sold, ordered)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (store_id, product_id, month) DO UPDATE
      SET sold = excluded.sold, ordered = excluded.ordered
    `);

    for (const [id, { latest, months, stock }] of groups) {
      const old = lookup.get(storeId, id);
      const useNewDetails = !old || latest.date >= old.details_date;
      const useNewStock = stock && (!old?.stock_date || stock.date >= old.stock_date);
      batch.productIds.push(id);
      if (!old) batch.newProductIds.push(id);
      putProduct.run(
        storeId,
        id,
        useNewDetails ? latest.product_name : old.name,
        (useNewDetails ? categoryFor(latest.category) : null) ?? old?.category ?? "Uncategorized",
        (useNewStock ? stock.quantity : old?.current_stock) ?? null,
        (useNewStock ? stock.date : old?.stock_date) ?? null,
        (useNewDetails ? latest.supplier_lead_time : undefined) ?? old?.supplier_lead_time ?? null,
        (useNewDetails ? latest.unit_cost : undefined) ?? old?.unit_cost ?? null,
        importedAt,
        useNewDetails ? latest.date : old.details_date,
      );
      for (const [month, totals] of months) putMonth.run(storeId, id, month, totals.sold, totals.ordered);
    }
    db.prepare("INSERT INTO imports (store_id, id, user_id, digest, data) VALUES (?, ?, ?, ?, ?)")
      .run(storeId, batch.id, userId, digest, JSON.stringify(batch));
    appendAudit(db, { action: "inventory.import", actor: `user:${userId}`, userId, storeId, importId: batch.id });
    return batch;
  });
}
