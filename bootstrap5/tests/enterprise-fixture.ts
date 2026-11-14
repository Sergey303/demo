import { test as base, expect } from "@playwright/test";

// HTTP contract fixture only: not real signed identity or model evidence.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/enterprise-search/agent/identity", route => route.fulfill({
      json: { tenant: "demo-team", subject: "alice", identity_kind: "local_demo" },
    }));
    await use(page);
  },
});
export { expect };
