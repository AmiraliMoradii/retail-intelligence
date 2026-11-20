import { preview } from "vite";
import { grantMembership } from "../backend/accounts.mjs";
import { openDatabase } from "../backend/database.mjs";
import { createInventoryServer } from "../backend/server.mjs";
import { demoBase, demoPort, password, storePort, stores } from "./fixtures.mjs";

const host = "127.0.0.1";

if (process.argv[2] === "demo") {
  await preview({
    configFile: false,
    base: demoBase,
    build: { outDir: "dist/demo" },
    preview: { host, port: demoPort, strictPort: true },
  });
} else {
  const db = openDatabase(":memory:");
  for (const store of Object.values(stores)) {
    await grantMembership(db, { ...store, password, role: "manager", actor: "operator:browser-test" });
  }
  const server = createInventoryServer({ db, staticRoot: "dist/store" });
  server.listen(storePort, host);
}
