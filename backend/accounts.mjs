import { randomUUID } from "node:crypto";
import { appendAudit, transaction } from "./database.mjs";
import { hashPassword, matchesPassword, normalizeEmail, validEmail, validatePassword } from "./auth.mjs";

export function findAccount(db, rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email)) throw new Error("Enter a valid email address.");
  return { email, user: db.prepare("SELECT * FROM users WHERE email = ?").get(email) };
}

function accountId(db, email) {
  const { user } = findAccount(db, email);
  if (!user) throw new Error("The account was not found.");
  return user.id;
}

function preventLastManagerChange(db, userId, storeId) {
  const lastManagedStore = db.prepare(`
    SELECT target.store_id FROM memberships AS target
    WHERE target.user_id = ? AND target.role = 'manager'
      AND (? IS NULL OR target.store_id = ?)
      AND NOT EXISTS (
        SELECT 1 FROM memberships AS replacement
        JOIN users ON users.id = replacement.user_id AND users.disabled_at IS NULL
        WHERE replacement.store_id = target.store_id AND replacement.role = 'manager'
          AND replacement.user_id <> target.user_id
      )
    ORDER BY target.store_id LIMIT 1
  `).get(userId, storeId, storeId);
  if (lastManagedStore) throw new Error(`Grant manager access to another active account at ${lastManagedStore.store_id} first.`);
}

export async function grantMembership(db, { email, password, storeId, storeName, role = "manager", actor, verifyExisting = false }) {
  if (typeof storeId !== "string" || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(storeId)
      || typeof storeName !== "string" || !storeName.trim() || storeName.length > 120 || /[\u0000-\u001f\u007f]/.test(storeName)) {
    throw new Error("Use a lowercase store slug and a store name of up to 120 characters.");
  }
  if (!["manager", "viewer"].includes(role)) throw new Error("Choose manager or viewer.");

  const { email: normalized, user } = findAccount(db, email);
  if (!user || verifyExisting) validatePassword(password);
  const hash = user ? null : await hashPassword(password);
  if (user && verifyExisting && !(await matchesPassword(password, user.password_hash))) {
    throw new Error("The existing account password did not match.");
  }

  return transaction(db, () => {
    const current = findAccount(db, normalized).user;
    if (current?.id !== user?.id || (verifyExisting && current?.credential_version !== user?.credential_version)) {
      throw new Error("The account changed. Check it and retry.");
    }
    if (current?.disabled_at) throw new Error("Enable the account before granting it access.");
    const userId = current?.id ?? randomUUID();
    if (!current) {
      db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(userId, normalized, hash);
      appendAudit(db, { action: "account.create", actor, userId });
    }
    const created = db.prepare("INSERT INTO stores VALUES (?, ?) ON CONFLICT (id) DO NOTHING").run(storeId, storeName.trim());
    if (created.changes) appendAudit(db, { action: "store.create", actor, storeId });
    const previous = db.prepare("SELECT role FROM memberships WHERE user_id = ? AND store_id = ?").get(userId, storeId)?.role;
    if (previous === role) return { userId, storeId, role };
    if (previous === "manager") preventLastManagerChange(db, userId, storeId);
    if (!previous && role === "viewer") {
      const manager = db.prepare(`
        SELECT 1 FROM memberships JOIN users ON users.id = memberships.user_id
        WHERE store_id = ? AND role = 'manager' AND users.disabled_at IS NULL
      `).get(storeId);
      if (!manager) throw new Error("Grant a manager account before granting viewers access to this store.");
    }
    db.prepare(`
      INSERT INTO memberships VALUES (?, ?, ?)
      ON CONFLICT (user_id, store_id) DO UPDATE SET role = excluded.role
    `).run(userId, storeId, role);
    appendAudit(db, { action: "membership.grant", actor, userId, storeId, fromRole: previous, toRole: role });
    return { userId, storeId, role };
  });
}

export function revokeMembership(db, { email, storeId, actor }) {
  return transaction(db, () => {
    const userId = accountId(db, email);
    const previous = db.prepare("SELECT role FROM memberships WHERE user_id = ? AND store_id = ?").get(userId, storeId)?.role;
    if (!previous) return false;
    if (previous === "manager") preventLastManagerChange(db, userId, storeId);
    db.prepare("DELETE FROM memberships WHERE user_id = ? AND store_id = ?").run(userId, storeId);
    appendAudit(db, { action: "membership.revoke", actor, userId, storeId, fromRole: previous });
    return true;
  });
}

export async function resetPassword(db, { email, password, actor }) {
  validatePassword(password);
  const hash = await hashPassword(password);
  transaction(db, () => {
    const userId = accountId(db, email);
    db.prepare("UPDATE users SET password_hash = ?, credential_version = credential_version + 1 WHERE id = ?").run(hash, userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    appendAudit(db, { action: "account.password_reset", actor, userId });
  });
}

export function setAccountEnabled(db, { email, enabled, actor }) {
  return transaction(db, () => {
    const { user } = findAccount(db, email);
    if (!user) throw new Error("The account was not found.");
    if (enabled === !user.disabled_at) return false;
    if (!enabled) preventLastManagerChange(db, user.id, null);
    db.prepare("UPDATE users SET disabled_at = ?, credential_version = credential_version + 1 WHERE id = ?")
      .run(enabled ? null : new Date().toISOString(), user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    appendAudit(db, { action: enabled ? "account.enable" : "account.disable", actor, userId: user.id });
    return true;
  });
}

export function listMemberships(db) {
  return db.prepare(`
    SELECT users.email, users.disabled_at AS disabledAt, stores.id AS storeId, stores.name AS storeName, memberships.role
    FROM users LEFT JOIN memberships ON memberships.user_id = users.id
    LEFT JOIN stores ON stores.id = memberships.store_id ORDER BY users.email, stores.id
  `).all();
}
