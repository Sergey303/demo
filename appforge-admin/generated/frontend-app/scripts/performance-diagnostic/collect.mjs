import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { summarizeRouteDiagnostic } from './summarize.mjs';
import { analyzeTrace } from './traceAnalysis.mjs';
import { startCoverage } from './coverage.mjs';

export async function collectRouteDiagnostic(browser, route, url, tracePath) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(`pageerror: ${error.message}`));

  await page.addInitScript(installObservers);
  const stopCoverage = await startCoverage(cdp);
  await cdp.send('Performance.enable');
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,loading,blink.user_timing,v8,toplevel',
    transferMode: 'ReturnAsStream',
  });
  let summary;
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(750);
    const browserData = await page.evaluate(readBrowserData);
    const protocolMetrics = await cdp.send('Performance.getMetrics');
    const protocol = Object.fromEntries(protocolMetrics.metrics.map(metric => [metric.name, metric.value]));
    const coverage = await stopCoverage();
    summary = { ...summarizeRouteDiagnostic(route, browserData, protocol, consoleErrors), coverage };
  } finally {
    await saveTrace(cdp, tracePath);
    await context.close();
  }
  return { ...summary, traceAnalysis: await analyzeTrace(tracePath) };
}

function installObservers() {
  const state = { lcpMs: 0, cls: 0, longTasks: [] };
  Object.defineProperty(window, '__appforgePerformanceDiagnostic', { value: state });
  observe('largest-contentful-paint', entries => {
    state.lcpMs = entries.at(-1)?.startTime ?? state.lcpMs;
  });
  observe('layout-shift', entries => {
    for (const entry of entries) if (!entry.hadRecentInput) state.cls += entry.value;
  });
  observe('longtask', entries => {
    for (const entry of entries) state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
  });
  function observe(type, callback) {
    try { new PerformanceObserver(list => callback(list.getEntries())).observe({ type, buffered: true }); } catch { }
  }
}
function readBrowserData() {
  const navigation = performance.getEntriesByType('navigation')[0]?.toJSON() ?? null;
  const paints = performance.getEntriesByType('paint').map(entry => entry.toJSON());
  const marks = performance.getEntriesByType('mark')
    .map(entry => ({ name: entry.name, startTime: entry.startTime }));
  const resources = performance.getEntriesByType('resource').map(entry => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    startTime: entry.startTime,
    duration: entry.duration,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
  }));
  return {
    navigation,
    paints,
    marks,
    resources,
    observer: window.__appforgePerformanceDiagnostic ?? { lcpMs: 0, cls: 0, longTasks: [] },
  };
}

async function saveTrace(cdp, tracePath) {
  const complete = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const result = await complete;
  const chunks = [];
  for (;;) {
    const part = await cdp.send('IO.read', { handle: result.stream });
    chunks.push(Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'));
    if (part.eof) break;
  }
  await cdp.send('IO.close', { handle: result.stream });
  await writeFile(tracePath, gzipSync(Buffer.concat(chunks), { level: 6 }));
}
