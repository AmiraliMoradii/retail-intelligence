import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { transaction } from "./database.mjs";

const deriveKey = promisify(scrypt);
const scryptOptions = { N: 2 ** 16, r: 8, p: 2, maxmem: 80 * 1024 * 1024 };
const cookieName = "ri_session";
const sessionSeconds = 8 * 60 * 60;
// A dummy hash keeps unknown-account and wrong-password attempts on the same verification path.
const dummyHash = `${"0".repeat(32)}:${"0".repeat(64)}`;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 32, scryptOptions);
  return `${salt}:${key.toString("hex")}`;
}

async function matchesPassword(password, encoded) {
  const [salt, expected] = encoded.split(":");
  const actual = await deriveKey(password, salt, 32, scryptOptions);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export async function provisionMembership(db, { email, password, storeId, storeName, role = "manager" }) {
  email = normalizeEmail(email);
  if (!validEmail(email)) throw new Error("Enter a valid email address.");
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Use a password between 12 and 128 characters.");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(storeId) || !storeName?.trim() || storeName.length > 120) {
    throw new Error("Use a lowercase store slug and a store name of up to 120 characters.");
  }
  if (!["manager", "viewer"].includes(role)) throw new Error("Choose manager or viewer.");

  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing && !(await matchesPassword(password, existing.password_hash))) {
    throw new Error("The existing account password did not match.");
  }
  const userId = existing?.id ?? randomUUID();
  const hash = existing ? null : await hashPassword(password);
  transaction(db, () => {
    if (!existing) db.prepare("INSERT INTO users VALUES (?, ?, ?)").run(userId, email, hash);
    db.prepare("INSERT INTO stores VALUES (?, ?) ON CONFLICT (id) DO NOTHING").run(storeId, storeName.trim());
    db.prepare(`
      INSERT INTO memberships VALUES (?, ?, ?)
      ON CONFLICT (user_id, store_id) DO UPDATE SET role = excluded.role
    `).run(userId, storeId, role);
  });
  return { userId, storeId, role };
}

export async function checkCredentials(db, email, password) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const matched = await matchesPassword(password, user?.password_hash ?? dummyHash);
  return user && matched ? { id: user.id, email: user.email } : null;
}

function digestToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenFrom(request) {
  const cookie = request.headers.cookie?.split(";").map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  return token && /^[a-f\d]{64}$/.test(token) ? token : null;
}

function cookie(token, maxAge, secure) {
  return `${cookieName}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function deleteSession(db, request) {
  const token = tokenFrom(request);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digestToken(token));
}

export function createSession(db, request, userId, secure) {
  const now = Date.now();
  const token = randomBytes(32).toString("hex");
  transaction(db, () => {
    deleteSession(db, request);
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(digestToken(token), userId, now + sessionSeconds * 1000);
  });
  return cookie(token, sessionSeconds, secure);
}

export function clearSessionCookie(secure) {
  return cookie("", 0, secure);
}

export function readSession(db, request) {
  const token = tokenFrom(request);
  if (!token) return null;
  return db.prepare(`
    SELECT users.id, users.email FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(digestToken(token), Date.now()) ?? null;
}

export function sessionBody(db, user) {
  const stores = db.prepare(`
    SELECT stores.id, stores.name, memberships.role FROM memberships
    JOIN stores ON stores.id = memberships.store_id
    WHERE memberships.user_id = ? ORDER BY stores.name, stores.id
  `).all(user.id);
  return { user, stores };
}
