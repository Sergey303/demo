import { defineConfig } from "@playwright/test";

const fullBrowserMatrix = process.env.FULL_BROWSER_MATRIX === "true";
const liveOidc = process.env.EP12C_LIVE_TEST === "true";
const browserNames = ["chromium", "firefox", "webkit"] as const;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: liveOidc ? "https://localhost:18444" : "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  // In full-matrix mode, missing browsers must fail rather than be silently skipped.
  projects: (fullBrowserMatrix ? browserNames : browserNames.slice(0, 1)).map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
  webServer: liveOidc ? undefined : {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
