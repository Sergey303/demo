import { expect, test } from "@playwright/test";

test("unified evidence-only search shows both modalities, abstains and hides stale data", async ({ page }) => {
  let calls = 0;
  await page.route("**/enterprise-search/search", async route => {
    calls++;
    const req = route.request();
    expect(req.headers().authorization).toBeUndefined();
    expect(req.postDataJSON()).toEqual({ question: "refund thirty days", top_k: 5 });
    const answer = calls === 1
      ? { hits: [
          { job_id:"ab71b113-0b3d-4b18-b380-81a0799481ab",kind:"audio",source:"voice.wav",
            text:"Customers may request a refund within thirty days.",start:0,end:3,score:0.92,embedding:[0.12] },
          { job_id:"adc5e95e-00e3-4b53-95ee-6001ec856787",kind:"document",source:"policy.md",
            text:"Customers have 30 days to return items.",char_start:11,char_end:50,score:0.83,embedding:[0.99] },
        ], abstained: false }
      : { hits: [], abstained: true, reason: "no_authorized_evidence" };
    await route.fulfill({ status: 200, contentType:"application/json", body: JSON.stringify(answer) });
  });
  await page.goto("/dashboard/enterprise-ai");
  const search = page.getByTestId("enterprise-unified-search");
  await expect(search).toBeVisible();
  await search.locator("#enterprise-search-question").fill("refund thirty days");
  await search.getByRole("button", { name:"Найти доказательства" }).click();
  await expect(search.getByTestId("search-evidence")).toContainText("voice.wav");
  await expect(search.getByTestId("search-evidence")).toContainText("policy.md");
  await expect(search.getByTestId("search-evidence")).not.toContainText("[0.99]");
  await expect(search.getByTestId("search-evidence")).not.toContainText("[0.12]");
  await search.getByRole("button", { name:"Найти доказательства" }).click();
  await expect(search.getByTestId("search-abstained")).toContainText("Нет доступных доказательств");
  await expect(search.getByTestId("search-evidence")).toHaveCount(0);
  expect(calls).toBe(2);
});

test("search failure clears previously shown evidence and cannot forge tenant", async ({ page }) => {
  let count = 0;
  await page.route("**/enterprise-search/search", async route => {
    count++;
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    expect(payload.tenant).toBeUndefined();
    expect(payload.subject).toBeUndefined();
    await route.fulfill(count === 1
      ? { status:200, contentType:"application/json", body: JSON.stringify({
          hits:[{kind:"document",job_id:"adc5e95e-00e3-4b53-95ee-6001ec856787",
            source:"policy.md",text:"Secret receipt",char_start:0,char_end:14,score:0.8}],
          abstained:false }) }
      : { status:401, contentType:"application/json",body:'{"detail":"Unauthorized"}' });
  });
  await page.goto("/dashboard/enterprise-ai");
  const search = page.getByTestId("enterprise-unified-search");
  await search.locator("#enterprise-search-question").fill("invoice");
  await search.getByRole("button", { name:"Найти доказательства" }).click();
  await expect(search).toContainText("Secret receipt");
  await search.getByRole("button", { name:"Найти доказательства" }).click();
  await expect(search.getByRole("alert")).toContainText("401");
  await expect(search).not.toContainText("Secret receipt");
});
