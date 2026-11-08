import { expect, test } from "@playwright/test";

// Browser contract test uses intercepted HTTP responses. It is NOT evidence of
// a live PostgreSQL or worker test; use hiring-demo/README.md for that.
test("hiring route presents real API protocol with retry, conflict and outage states", async ({ page }) => {
  let available = true;
  let posts = 0;
  const id = "f4b8268d-0ca3-4eae-bfeb-15ed998df245";
  let acceptedKey: string | null = null;
  let acceptedText: string | null = null;

  await page.route("**/demo-api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, value: object) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });

    if (url.pathname === "/demo-api/ready") {
      await json(available ? 200 : 503, { status: available ? "ready" : "unavailable" });
      return;
    }
    if (!available) {
      await json(503, { error: "unavailable" });
      return;
    }
    if (url.pathname === "/demo-api/jobs" && request.method() === "POST") {
      posts++;
      const key = request.headers()["idempotency-key"];
      const payload = request.postDataJSON() as { text: string };
      if (!acceptedKey) {
        acceptedKey = key;
        acceptedText = payload.text;
        await json(202, { id, status: "queued" });
      } else if (key !== acceptedKey || payload.text !== acceptedText) {
        await json(409, { error: "Key reused for different payload" });
      } else {
        await json(200, { id, status: "already-accepted" });
      }
      return;
    }
    if (url.pathname === "/demo-api/jobs/" + id) {
      await json(200, { id, status: "done", result: { WordCount: 3, Sha256: "ABCDEF" } });
      return;
    }
    await json(404, { error: "Unknown endpoint" });
  });

  await page.goto("/dashboard/hiring-demo");
  await expect(page.getByTestId("hiring-demo")).toBeVisible();
  await expect(page.getByTestId("api-status")).toContainText("ready");

  await page.getByRole("button", { name: "POST /jobs" }).click();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  await expect(page.getByTestId("job-status")).toHaveText("done");

  await page.getByRole("button", { name: "Повторить тот же запрос" }).click();
  await expect(page.getByText(/200 · already-accepted/)).toBeVisible();
  await expect(page.getByText(id, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Попробовать другой payload/ }).click();
  await expect(page.getByText(/409 Conflict/)).toBeVisible();
  expect(posts).toBe(3);

  available = false;
  await expect(page.getByTestId("api-status")).toContainText("unavailable", { timeout: 8000 });
  available = true;
  await expect(page.getByTestId("api-status")).toContainText("ready", { timeout: 8000 });

  await page.getByRole("button", { name: "Повторить тот же запрос" }).click();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
});
