import { createReadStream, readFileSync, realpathSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  checkCredentials, clearSessionCookie, createSession, deleteSession,
  normalizeEmail, readSession, sessionBody, validEmail,
} from "./auth.mjs";
import { groupInventoryRows, MAX_WHOLE_QUANTITY, openDatabase, readInventory, saveImport } from "./database.mjs";
import { MAX_CSV_BYTES, parseInventoryCsvText } from "../src/services/csvService.ts";

const jsonType = "application/json; charset=utf-8";
const textType = "text/plain; charset=utf-8";
const staticTypes = {
  ".css": "text/css; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon", ".js": "text/javascript; charset=utf-8", ".json": jsonType,
  ".mp4": "video/mp4", ".png": "image/png", ".svg": "image/svg+xml", ".txt": textType,
  ".woff": "font/woff", ".woff2": "font/woff2", ".webp": "image/webp",
};

class RequestError extends Error {
  constructor(status, message, issues) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

function reply(response, status, data, headers = {}) {
  response.writeHead(status, { "Content-Type": jsonType, "Cache-Control": "no-store", ...headers });
  response.end(data === undefined ? undefined : JSON.stringify(data));
}

function readJson(request, limit) {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError(415, "Send an application/json request.");
  }
  if (Number(request.headers["content-length"]) > limit) {
    request.resume();
    throw new RequestError(413, "The request is too large.");
  }
  return new Promise((resolveJson, reject) => {
    const chunks = [];
    let size = 0;
    request.on("error", reject);
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
      else if (chunks.length) {
        chunks.length = 0;
        reject(new RequestError(413, "The request is too large."));
      }
    });
    request.on("end", () => {
      if (size > limit) return reject(new RequestError(413, "The request is too large."));
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected an object");
        resolveJson(body);
      } catch {
        reject(new RequestError(400, "The request must contain a valid JSON object."));
      }
    });
  });
}

function loginFailures(limit) {
  const entries = new Map();
  const windowMs = 10 * 60 * 1000;
  return {
    check(key) {
      const entry = entries.get(key);
      if (entry?.until <= Date.now()) entries.delete(key);
      else if (entry?.count >= limit) {
        throw new RequestError(429, "Too many sign-in attempts. Try again in a few minutes.");
      }
    },
    fail(key) {
      const entry = entries.get(key);
      if (entry) {
        entry.count++;
        return;
      }
      if (entries.size >= 1000) entries.delete(entries.keys().next().value);
      entries.set(key, { count: 1, until: Date.now() + windowMs });
    },
    clear(key) {
      entries.delete(key);
    },
  };
}

function isWholeQuantity(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_WHOLE_QUANTITY;
}

function invalidBusinessRow(row) {
  return row.product_id.length > 120 || row.product_name.length > 240 || (row.category?.length ?? 0) > 120
    || !isWholeQuantity(row.ordered_quantity) || !isWholeQuantity(row.sold_quantity)
    || (row.current_stock !== undefined && !isWholeQuantity(row.current_stock))
    || (row.supplier_lead_time !== undefined && !isWholeQuantity(row.supplier_lead_time))
    || (row.unit_cost !== undefined && !(Number.isFinite(row.unit_cost) && row.unit_cost >= 0 && row.unit_cost <= MAX_WHOLE_QUANTITY));
}

async function importInventory(request, db, storeId, authorize) {
  const { fileName, csv } = await readJson(request, MAX_CSV_BYTES * 6 + 16384);
  if (typeof fileName !== "string" || fileName.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(fileName) || typeof csv !== "string") {
    throw new RequestError(400, "Provide a CSV filename and the file contents.");
  }
  const size = Buffer.byteLength(csv);
  const parsed = parseInventoryCsvText(fileName, size, csv);
  if (!parsed.ok) {
    const status = parsed.issues.some((issue) => issue.code === "too_large") ? 413 : 422;
    throw new RequestError(status, parsed.issues[0]?.message ?? "The CSV is invalid.", parsed.issues.slice(0, 50));
  }
  if (parsed.records.length > 25_000) throw new RequestError(413, "Split this file into imports of up to 25,000 rows.");
  const invalidIndex = parsed.records.findIndex(invalidBusinessRow);
  if (invalidIndex >= 0) {
    throw new RequestError(422, `Check the field lengths and quantities in row ${invalidIndex + 1}.`);
  }
  const { groups, error } = groupInventoryRows(parsed.records);
  if (error) throw new RequestError(422, error);
  return saveImport(db, { storeId, authorize, fileName, csv, rowCount: parsed.records.length, groups });
}

async function reorder(request, db, storeId, authorize) {
  const { productId, forecastDemand, safetyStock, incomingStock } = await readJson(request, 4096);
  if (typeof productId !== "string" || ![forecastDemand, safetyStock, incomingStock].every(isWholeQuantity)) {
    throw new RequestError(422, `Provide a product and whole quantities from 0 to ${MAX_WHOLE_QUANTITY}.`);
  }
  authorize();
  const item = db.prepare("SELECT current_stock, stock_date FROM products WHERE store_id = ? AND id = ?").get(storeId, productId);
  if (!item) throw new RequestError(404, "The product was not found.");
  if (item.current_stock === null) throw new RequestError(422, "Import an on-hand stock count for this product first.");
  return {
    productId, forecastDemand, safetyStock, incomingStock,
    currentStock: item.current_stock,
    stockDate: item.stock_date,
    formulaVersion: 1,
    recommendedOrder: Math.max(0, forecastDemand + safetyStock - item.current_stock - incomingStock),
  };
}

async function serveStatic(request, response, root, pathname) {
  if (!root || !["GET", "HEAD"].includes(request.method)) return reply(response, 404, { error: "Page not found." });
  const decoded = decodeURIComponent(pathname);
  if (decoded.split("/").some((part) => part.startsWith(".")) || decoded.includes("\\") || decoded.includes("\0")) {
    return reply(response, 404, { error: "Page not found." });
  }
  if (extname(decoded) && !/^\/(?:index\.html|favicon\.svg|[A-Z-]+\.txt|(?:assets|samples)\/[^/]+)$/.test(decoded)) {
    return reply(response, 404, { error: "Page not found." });
  }
  const filename = extname(decoded) ? resolve(root, `.${decoded}`) : resolve(root, "index.html");
  if (!filename.startsWith(`${root}${sep}`)) return reply(response, 404, { error: "Page not found." });
  const type = staticTypes[extname(filename)];
  if (!type) return reply(response, 404, { error: "Page not found." });
  const file = await realpath(filename).then((resolved) => resolved === filename ? stat(resolved) : null).catch((error) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  });
  if (!file?.isFile()) return reply(response, 404, { error: "Page not found." });
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": file.size,
    "Cache-Control": "no-cache",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(filename).on("error", (error) => response.destroy(error)).pipe(response);
}

export function createInventoryServer({ db, secureCookie = false, staticRoot, tls } = {}) {
  const ownsDatabase = !db;
  const root = staticRoot ? realpathSync(staticRoot) : null;
  db ??= openDatabase();
  const failures = loginFailures(12);
  const peerFailures = tls ? loginFailures(40) : null;
  let activeSignIns = 0;
  let activeImports = 0;
  secureCookie ||= Boolean(tls);

  const handleRequest = async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "same-origin");
    try {
      const { pathname } = new URL(request.url, "http://localhost");
      const { method } = request;
      if (pathname === "/healthz" && method === "GET") {
        db.prepare("SELECT 1").get();
        return reply(response, 200, { status: "ok" });
      }
      if (!pathname.startsWith("/api/")) return await serveStatic(request, response, root, pathname);
      if (request.headers["sec-fetch-site"] === "cross-site") throw new RequestError(403, "Cross-site API requests are disabled.");

      if (pathname === "/api/session" && method === "POST") {
        const { email: rawEmail, password } = await readJson(request, 4096);
        const email = normalizeEmail(rawEmail);
        if (!validEmail(email) || typeof password !== "string" || password.length > 128) {
          throw new RequestError(401, "Invalid email or password.");
        }
        const peer = request.socket.remoteAddress;
        failures.check(email);
        peerFailures?.check(peer);
        if (activeSignIns >= 2) throw new RequestError(429, "Sign-in is busy. Try again shortly.");
        activeSignIns++;
        try {
          const credentials = await checkCredentials(db, email, password);
          const sessionCookie = credentials && createSession(db, request, credentials, secureCookie);
          if (!sessionCookie) {
            failures.fail(email);
            peerFailures?.fail(peer);
            throw new RequestError(401, "Invalid email or password.");
          }
          failures.clear(email);
          return reply(response, 200, sessionBody(db, credentials.user), { "Set-Cookie": sessionCookie });
        } finally {
          activeSignIns--;
        }
      }

      if (pathname === "/api/session" && method === "DELETE") {
        deleteSession(db, request);
        return reply(response, 204, undefined, { "Set-Cookie": clearSessionCookie(secureCookie) });
      }

      const user = readSession(db, request);
      if (!user) throw new RequestError(401, "Sign in to continue.");
      if (pathname === "/api/session" && method === "GET") return reply(response, 200, sessionBody(db, user));

      const match = pathname.match(/^\/api\/stores\/([a-z0-9][a-z0-9-]{0,62})\/(inventory|imports|reorder)$/);
      if (!match) throw new RequestError(404, "The requested resource was not found.");
      const [, storeId, resource] = match;
      const authorize = (managerRequired = false) => {
        const activeUser = readSession(db, request);
        if (!activeUser || activeUser.id !== user.id) throw new RequestError(401, "Sign in to continue.");
        const access = db.prepare("SELECT role FROM memberships WHERE user_id = ? AND store_id = ?").get(activeUser.id, storeId);
        if (!access) throw new RequestError(404, "The store was not found.");
        if (managerRequired && access.role !== "manager") {
          throw new RequestError(403, "Only store managers can import inventory.");
        }
        return activeUser;
      };

      if (resource === "inventory" && method === "GET") {
        authorize();
        return reply(response, 200, readInventory(db, storeId));
      }
      if (resource === "imports" && method === "POST") {
        authorize(true);
        if (activeImports >= 2) throw new RequestError(429, "Inventory imports are busy. Try again shortly.");
        activeImports++;
        try {
          return reply(response, 200, await importInventory(request, db, storeId, () => authorize(true)));
        } finally {
          activeImports--;
        }
      }
      if (resource === "reorder" && method === "POST") {
        authorize();
        return reply(response, 200, await reorder(request, db, storeId, authorize));
      }
      throw new RequestError(405, "The requested method is not supported.");
    } catch (error) {
      if (error instanceof RequestError) return reply(response, error.status, { error: error.message, issues: error.issues });
      if (error instanceof URIError) return reply(response, 400, { error: "The request path is invalid." });
      console.error(error);
      if (!response.headersSent) return reply(response, 500, { error: "The server could not complete the request." });
      response.destroy();
    }
  };
  const timeouts = { requestTimeout: 30_000, headersTimeout: 15_000 };
  const server = tls
    ? createHttpsServer({ ...tls, ...timeouts, minVersion: "TLSv1.2" }, handleRequest)
    : createServer(timeouts, handleRequest);
  server.setTimeout(15_000);
  if (ownsDatabase) server.on("close", () => db.close());
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.umask(0o077);
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.RI_HOST ?? "127.0.0.1";
  const { RI_TLS_CERT: certPath, RI_TLS_KEY: keyPath } = process.env;
  if (Boolean(certPath) !== Boolean(keyPath)) throw new Error("Set both RI_TLS_CERT and RI_TLS_KEY for direct HTTPS.");
  const tls = certPath ? { cert: readFileSync(certPath), key: readFileSync(keyPath) } : undefined;
  const server = createInventoryServer({
    tls,
    secureCookie: process.env.RI_SECURE_COOKIE === "1",
    staticRoot: process.env.RI_STATIC_ROOT ?? "dist",
  });
  server.listen(port, host, () => console.log(`Retail Intelligence listening on ${tls ? "https" : "http"}://${host}:${server.address().port}`));
}
