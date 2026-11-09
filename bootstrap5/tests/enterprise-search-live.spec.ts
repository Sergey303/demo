import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Real worker + ONNX + Whisper + disposable PostgreSQL. Never run by default.
const enabled = process.env.LIVE_ENTERPRISE_SEARCH === "true";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test.skip(!enabled, "Real model-backed unified search is an opt-in acceptance test.");
test.use({ video: "on", viewport: { width: 1280, height: 800 } });

function revoke(job: string) {
  const source = [
    "import os,sys",
    "sys.path.insert(0,sys.argv[2])",
    "from audio_access import revoke_read",
    "revoke_read(os.environ['JOBS_TEST_CONNECTION'],sys.argv[1],'demo-team','interviewer')",
  ].join("\n");
  execFileSync(process.env.EP04_TEST_PYTHON || "python3", [
    "-c",source,job,path.join(root,"architecture"),
  ], { cwd:root, env:process.env, timeout:15000, stdio:"pipe" });
}

test("real cross-modal search returns document and audio then enforces live revocation", async ({page,request},info) => {
  test.setTimeout(240_000);
  const wavPath=process.env.EP04_WAV_PATH;
  if (!wavPath || !process.env.JOBS_TEST_CONNECTION)
    throw new Error("Set EP04_WAV_PATH and disposable JOBS_TEST_CONNECTION.");
  const wav=readFileSync(wavPath);
  if (wav.length<44 || wav.length>262_144) throw new Error("WAV outside bounded contract");
  const doc="# Customer refund policy\n\nCustomers may request a refund within 30 days.\n\n"+
    "Project reimbursement invoices must be approved within fourteen working days.\n";

  await page.goto("/dashboard/enterprise-ai");
  const documents=page.getByTestId("enterprise-document");
  await documents.locator("#enterprise-document-file").setInputFiles({
    name:"refund-policy.md",mimeType:"text/markdown",buffer:Buffer.from(doc,"utf8"),
  });
  await documents.getByRole("button",{name:"Индексировать документ"}).click();
  await expect(documents.getByTestId("document-ack")).toContainText("202 Accepted",{timeout:20_000});
  const docId=await documents.getByTestId("document-job-id").innerText();
  await expect(documents.getByTestId("document-job-status")).toHaveText("done",{timeout:100_000});

  await page.locator("#enterprise-wav").setInputFiles({
    name:"refund-audio.wav",mimeType:"audio/wav",buffer:wav,
  });
  await page.getByRole("button",{name:"Отправить WAV"}).click();
  await expect(page.getByTestId("enterprise-post")).toContainText("202 Accepted",{timeout:25_000});
  const audioId=await page.getByTestId("enterprise-job-id").innerText();
  await expect(page.getByTestId("enterprise-job-status")).toHaveText("done",{timeout:150_000});

  const ui=page.getByTestId("enterprise-unified-search");
  await ui.locator("#enterprise-search-question").fill("When can customers request a refund?");
  await ui.getByRole("button",{name:"Найти доказательства"}).click();
  const evidence=ui.getByTestId("search-evidence");
  await expect(evidence).toBeVisible({timeout:55_000});
  await expect(evidence).toContainText("refund-policy.md");
  await expect(evidence).toContainText("refund-audio.wav");
  await expect(evidence).toContainText("Customers");
  await expect(evidence).not.toContainText("embedding");
  await page.screenshot({path:info.outputPath("enterprise-search-real.png"),fullPage:true});
  await page.waitForTimeout(2000);

  // The Python search API is not publicly authenticated: no-token access fails.
  const missingToken=await request.post("http://127.0.0.1:5088/search",{
    data:{question:"refund",top_k:5}});
  expect(missingToken.status()).toBe(401);

  // A genuine signed identity belonging to another tenant returns zero evidence.
  const script=[
    "import sys",
    "sys.path.insert(0,sys.argv[1])",
    "from audio_access import issue_token",
    "print(issue_token('other-team','interviewer'))",
  ].join("\n");
  const wrong=execFileSync(process.env.EP04_TEST_PYTHON || "python3",
    ["-c",script,path.join(root,"architecture")],
    {cwd:root,env:process.env,timeout:15000,stdio:"pipe"}).toString().trim();
  const other=await request.post("http://127.0.0.1:5088/search",{
    headers:{Authorization:"Bearer "+wrong},
    data:{question:"When can customers request a refund?",top_k:5},
  });
  expect(other.status()).toBe(200);
  expect((await other.json() as {hits:unknown[]}).hits).toHaveLength(0);

  revoke(docId);
  await ui.getByRole("button",{name:"Найти доказательства"}).click();
  await expect(evidence).toContainText("refund-audio.wav");
  await expect(evidence).not.toContainText("refund-policy.md");
  revoke(audioId);
  await ui.getByRole("button",{name:"Найти доказательства"}).click();
  await expect(ui.getByTestId("search-abstained")).toContainText("Нет доступных доказательств");
  await expect(evidence).toHaveCount(0);
  await page.waitForTimeout(1200);
});
