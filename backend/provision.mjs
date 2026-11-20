import { openDatabase } from "./database.mjs";
import { provisionMembership } from "./auth.mjs";

process.umask(0o077);
const [email, storeId, storeName, role] = process.argv.slice(2);

if (!email || !storeId || !storeName || process.stdin.isTTY) {
  console.error("Usage: pipe a password to node backend/provision.mjs <email> <store-slug> <store-name> [manager|viewer]");
  process.exitCode = 1;
} else {
  const db = openDatabase();
  try {
    process.stdin.setEncoding("utf8");
    let password = "";
    for await (const chunk of process.stdin) {
      password += chunk;
      if (password.length > 130) throw new Error("Use a password between 12 and 128 characters.");
    }
    const membership = await provisionMembership(db, { email, password: password.replace(/\r?\n$/, ""), storeId, storeName, role });
    console.log(`Configured ${membership.role} access for ${email} at ${membership.storeId}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
