/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "path";
import { defineConfig, type Plugin } from "vite";

const landingDir = resolve(__dirname, "../landing");
const LANDING_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

// In dev the SPA fallback would swallow /landing/ and bounce through the router;
// in build we bundle ../landing into dist/landing for production static hosts (Cloudflare Pages, Caddy).
function landingPlugin(): Plugin {
  return {
    name: "emtiaz-landing",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== "/landing" && !url.startsWith("/landing/")) return next();
        if (url === "/landing") {
          res.writeHead(308, { Location: "/landing/" });
          res.end();
          return;
        }
        let rel = decodeURIComponent(url.slice("/landing".length));
        if (rel.endsWith("/")) rel += "index.html";
        const file = normalize(join(landingDir, rel));
        if (relative(landingDir, file).startsWith("..") || !existsSync(file) || statSync(file).isDirectory()) {
          return next();
        }
        res.setHeader("Content-Type", LANDING_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
        res.end(readFileSync(file));
      });
    },
    closeBundle() {
      const outDir = resolve(__dirname, "dist/landing");
      if (existsSync(landingDir)) {
        cpSync(landingDir, outDir, { recursive: true });
      }
      const distIndex = resolve(__dirname, "dist/index.html");
      const dist200 = resolve(__dirname, "dist/200.html");
      const dist404 = resolve(__dirname, "dist/404.html");
      if (existsSync(distIndex)) {
        cpSync(distIndex, dist200);
        cpSync(distIndex, dist404);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), landingPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          const origin = process.env.API_PROXY_ORIGIN;
          if (!origin) return;
          proxy.on("proxyReq", (proxyReq) => proxyReq.setHeader("origin", origin));
        },
      },
    },
    fs: {
      // Allow serving files from one level up (or your custom path)
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "../shared"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
