import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startStaticServer } from '../lighthouse/staticServer.mjs';
import { collectRouteDiagnostic } from './collect.mjs';

const outputDir = resolve('.performance-diagnostics');
const chromePath = process.env.CHROME_PATH ?? process.env.APPFORGE_PERFORMANCE_CHROME ?? chromium.executablePath();
if (!existsSync(chromePath)) {
  throw new Error('Chromium is unavailable. Run `npx playwright install chromium` or set CHROME_PATH.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const server = await startStaticServer(resolve('dist'));
const browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--no-sandbox', '--disable-gpu'] });
try {
  const summary = await collectRouteDiagnostic(
    browser,
    '/',
    `${server.origin}/`,
    resolve(outputDir, 'root.trace.json.gz'),
  );
  await writeFile(resolve(outputDir, 'root.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'summary.json'), `${JSON.stringify([summary], null, 2)}\n`, 'utf8');
  const metrics = summary.metrics;
  console.log(`/: LCP ${metrics.lcpMs}ms CLS ${metrics.cls} long ${metrics.longTaskTotalMs}ms transfer ${metrics.transferKb}KB`);
  console.log(`Performance diagnostic: 1/1 captured in ${outputDir}`);
} finally {
  await browser.close();
  await server.close();
}
