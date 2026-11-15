import { expect, test } from "./enterprise-fixture";

const id = "611b9b25-2d91-4f6f-bbcb-b820c26da606";

test("document upload → persisted chunks, retry and access revocation", async ({ page }) => {
  let submits = 0;
  let checks = 0;
  let revoked = false;
  let previousKey: string | undefined;
  await page.route("**/enterprise-api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const answer = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/ready")) {
      await answer(200, { status: "ready" });
    } else if (url.pathname.endsWith("/document-jobs") && request.method() === "POST") {
      const body = request.postDataJSON() as { filename: string; text: string };
      const key = request.headers()["idempotency-key"];
      expect(body).toEqual({ filename: "policy.md",
        text: "# Refund policy\nRefunds are available within 30 days.\n" });
      expect(request.headers().authorization).toBeUndefined();
      if (!previousKey) previousKey = key;
      expect(key).toBe(previousKey);
      submits++;
      await answer(submits === 1 ? 202 : 200,
        { id, status: submits === 1 ? "queued" : "already-accepted" });
    } else if (url.pathname.endsWith("/jobs/" + id)) {
      checks++;
      if (revoked) await answer(404, { error: "Not found" });
      else if (checks === 1) await answer(200, { id, status: "queued", result: null });
      else await answer(200, { id, status: "done", result: {
        source: "policy.md", segments: [{ source: "policy.md", chunk_index: 0,
          char_start: 0, char_end: 55, text: "Refunds are available within 30 days.",
          embedding: [0.123456] }],
      } });
    } else await answer(404, {});
  });

  await page.goto("/dashboard/enterprise-ai");
  await expect(page.getByTestId("enterprise-document")).toBeVisible();
  await page.locator("#enterprise-document-file").setInputFiles({
    name: "policy.md", mimeType: "text/markdown",
    buffer: Buffer.from("# Refund policy\nRefunds are available within 30 days.\n", "utf8"),
  });
  await page.getByRole("button", { name: "Индексировать документ" }).click();
  await expect(page.getByTestId("document-ack")).toContainText("202 Accepted");
  await expect(page.getByTestId("document-job-status")).toHaveText("done", { timeout: 8000 });
  await expect(page.getByText("Refunds are available within 30 days.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("0.123456");
  await page.getByRole("button", { name: "Повторить тот же запрос" }).last().click();
  await expect(page.getByTestId("document-ack")).toContainText("200 already-accepted");
  await expect(page.getByTestId("document-job-id")).toHaveText(id);
  expect(submits).toBe(2);

  revoked = true;
  await page.getByTestId("enterprise-document")
    .getByRole("button", { name: "Перечитать из PostgreSQL" }).click();
  await expect(page.getByRole("alert")).toContainText("доступ отозван");
  await expect(page.getByText("Refunds are available within 30 days.")).toHaveCount(0);
});

test("invalid UTF-8 and unsafe filenames are rejected before upload", async ({ page }) => {
  let uploads = 0;
  await page.route("**/enterprise-api/**", async route => {
    if (route.request().url().endsWith("/ready"))
      await route.fulfill({ status: 200, body: '{"status":"ready"}', contentType: "application/json" });
    else {
      uploads++;
      await route.fulfill({ status: 500 });
    }
  });
  await page.goto("/dashboard/enterprise-ai");
  const file = page.locator("#enterprise-document-file");
  await file.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from([0xff, 0xfe]) });
  await page.getByRole("button", { name: "Индексировать документ" }).click();
  await expect(page.getByRole("alert")).toContainText("UTF-8");
  await file.setInputFiles({ name: "invalid name.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByRole("button", { name: "Индексировать документ" })).toBeDisabled();
  expect(uploads).toBe(0);
});
