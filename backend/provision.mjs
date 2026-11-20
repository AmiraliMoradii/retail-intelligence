import { grantMembership } from "./accounts.mjs";
import { normalizeEmail } from "./auth.mjs";
import { openDatabase } from "./database.mjs";
import { operatorActor, readOperatorPassword } from "./operator.mjs";

process.umask(0o077);
const [email, storeId, storeName, role] = process.argv.slice(2);

if (!email || !storeId || !storeName || process.stdin.isTTY) {
  console.error("Usage: pipe a password to node backend/provision.mjs <email> <store-slug> <store-name> [manager|viewer]");
  process.exitCode = 1;
} else {
  const db = openDatabase();
  try {
    const password = await readOperatorPassword();
    const membership = await grantMembership(db, {
      email, password, storeId, storeName, role, actor: operatorActor(), verifyExisting: true,
    });
    console.log(`Configured ${membership.role} access for ${normalizeEmail(email)} at ${membership.storeId}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
