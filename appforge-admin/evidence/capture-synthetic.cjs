#!/usr/bin/env node
// UI-only browser evidence. All /api/** responses are intercepted; no PostgreSQL,
// Telegram or other service is contacted. Never use this as backend/E2E proof.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const { startStaticServer } = await import(pathToFileURL(
    path.join(root, 'generated/frontend-app/scripts/lighthouse/staticServer.mjs')
  ).href);
  const staticServer = await startStaticServer(
    path.join(root, 'generated/frontend-app/dist')
  );
  const sharedEndpoint = process.env.CDP_ENDPOINT;
  const browser = sharedEndpoint
    ? await chromium.connectOverCDP(sharedEndpoint)
    : await chromium.launch({
        executablePath: process.env.CHROME_PATH || chromium.executablePath(),
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
      });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await context.route('**/api/**', route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const response = data => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(data),
      });
      if (pathname === '/api/auth/login') {
        return response({
          accessToken: 'synthetic-capture-only',
          refreshToken: 'synthetic-capture-only',
          expiresAtUtc: '2099-01-01T00:00:00Z',
          user: {
            id: 'synthetic-admin',
            email: 'synthetic-admin@example.test',
            userName: 'synthetic-admin',
            mustChangePassword: false,
            emailConfirmed: true,
            roles: ['Admin'],
            permissions: ['Subscriber.Read', 'Lead.Read', 'Campaign.Read'],
          },
        });
      }
      if (pathname === '/api/subscribers') {
        return response({ page: 1, pageSize: 10, totalCount: 0, items: [] });
      }
      if (pathname.endsWith('/options/statusName')) {
        return response([{ label: 'Active', value: 'Active' }, { label: 'Paused', value: 'Paused' }, { label: 'Blocked', value: 'Blocked' }]);
      }
      if (pathname.includes('/suggest/')) return response([]);
      return response({ items: [], page: 1, pageSize: 10, totalCount: 0 });
    });
    const page = await context.newPage();
    await page.goto(staticServer.origin + '/#/subscribers', { waitUntil: 'domcontentloaded' });
    await page.locator('#appforge-login').fill('synthetic');
    await page.locator('#appforge-password').fill('synthetic');
    await page.locator('button[type="submit"]').click();
    await page.getByRole('heading', { name: 'Subscribers' }).first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(__dirname, 'generated-admin-shell-mocked.png'),
      fullPage: true, animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Create Subscriber' }).click();
    await page.getByRole('dialog').waitFor({ timeout: 12000 });
    await page.screenshot({
      path: path.join(__dirname, 'generated-admin-create-form-mocked.png'),
      fullPage: true, animations: 'disabled',
    });
    console.log('MOCKED_BROWSER_PASS: generated admin shell, Subscribers table and create form');
    await context.close();
  } finally {
    await browser.close();
    await staticServer.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
