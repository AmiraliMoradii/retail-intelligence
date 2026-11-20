import { userInfo } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findAccount, grantMembership, listMemberships, resetPassword, revokeMembership, setAccountEnabled } from "./accounts.mjs";
import { openDatabase } from "./database.mjs";

const commands = {
  grant: ["<email>", "<store-slug>", "<store-name>", "<manager|viewer>"],
  revoke: ["<email>", "<store-slug>"],
  "reset-password": ["<email>"],
  "disable-user": ["<email>"],
  "enable-user": ["<email>"],
  "list-memberships": [],
  "list-audit": [],
};

export const operatorActor = () => `operator:${userInfo().username}`;

export async function readOperatorPassword(input = process.stdin) {
  if (input.isTTY) throw new Error("Read the password without echo and pipe it to this command.");
  input.setEncoding("utf8");
  let password = "";
  for await (const chunk of input) {
    password += chunk;
    if (password.length > 130) throw new Error("Use a password between 12 and 128 characters.");
  }
  return password.replace(/\r?\n$/, "");
}

async function operate(db, command, [email, storeId, storeName, role]) {
  const actor = operatorActor();
  switch (command) {
    case "grant": {
      const { email: normalized, user: existing } = findAccount(db, email);
      const password = existing ? undefined : await readOperatorPassword();
      const access = await grantMembership(db, { email, password, storeId, storeName, role, actor });
      console.log(`Granted ${access.role} access to ${normalized} at ${access.storeId}.`);
      break;
    }
    case "revoke": {
      const revoked = revokeMembership(db, { email, storeId, actor });
      console.log(revoked ? `Revoked access to ${storeId}.` : `The account has no access to ${storeId}.`);
      break;
    }
    case "reset-password":
      await resetPassword(db, { email, password: await readOperatorPassword(), actor });
      console.log("Password reset. All existing sessions were revoked.");
      break;
    case "disable-user":
    case "enable-user": {
      const enabled = command === "enable-user";
      setAccountEnabled(db, { email, enabled, actor });
      console.log(enabled ? "Account enabled." : "Account disabled.");
      break;
    }
    case "list-memberships":
      console.log(JSON.stringify(listMemberships(db), null, 2));
      break;
    case "list-audit":
      console.log(JSON.stringify(db.prepare("SELECT * FROM audit_events ORDER BY id DESC LIMIT 100").all(), null, 2));
      break;
  }
}

export async function runOperator([command, ...args]) {
  const expected = Object.hasOwn(commands, command) && commands[command].length;
  if (expected === false || args.length !== expected || args.some((arg) => !arg.trim())) {
    const usage = Object.entries(commands).map(([name, example]) => `  ${[name, ...example].join(" ")}`).join("\n");
    throw new Error(`Usage: node backend/operator.mjs <command>\n${usage}`);
  }
  const db = openDatabase();
  try {
    await operate(db, command, args);
  } finally {
    db.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.umask(0o077);
  try {
    await runOperator(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
