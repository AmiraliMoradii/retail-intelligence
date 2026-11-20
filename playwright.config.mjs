import { defineConfig } from "@playwright/test";
import { demoBase, demoPort, storePort } from "./e2e/fixtures.mjs";

const demoURL = new URL(demoBase, `http://127.0.0.1:${demoPort}`).href;
const storeURL = `http://127.0.0.1:${storePort}/`;
const desktop = { viewport: { width: 1440, height: 900 } };
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  use: {
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "demo-desktop", testMatch: "demo.spec.ts", use: { ...desktop, baseURL: demoURL } },
    { name: "demo-mobile", testMatch: "demo.spec.ts", use: { ...mobile, baseURL: demoURL } },
    { name: "store-desktop", testMatch: "store.spec.ts", use: { ...desktop, baseURL: storeURL } },
    { name: "store-mobile", testMatch: "store.spec.ts", use: { ...mobile, baseURL: storeURL } },
  ],
  webServer: [
    { command: "node e2e/serve.mjs demo", url: demoURL, name: "Public demo" },
    { command: "node e2e/serve.mjs store", url: storeURL, name: "Store inventory" },
  ],
});
