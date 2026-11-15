import { expect, test } from "./enterprise-fixture";

const id = "a1abff85-c93a-4c30-820a-5ac6f19f4b0e";
const wave = Buffer.alloc(48, 0);
wave.write("RIFF", 0, "ascii");
wave.write("WAVE", 8, "ascii");

// Contract-only HTTP stubs: not a live PostgreSQL, Whisper or auth integration test.
test("enterprise audio upload, real-status polling, retry and revoke UI", async ({ page }) => {
  let posts = 0;
  let key: string | undefined;
  let payload: unknown;
  let revoked = false;
  let pollCount = 0;

  await page.route("**/enterprise-api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, value: object) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });

    if (url.pathname === "/enterprise-api/ready") {
      await json(200, { status: "ready" });
      return;
    }
    if (url.pathname === "/enterprise-api/audio-jobs" && request.method() === "POST") {
      posts += 1;
      const incoming = request.headers()["idempotency-key"];
      const current = request.postDataJSON() as { filename: string; wavBase64: string };
      expect(incoming).toBeTruthy();
      expect(current.filename).toBe("sample.wav");
      expect(current.wavBase64).toBe(wave.toString("base64"));
      expect(request.headers()["authorization"]).toBeUndefined(); // injected at proxy, not in JS
      if (!key) {
        key = incoming;
        payload = current;
        await json(202, { id, status: "queued" });
      } else if (incoming === key && JSON.stringify(current) === JSON.stringify(payload)) {
        await json(200, { id, status: "already-accepted" });
      } else {
        await json(409, { error: "Conflict" });
      }
      return;
    }
    if (url.pathname === "/enterprise-api/jobs/" + id) {
      if (revoked) { await json(404, { error: "Not found" }); return; }
      pollCount += 1;
      if (pollCount === 1) {
        await json(200, { id, status: "queued", result: null });
      } else {
        await json(200, { id, status: "done", result: {
          source: "sample.wav", sha256: "INTERNAL",
          segments: [{ source: "sample.wav", start: 0.0, end: 2.56,
            text: "Customers can request a refund within 30 days.",
            embedding: [0.123456, 0.987654] }],
        } });
      }
      return;
    }
    await json(404, { error: "Unknown test API route" });
  });

  await page.goto("/dashboard/enterprise-ai");
  await expect(page.getByTestId("enterprise-ai")).toBeVisible();
  await expect(page.getByTestId("enterprise-ready")).toContainText("ready");
  await page.locator("#enterprise-wav").setInputFiles({
    name: "sample.wav", mimeType: "audio/wav", buffer: wave,
  });
  await page.getByRole("button", { name: "Отправить WAV" }).click();
  await expect(page.getByTestId("enterprise-post")).toContainText("202 Accepted");
  await expect(page.getByTestId("enterprise-job-id")).toHaveText(id);
  await expect(page.getByTestId("enterprise-job-status")).toHaveText("done", { timeout: 8000 });
  await expect(page.getByText(/Customers can request a refund/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("0.123456");
  await expect(page.locator("body")).not.toContainText("INTERNAL");

  await page.getByRole("button", { name: "Повторить тот же запрос" }).first().click();
  await expect(page.getByTestId("enterprise-post")).toContainText("200 already-accepted");
  await expect(page.getByTestId("enterprise-job-id")).toHaveText(id);
  expect(posts).toBe(2);
  revoked = true;
  await page.getByRole("button", { name: "Перечитать из PostgreSQL" }).first().click();
  await expect(page.getByRole("alert")).toContainText("доступ к ней отозван");
  await expect(page.getByText(/Customers can request a refund/)).toHaveCount(0);
});

test("invalid RIFF content is rejected without HTTP submission", async ({ page }) => {
  let uploads = 0;
  await page.route("**/enterprise-api/**", async (route) => {
    if (route.request().url().endsWith("/ready")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ready"}' });
    } else {
      uploads += 1;
      await route.fulfill({ status: 500 });
    }
  });
  await page.goto("/dashboard/enterprise-ai");
  await expect(page.getByTestId("enterprise-ready")).toContainText("ready");
  await page.locator("#enterprise-wav").setInputFiles({
    name: "bad.wav", mimeType: "audio/wav", buffer: Buffer.alloc(48),
  });
  await page.getByRole("button", { name: "Отправить WAV" }).click();
  await expect(page.getByRole("alert")).toContainText("RIFF/WAVE");
  expect(uploads).toBe(0);
});
