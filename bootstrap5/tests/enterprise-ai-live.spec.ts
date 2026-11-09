import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Opt-in test ONLY: real .NET, disposable PostgreSQL, Python Whisper + ONNX.
// This is not a mocked HTTP contract test and MUST NOT run by default.
const enabled = process.env.LIVE_ENTERPRISE_AUDIO === "true";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test.skip(!enabled, "Live Whisper E2E is opt-in; requires disposable PostgreSQL and running worker.");

test.use({ video: "on", viewport: { width: 1280, height: 800 } }); // Real browser recording

test("real audio submission, stored Whisper evidence, retry and revoke", async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const wavPath = process.env.ENTERPRISE_WAV_PATH;
  const dsn = process.env.JOBS_TEST_CONNECTION;
  if (!wavPath || !dsn) throw new Error("Configure ENTERPRISE_WAV_PATH and JOBS_TEST_CONNECTION for disposable demo.");
  const wav = readFileSync(wavPath);
  if (wav.length < 44 || wav.length > 262_144) throw new Error("Input WAV size is outside the demo contract.");
  const filename = path.basename(wavPath);
  if (!/^[A-Za-z0-9._-]{1,100}\.wav$/i.test(filename)) throw new Error("Use an ASCII .wav filename.");

  await page.goto("/dashboard/enterprise-ai");
  await expect(page.getByTestId("enterprise-ready")).toContainText("ready", { timeout: 20_000 });
  await page.waitForTimeout(1500); // Make the public recording legible; not part of correctness.
  await page.locator("#enterprise-wav").setInputFiles({
    name: filename, mimeType: "audio/wav", buffer: wav,
  });
  await page.getByRole("button", { name: "Отправить WAV" }).click();
  await expect(page.getByTestId("enterprise-post")).toContainText("202 Accepted", { timeout: 20_000 });
  const id = await page.getByTestId("enterprise-job-id").innerText();
  expect(id).toMatch(/^[a-f0-9-]{36}$/i);
  await expect(page.getByTestId("enterprise-job-status")).toHaveText("done", { timeout: 190_000 });
  await expect(page.getByText(/refund|thirty|30 days/i).first()).toBeVisible();
  await expect(page.locator(".list-group-item").first()).toContainText(/\d+\.\d+–\d+\.\d+ с/);
  await page.screenshot({ path: testInfo.outputPath("enterprise-ai-real-whisper.png"), fullPage: true });
  await page.waitForTimeout(3000); // Hold verified result for the screencast.

  // A client without the server-issued identity cannot read the same job.
  const unauthenticated = await request.get("http://127.0.0.1:5077/jobs/" + id);
  expect(unauthenticated.status()).toBe(404);

  await page.getByRole("button", { name: "Повторить тот же запрос" }).first().click();
  await expect(page.getByTestId("enterprise-post")).toContainText("200 already-accepted");
  await expect(page.getByTestId("enterprise-job-id")).toHaveText(id);
  await page.waitForTimeout(1500);

  // Trusted test-administrator operation, NEVER a browser-facing endpoint.
  const adminScript = [
    "import os,sys",
    "sys.path.insert(0,sys.argv[2])",
    "from audio_access import revoke_read",
    "revoke_read(os.environ['JOBS_TEST_CONNECTION'],sys.argv[1],'demo-team','interviewer')",
  ].join("\n");
  execFileSync(process.env.EP02_TEST_PYTHON || "python3", [
    "-c", adminScript, id, path.join(repo, "architecture"),
  ], { cwd: repo, env: process.env, timeout: 15_000, stdio: "pipe" });

  await page.getByRole("button", { name: "Перечитать из PostgreSQL" }).first().click();
  await expect(page.getByRole("alert")).toContainText("доступ к ней отозван");
  await expect(page.getByTestId("enterprise-job-id")).toHaveCount(0);
  await expect(page.getByText(/Customers can request a refund/i)).toHaveCount(0);
  await page.waitForTimeout(1500); // Show correct revocation behavior in the recording.
});
