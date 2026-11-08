import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

// This test is opt-in because it starts/stops the real .NET API.
// CI provides an isolated PostgreSQL service and sets LIVE_HIRING_DEMO=true.
test.skip(process.env.LIVE_HIRING_DEMO !== "true", "Real PostgreSQL E2E requires isolated CI services");
test.use({ video: "on", viewport: { width: 1440, height: 900 } });

const root = resolve(process.cwd(), "..");
const dll = resolve(root, "dotnet-outbox/src/bin/Release/net10.0/ReliableJobs.dll");
const readyUrl = "http://127.0.0.1:5077/ready";

function startApi(): ChildProcess {
  if (!process.env.ConnectionStrings__Jobs) throw new Error("Only a configured disposable DB is supported");
  return spawn("dotnet", [dll, "--urls", "http://127.0.0.1:5077"], {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });
}

async function waitForReady(process: ChildProcess, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error("Real .NET process exited");
    try {
      const response = await fetch(readyUrl, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // Startup may still be in progress.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
  }
  throw new Error("Timed out waiting for real PostgreSQL-backed /ready");
}

async function stopApi(process: ChildProcess | null): Promise<void> {
  if (!process || process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveWait) => process.once("exit", () => resolveWait())),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 5000)),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

test("real outbox: accepted, committed, idempotent, conflict, survives API restart", async ({ page }) => {
  test.setTimeout(150_000); // Video deliberately holds each real state for the reviewer.
  let api: ChildProcess | null = null;
  try {
    api = startApi();
    await waitForReady(api);
    await page.goto("/dashboard/hiring-demo");
    await expect(page.getByTestId("api-status")).toContainText("ready");
    await page.waitForTimeout(4500); // Show the live infrastructure status.
    await page.getByRole("button", { name: "POST /jobs" }).click();
    const jobId = (await page.locator("code").first().textContent())?.trim();
    expect(jobId).toMatch(/^[0-9a-f-]{36}$/i);

    await expect(page.getByTestId("job-status")).toHaveText("done", { timeout: 25000 });
    await expect(page.getByText(/"WordCount": 3/)).toBeVisible();
    await page.waitForTimeout(8500);

    await page.getByRole("button", { name: "Повторить тот же запрос" }).click();
    await expect(page.getByText(/200 · already-accepted/)).toBeVisible();
    await expect(page.getByText(jobId!, { exact: true })).toBeVisible();
    await page.waitForTimeout(800);

    await page.getByRole("button", { name: /Попробовать другой payload/ }).click();
    await expect(page.getByText(/409 Conflict/)).toBeVisible();
    await page.waitForTimeout(800);

    await stopApi(api);
    api = null;
    await expect(page.getByTestId("api-status")).toContainText("unavailable", { timeout: 12000 });
    await page.waitForTimeout(11000);

    api = startApi();
    await waitForReady(api);
    await expect(page.getByTestId("api-status")).toContainText("ready", { timeout: 12000 });
    await page.getByRole("button", { name: "Повторить тот же запрос" }).click();
    await expect(page.getByText(jobId!, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Обновить из PostgreSQL" }).click();
    await expect(page.getByTestId("job-status")).toHaveText("done", { timeout: 12000 });
    await page.waitForTimeout(9000);
  } finally {
    await stopApi(api);
  }
});
