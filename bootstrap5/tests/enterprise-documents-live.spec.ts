import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const enabled = process.env.LIVE_ENTERPRISE_DOCS === "true";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test.skip(!enabled, "Opt-in only: disposable PostgreSQL, running .NET, Python worker and ONNX.");
test.use({ video: "on", viewport: { width: 1280, height: 800 } });

test("real documents: accept, ONNX persist, authorized read, retry and revoke", async ({ page, request }, info) => {
  test.setTimeout(180_000);
  if (!process.env.JOBS_TEST_CONNECTION) throw new Error("Set isolated JOBS_TEST_CONNECTION.");
  const text = [
    "# Enterprise expense policy",
    "The annual project budget is twelve million credits.",
    "Invoices must be reviewed within fourteen working days.",
    "The executive approval threshold is sixty thousand credits.",
    "These are synthetic data created for the portfolio demo.",
  ].join("\n\n");

  let submittedKey: string | undefined;
  page.on("request", req => {
    if (req.method() === "POST" && new URL(req.url()).pathname.endsWith("/enterprise-api/document-jobs"))
      submittedKey = req.headers()["idempotency-key"];
  });
  await page.goto("/dashboard/enterprise-ai");
  await expect(page.getByTestId("enterprise-document")).toBeVisible();
  await page.locator("#enterprise-document-file").setInputFiles({
    name: "enterprise-policy.md", mimeType: "text/markdown", buffer: Buffer.from(text, "utf8"),
  });
  await page.getByRole("button", { name: "Индексировать документ" }).click();
  await expect(page.getByTestId("document-ack")).toContainText("202 Accepted", { timeout: 25_000 });
  const id = await page.getByTestId("document-job-id").innerText();
  expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.getByTestId("document-job-status")).toHaveText("done", { timeout: 150_000 });
  await expect(page.getByText(/annual project budget is twelve million credits/i)).toBeVisible();
  await page.screenshot({ path: info.outputPath("enterprise-document-live.png"), fullPage: true });

  const authorized = await request.get("http://127.0.0.1:4173/enterprise-api/jobs/" + id);
  expect(authorized.status()).toBe(200);
  const stored = await authorized.json() as { result: { segments: Array<{ text: string; char_start: number; char_end: number }> } };
  expect(stored.result.segments.length).toBeGreaterThan(0);
  for (const segment of stored.result.segments) {
    expect(segment.char_end).toBeGreaterThan(segment.char_start);
    expect(JSON.stringify(segment)).not.toContain("embedding");
    expect(text.slice(segment.char_start, segment.char_end)).toEqual(segment.text);
  }
  const anonymous = await request.get("http://127.0.0.1:5077/jobs/" + id);
  expect(anonymous.status()).toBe(404);
  expect(submittedKey).toMatch(/^enterprise-doc-/);
  const conflict = await request.post("http://127.0.0.1:4173/enterprise-api/document-jobs", {
    headers: { "Idempotency-Key": submittedKey! },
    data: { filename: "enterprise-policy.md", text: text + "\nmodified" },
  });
  expect(conflict.status()).toBe(409);

  // The second tenant has a valid signed token, but no grant for this document.
  const python = process.env.EP03_TEST_PYTHON || "python3";
  const wrongTokenCode = [
    "import sys",
    "sys.path.insert(0,sys.argv[1])",
    "from audio_access import issue_token",
    "print(issue_token('other-team','interviewer'))",
  ].join("\n");
  const wrongToken = execFileSync(python, ["-c", wrongTokenCode, path.join(root, "architecture")],
    { cwd: root, env: process.env, timeout: 15_000, stdio: "pipe" }).toString().trim();
  const wrongTenant = await request.get("http://127.0.0.1:5077/jobs/" + id, {
    headers: { Authorization: "Bearer " + wrongToken },
  });
  expect(wrongTenant.status()).toBe(404);

  await page.getByTestId("enterprise-document")
    .getByRole("button", { name: "Повторить тот же запрос" }).click();
  await expect(page.getByTestId("document-ack")).toContainText("200 already-accepted");
  await expect(page.getByTestId("document-job-id")).toHaveText(id);

  // Offline administrator only, never an endpoint and never browser-controlled.
  const code = [
    "import os,sys",
    "sys.path.insert(0,sys.argv[2])",
    "from audio_access import revoke_read",
    "revoke_read(os.environ['JOBS_TEST_CONNECTION'],sys.argv[1],'demo-team','interviewer')",
  ].join("\n");
  execFileSync(process.env.EP03_TEST_PYTHON || "python3", [
    "-c", code, id, path.join(root, "architecture"),
  ], { cwd: root, env: process.env, timeout: 15_000, stdio: "pipe" });
  await page.getByTestId("enterprise-document")
    .getByRole("button", { name: "Перечитать из PostgreSQL" }).click();
  await expect(page.getByRole("alert")).toContainText("доступ отозван");
  await expect(page.getByTestId("document-job-id")).toHaveCount(0);
  await expect(page.getByText(/annual project budget is twelve million credits/i)).toHaveCount(0);
});
