import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { reportInfrastructureErrors, summarizeReport, thresholdFailures, writeSummary } from "./report.mjs";
import { startStaticServer } from "./staticServer.mjs";

const baseline = process.argv.includes("--baseline");
const diagnostic = process.argv.includes("--diagnostic");
const mode = baseline ? "baseline" : diagnostic ? "diagnostic" : "final";
const outputDir = resolve(".lighthouse", mode);
const reportPath = resolve(outputDir, "root.json");
const chromePath = process.env.CHROME_PATH ?? process.env.APPFORGE_LIGHTHOUSE_CHROME ?? chromium.executablePath();
if (!existsSync(chromePath)) throw new Error("Chromium is unavailable. Run `npx playwright install chromium` or set CHROME_PATH.");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const server = await startStaticServer(resolve("dist"));
try {
  await runWithRetry(`${server.origin}/`, reportPath);
  const summary = await summarizeReport(reportPath);
  await writeSummary(resolve(outputDir, "summary.json"), summary);
  const scores = summary.scores;
  console.log(`/: P${scores.performance} A${scores.accessibility} BP${scores["best-practices"]} SEO${scores.seo}`);
  if (!baseline && !diagnostic) {
    const failures = thresholdFailures(summary);
    if (failures.length) throw new Error(`Lighthouse thresholds failed: ${failures.join(", ")}`);
  }
  const completion = baseline || diagnostic ? "CAPTURED" : "PASS";
  console.log(`Lighthouse ${baseline ? "baseline" : diagnostic ? "diagnostic" : "gate"}: 1/1 ${completion}`);
} finally {
  await server.close();
}

async function runWithRetry(url, targetPath) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let failure;
    try {
      await rm(targetPath, { force: true });
      await runLighthouse(url, targetPath);
      const errors = await reportInfrastructureErrors(targetPath);
      if (!errors.length) return;
      failure = `invalid report: ${errors.join("; ")}`;
    } catch (error) {
      failure = `runner failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (attempt === 3) throw new Error(`Lighthouse infrastructure failed after 3 attempts: ${failure}`);
    console.warn(`Lighthouse infrastructure error, retrying (${attempt}/3): ${failure}`);
  }
}

function runLighthouse(url, targetPath) {
  const args = [
    url,
    "--quiet",
    "--output=json",
    `--output-path=${targetPath}`,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--chrome-flags=--headless --no-sandbox --disable-gpu",
  ];
  return runCommand(resolve("node_modules/.bin/lighthouse"), args, { CHROME_PATH: chromePath });
}

function runCommand(command, args, extraEnv) {
  return new Promise((resolveDone, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...extraEnv }, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolveDone() : reject(new Error(`${command} exited with code ${code ?? "signal"}`)));
  });
}
