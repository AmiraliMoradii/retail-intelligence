import { chmod, link, lstat, mkdtemp, rm, stat } from "node:fs/promises";
import { userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { appendAudit, DATABASE_VERSION, openDatabase, transaction } from "./database.mjs";

function verifyDatabase(db) {
  const { user_version: version } = db.prepare("PRAGMA user_version").get();
  if (version > DATABASE_VERSION) throw new Error(`The database requires schema version ${version}.`);
  const tables = db.prepare(`
    SELECT count(*) AS found FROM sqlite_schema WHERE type = 'table' AND
      name IN ('users', 'stores', 'memberships', 'sessions', 'products', 'monthly_sales', 'imports')
  `).get();
  if (tables.found !== 7) throw new Error("The file does not contain a Retail Intelligence database.");
  const integrity = db.prepare("PRAGMA integrity_check").all();
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok"
      || db.prepare("PRAGMA foreign_key_check").get()) {
    throw new Error("The database did not pass integrity and foreign key checks.");
  }
}

async function ensureAvailable(destination) {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      await lstat(destination + suffix);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error("Choose a new destination without an existing database or SQLite sidecar files.");
  }
}

async function copyDatabase(source, destination, prepareCopy) {
  source = resolve(source);
  destination = resolve(destination);
  await ensureAvailable(destination);
  if (!(await stat(source)).isFile()) throw new Error("The source must be a database file.");
  const work = await mkdtemp(join(dirname(destination), ".ri-snapshot-"));
  const snapshot = join(work, "inventory.sqlite");
  try {
    const original = new DatabaseSync(source, { readOnly: true });
    try {
      original.exec("PRAGMA busy_timeout = 5000");
      await backup(original, snapshot);
    } finally {
      original.close();
    }

    const copied = new DatabaseSync(snapshot);
    try {
      verifyDatabase(copied);
      // Publish one self-contained file so recovery never depends on copying SQLite sidecars.
      copied.exec("PRAGMA journal_mode = DELETE;");
    } finally {
      copied.close();
    }

    if (prepareCopy) {
      const isolated = openDatabase(snapshot);
      try {
        isolated.exec("PRAGMA journal_mode = DELETE; PRAGMA secure_delete = ON;");
        prepareCopy(isolated);
        verifyDatabase(isolated);
      } finally {
        isolated.close();
      }
    }
    await ensureAvailable(destination);
    await chmod(snapshot, 0o600);
    await link(snapshot, destination);
  } finally {
    await rm(work, { force: true, recursive: true });
  }
  return destination;
}

export function backupDatabase(source, destination) {
  return copyDatabase(source, destination);
}

export function restoreDatabase(source, destination, actor = `operator:${userInfo().username}`) {
  return copyDatabase(source, destination, (db) => {
    transaction(db, () => {
      db.exec("DELETE FROM sessions");
      appendAudit(db, { action: "database.restore", actor });
    });
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.umask(0o077);
  try {
    const [mode, ...paths] = process.argv.slice(2);
    if (mode === "backup" && paths.length === 1) {
      const destination = await backupDatabase(process.env.RI_DB_PATH ?? ".ri-data/inventory.sqlite", paths[0]);
      console.log(`Verified backup written to ${destination}`);
    } else if (mode === "restore" && paths.length === 2) {
      const destination = await restoreDatabase(...paths);
      console.log(`Verified isolated restore written to ${destination}. Sessions were cleared.`);
    } else {
      throw new Error("Usage: node backend/backup.mjs backup <new-backup-file>\n       node backend/backup.mjs restore <backup-file> <new-restore-file>");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
