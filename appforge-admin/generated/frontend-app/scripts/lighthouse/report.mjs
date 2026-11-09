import { readFile, writeFile } from "node:fs/promises";

export const thresholds = {
  performance: 0.9,
  accessibility: 1,
  "best-practices": 1,
  seo: 1,
};

export async function reportInfrastructureErrors(reportPath) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const errors = [];
  for (const key of Object.keys(thresholds)) {
    if (report.categories?.[key]?.score == null) errors.push(`${key} category is unavailable`);
  }
  for (const id of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time"]) {
    const audit = report.audits?.[id];
    if (audit?.scoreDisplayMode === "error") errors.push(`${id}: ${audit.errorMessage ?? "audit error"}`);
  }
  return errors;
}

export async function summarizeReport(reportPath) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const scores = Object.fromEntries(
    Object.keys(thresholds).map(key => [key, Math.round((report.categories?.[key]?.score ?? 0) * 100)]),
  );
  const metric = id => report.audits?.[id]?.numericValue ?? null;
  const failedAudits = Object.values(report.audits ?? {})
    .filter(audit => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "notApplicable")
    .map(audit => ({ id: audit.id, title: audit.title, score: audit.score, displayValue: audit.displayValue ?? null }));
  return {
    path: "/",
    scores,
    metrics: {
      fcpMs: metric("first-contentful-paint"),
      lcpMs: metric("largest-contentful-paint"),
      cls: metric("cumulative-layout-shift"),
      tbtMs: metric("total-blocking-time"),
      speedIndexMs: metric("speed-index"),
    },
    failedAudits,
  };
}

export function thresholdFailures(summary) {
  return Object.entries(thresholds)
    .filter(([key, threshold]) => (summary.scores[key] ?? 0) < threshold * 100)
    .map(([key, threshold]) => `${key} ${summary.scores[key] ?? 0} < ${threshold * 100}`);
}

export async function writeSummary(path, summary) {
  await writeFile(path, `${JSON.stringify([summary], null, 2)}\n`, "utf8");
}
