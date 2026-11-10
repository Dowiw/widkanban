/// <reference types="vitest" />
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const oauthPreviewPlugin: Plugin = {
  name: "oauth-preview-routes",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || "";
      if (url.startsWith("/oauth/verified") || url.startsWith("/oauth/success")) {
        req.url = "/oauth-verified.html";
      } else if (url.startsWith("/oauth/failed") || url.startsWith("/oauth/error")) {
        const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
        req.url = `/oauth-failed.html${query}`;
      }
      next();
    });
  },
};

export default defineConfig(async () => ({
  plugins: [react(), oauthPreviewPlugin],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));
