import { expect, test } from "@playwright/test";

const audioId = "9d2e6a4d-d1b3-4c3c-927f-35e1abd42900";
const documentId = "863f223e-bf4d-4a91-bdd3-00421f2529a1";
const audio = {
  job_id: audioId, kind: "audio", source: "meeting.wav",
  quote: "Customers can request a refund within thirty days.",
  start: 0, end: 3, score: 0.86,
};
const document = {
  job_id: documentId, kind: "document", source: "policy.md",
  quote: "The refund period is 30 days.",
  char_start: 0, char_end: 29, score: 0.83,
};

test("exact quote answer keeps job-bound citations; revoke clears prior result", async ({ page }) => {
  let calls = 0;
  await page.route("**/enterprise-search/answer", async route => {
    calls++;
    const req = route.request();
    expect(req.headers().authorization).toBeUndefined();
    expect(req.postDataJSON()).toEqual({ question: "When is the refund deadline?", top_k: 5 });
    if (calls === 1) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          mode: "evidence", abstained: false, semantic_verified: false,
          reason: "verbatim_authorized_source_excerpts",
          answer: audio.quote + "\n" + document.quote,
          citations: [audio, document],
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ mode:"evidence", abstained:true, semantic_verified:false,
          reason:"no_authorized_evidence",answer:"Недостаточно разрешённых доказательств для ответа.",
          citations: [] }) });
    }
  });
  await page.goto("/dashboard/enterprise-ai");
  const search = page.getByTestId("enterprise-unified-search");
  await search.locator("#enterprise-search-question").fill("When is the refund deadline?");
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  const answer = search.getByTestId("answer-result");
  await expect(answer).toBeVisible();
  await expect(search.getByTestId("answer-text")).toHaveText(audio.quote + "\n" + document.quote);
  await expect(answer).toContainText("meeting.wav");
  await expect(answer).toContainText("policy.md");
  await expect(answer).toContainText(audioId);
  await expect(answer).toContainText(documentId);
  await expect(answer).not.toContainText("semantic_verified");
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  await expect(search.getByTestId("answer-abstained")).toContainText("Недостаточно разрешённых доказательств");
  await expect(search.getByTestId("answer-result")).toHaveCount(0);
  expect(calls).toBe(2);
});

test("fabricated or paraphrased answer is rejected by browser and source cleared", async ({ page }) => {
  let calls = 0;
  await page.route("**/enterprise-search/answer", async route => {
    calls++;
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({
        mode:"evidence", abstained:false,semantic_verified:false,reason:"verbatim_authorized_source_excerpts",
        answer: calls===1 ? audio.quote : "This invented deadline is ninety days.",
        citations:[audio],
      }) });
  });
  await page.goto("/dashboard/enterprise-ai");
  const search = page.getByTestId("enterprise-unified-search");
  await search.locator("#enterprise-search-question").fill("refund deadline");
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  await expect(search.getByTestId("answer-text")).toContainText(audio.quote);
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  await expect(search.getByRole("alert")).toContainText("не совпадает с цитатами");
  await expect(search.getByTestId("answer-text")).toHaveCount(0);
});

test("answer endpoint unavailable or unauthorized cannot reveal stale quotes", async ({ page }) => {
  let calls = 0;
  await page.route("**/enterprise-search/answer", async route => {
    calls++;
    await route.fulfill(calls === 1
      ? { status:200,contentType:"application/json",
        body:JSON.stringify({mode:"evidence",abstained:false,semantic_verified:false,
          reason:"verbatim_authorized_source_excerpts",answer:audio.quote,citations:[audio]}) }
      : { status:401,contentType:"application/json",body:'{"detail":"Unauthorized"}' });
  });
  await page.goto("/dashboard/enterprise-ai");
  const search = page.getByTestId("enterprise-unified-search");
  await search.locator("#enterprise-search-question").fill("refund deadline");
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  await expect(search.getByTestId("answer-result")).toBeVisible();
  await search.getByRole("button", { name: "Ответить дословными цитатами" }).click();
  await expect(search.getByRole("alert")).toContainText("401");
  await expect(search.getByTestId("answer-result")).toHaveCount(0);
});
