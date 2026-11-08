import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/demo-api": {
        target: "http://127.0.0.1:5077",
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/demo-api/, ""),
      },
    },
  },
});
