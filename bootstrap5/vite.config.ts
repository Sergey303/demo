import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { isDemoSecretValid, issueDemoToken } from "./enterpriseDemoAuth.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "enterprise-demo-auth-prerequisite",
      configureServer(server) {
        // Runs before Vite's proxy middleware. Never forward caller-provided
        // Authorization, and do not turn a missing secret into an open proxy.
        for (const prefix of ["/enterprise-api", "/enterprise-search"]) {
          server.middlewares.use(prefix, (req, res, next) => {
            delete req.headers.authorization;
            if (!isDemoSecretValid(process.env.DEMO_AUTH_SECRET)) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.setHeader("Cache-Control", "no-store");
              res.end(JSON.stringify({ error: "Local enterprise demo auth is not configured." }));
              return;
            }
            next();
          });
        }
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/demo-api": {
        target: "http://127.0.0.1:5077",
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/demo-api/, ""),
      },
      "/enterprise-api": {
        target: "http://127.0.0.1:5077",
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/enterprise-api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Fixed principal, short expiry and server-only secret.
            proxyReq.setHeader("Authorization", "Bearer " + issueDemoToken(process.env.DEMO_AUTH_SECRET));
          });
        },
      },
      "/enterprise-search": {
        target: "http://127.0.0.1:5088",
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/enterprise-search/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // The browser never gets a bearer or chooses a tenant.
            proxyReq.setHeader("Authorization", "Bearer " + issueDemoToken(process.env.DEMO_AUTH_SECRET));
          });
        },
      },
    },
  },
});
