import { expect, test } from "./enterprise-fixture";

const jobId = "57feacc4-0ddd-4e88-b719-1f9e35d4c190";
const source = {
  job_id: jobId, kind: "document", source: "refund-policy.md",
  quote: "Customers may request refunds within 30 days.",
  char_start: 25, char_end: 70, score: .91,
};

test("opt-in Qwen3 answer shows verified source metadata but no faithfulness guarantee", async ({ page }) => {
  const payloads: unknown[] = [];
  await page.route("**/enterprise-search/answer", async route => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({
        mode: "generated", model: "qwen3:8b", semantic_verified: false,
        answer: "The refund window is 30 days.", abstained: false,
        citations: [source],
        reason: "authorized_citation_ids_validated_not_semantic_entailment",
      })});
  });
  await page.goto("/dashboard/enterprise-ai");
  const ui=page.getByTestId("enterprise-unified-search");
  await ui.locator("#enterprise-search-question").fill("When is the refund deadline?");
  await ui.getByRole("button", {name: "Сформировать ответ Qwen3 (локально)"}).click();
  await expect(ui.getByTestId("answer-result")).toBeVisible();
  await expect(ui.getByTestId("answer-text")).toHaveText("The refund window is 30 days.");
  await expect(ui.getByTestId("answer-result")).toContainText("логическую обоснованность");
  await expect(ui.getByTestId("answer-result")).toContainText(jobId);
  expect(payloads).toEqual([{question:"When is the refund deadline?",top_k:5,mode:"generated"}]);
});

test("model-unavailable 503 clears previous generated text without changing evidence mode", async ({ page }) => {
  let n=0;
  await page.route("**/enterprise-search/answer", async route => {
    const body=route.request().postDataJSON() as {mode?:string};
    if (body.mode === "generated") {
      n++;
      if (n === 1) {
        await route.fulfill({ status: 200, contentType:"application/json",body:JSON.stringify({
          mode:"generated",model:"qwen3:8b",semantic_verified:false,
          answer:"30 days",abstained:false,citations:[source],
          reason:"authorized_citation_ids_validated_not_semantic_entailment"}) });
      } else {
        await route.fulfill({status:503,contentType:"application/json",
          body:'{"detail":"Local LLM unavailable"}'});
      }
    } else {
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        mode:"evidence",semantic_verified:false,answer:source.quote,
        abstained:false,citations:[source],reason:"verbatim_authorized_source_excerpts"
      })});
    }
  });
  await page.goto("/dashboard/enterprise-ai");
  const ui=page.getByTestId("enterprise-unified-search");
  await ui.locator("#enterprise-search-question").fill("refund");
  await ui.getByRole("button",{name:"Сформировать ответ Qwen3 (локально)"}).click();
  await expect(ui.getByTestId("answer-text")).toHaveText("30 days");
  await ui.getByRole("button",{name:"Сформировать ответ Qwen3 (локально)"}).click();
  await expect(ui.getByRole("alert")).toContainText("Ollama");
  await expect(ui.getByTestId("answer-result")).toHaveCount(0);
  await ui.getByRole("button",{name:"Ответить дословными цитатами"}).click();
  await expect(ui.getByTestId("answer-text")).toHaveText(source.quote);
});

test("generated answer cannot smuggle invented source metadata or improper schema", async ({ page }) => {
  await page.route("**/enterprise-search/answer", async route => {
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
      mode:"generated",model:"qwen3:8b",semantic_verified:false,
      answer:"30 days",abstained:false,citations:[{...source,job_id:"fake-citation"}],
      reason:"unauthorized_claim"
    })});
  });
  await page.goto("/dashboard/enterprise-ai");
  const ui=page.getByTestId("enterprise-unified-search");
  await ui.locator("#enterprise-search-question").fill("refund");
  await ui.getByRole("button",{name:"Сформировать ответ Qwen3 (локально)"}).click();
  await expect(ui.getByRole("alert")).toContainText("Некорректный источник цитаты");
  await expect(ui.getByTestId("answer-result")).toHaveCount(0);
});
