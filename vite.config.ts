import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "project-license",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "LICENSE.txt",
          source: readFileSync(new URL("./LICENSE", import.meta.url)),
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
  preview: {
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    license: { fileName: "THIRD-PARTY-LICENSES.txt" },
  },
});
