import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { startStaticServer } from '../lighthouse/staticServer.mjs';
import { startCoverage } from './coverage.mjs';
import { analyzeTrace } from './traceAnalysis.mjs';

const outputDir = resolve('.performance-diagnostics');
const tracePath = resolve(outputDir, 'authenticated-first-page.trace.json.gz');
const chromePath = process.env.CHROME_PATH ?? process.env.APPFORGE_PERFORMANCE_CHROME ?? chromium.executablePath();
if (!existsSync(chromePath)) throw new Error('Chromium is unavailable. Install Playwright Chromium or set CHROME_PATH.');

await mkdir(outputDir, { recursive: true });
const server = await startStaticServer(resolve('dist'));
const browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--no-sandbox', '--disable-gpu'] });
try {
  const summary = await collectAuthenticated(browser, server.origin, tracePath);
  await writeFile(resolve(outputDir, 'authenticated-first-page.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`authenticated first page: ${summary.elapsedMs}ms transfer ${summary.transferKb}KB JS ${summary.coverage.javascript.usedPercent}% used`);
} finally {
  await browser.close();
  await server.close();
}
async function collectAuthenticated(browserInstance, origin, targetTracePath) {
  const context = await browserInstance.newContext();
  await context.route('**/api/**', route => fulfillApi(route));
  const page = await context.newPage();
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });

  const cdp = await context.newCDPSession(page);
  const stopCoverage = await startCoverage(cdp);
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,loading,blink.user_timing,v8,toplevel',
    transferMode: 'ReturnAsStream',
  });
  await page.evaluate(() => {
    performance.clearResourceTimings();
    window.__appforgeAuthenticatedLongTasks = [];
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__appforgeAuthenticatedLongTasks.push(entry.duration);
    });
    observer.observe({ type: 'longtask', buffered: true });
    window.__appforgeAuthenticatedObserver = observer;
  });
  const startedAt = Date.now();
  await page.locator('#appforge-login').fill('x');
  await page.locator('#appforge-password').fill('x');
  await page.locator('button[type="submit"]').click();
  await page.locator('.appforge-generated-page').waitFor();
  await page.waitForTimeout(500);
  const elapsedMs = Date.now() - startedAt;
  const browserData = await page.evaluate(() => ({
    resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()),
    longTasks: window.__appforgeAuthenticatedLongTasks ?? [],
    heading: document.querySelector('.appforge-generated-page h1')?.textContent ?? null,
  }));
  const coverage = await stopCoverage();
  await saveTrace(cdp, targetTracePath);
  await context.close();
  const transferBytes = browserData.resources.reduce((sum, resource) => sum + (resource.transferSize ?? 0), 0);
  return {
    scenario: 'authenticated-first-page',
    heading: browserData.heading,
    elapsedMs,
    transferKb: round(transferBytes / 1024),
    longTaskCount: browserData.longTasks.length,
    longTaskTotalMs: round(browserData.longTasks.reduce((sum, value) => sum + value, 0)),
    topTransferResources: browserData.resources
      .sort((left, right) => (right.transferSize ?? 0) - (left.transferSize ?? 0))
      .slice(0, 12)
      .map(resource => ({ name: resource.name, transferSize: resource.transferSize ?? 0 })),
    coverage,
    traceAnalysis: await analyzeTrace(targetTracePath),
  };
}
function fulfillApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname === '/api/auth/login') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'diagnostic', refreshToken: 'diagnostic', expiresAtUtc: '2099-01-01T00:00:00Z',
        user: { id: 'diagnostic', email: 'diagnostic@example.test', userName: 'diagnostic', mustChangePassword: false, emailConfirmed: true, roles: ['Admin'], permissions: ['Permission.Read'] },
      }),
    });
  }
  if (url.pathname === '/api/permissions') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], totalCount: 0 }) });
  }
  if (url.pathname.startsWith('/api/permissions/suggest/')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
}

async function saveTrace(cdp, targetTracePath) {
  const complete = new Promise(resolveComplete => cdp.once('Tracing.tracingComplete', resolveComplete));
  await cdp.send('Tracing.end');
  const result = await complete;
  const chunks = [];
  for (;;) {
    const part = await cdp.send('IO.read', { handle: result.stream });
    chunks.push(Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'));
    if (part.eof) break;
  }
  await cdp.send('IO.close', { handle: result.stream });
  await writeFile(targetTracePath, gzipSync(Buffer.concat(chunks), { level: 6 }));
}

function round(value) {
  return Math.round(value * 10) / 10;
}
