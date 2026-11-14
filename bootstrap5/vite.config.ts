import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { demoAuthProfile } from "./enterpriseDemoAuth.mjs";

export default defineConfig(() => {
  // Invalid configuration leaves both enterprise proxies closed.
  let profile: ReturnType<typeof demoAuthProfile> | undefined;
  try { profile = demoAuthProfile(process.env); } catch { /* middleware returns 503 */ }
  return {
    plugins: [
      react(),
      {
        name: "enterprise-demo-auth-prerequisite",
        configureServer(server) {
          // Runs before Vite's proxy middleware. Never forward caller-provided
          // Authorization, and do not turn a missing secret into an open proxy.
          server.middlewares.use((req, res, next) => {
            // Match Vite's proxy prefix semantics, including suffix paths.
            if (!["/enterprise-api", "/enterprise-search"].some(
              prefix => req.url?.startsWith(prefix))) return next();
            delete req.headers.authorization;
            if (!profile) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.setHeader("Cache-Control", "no-store");
              res.end(JSON.stringify({ error: "Local enterprise demo auth is not configured." }));
              return;
            }
            next();
          });
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
              // Startup principal, short expiry and server-only secret.
              proxyReq.setHeader("Authorization", "Bearer " + profile!.token());
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
              proxyReq.setHeader("Authorization", "Bearer " + profile!.token());
            });
          },
        },
      },
    },
  };
});
