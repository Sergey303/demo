# RAG evidence quality: reproducible acceptance and failure analysis

**Goal:** Demonstrate a measurable *AI decision*, not a fabricated perfect RAG score.
This benchmark separates **retrieval source correctness**, **explicit abstention**,
**source-quote integrity**, and **authorization**. It never calls an LLM judge.
A top-ranked source is not necessarily a valid answer to the question.

## Runnable system feature

Authenticated `POST /ask` supports `{"question":"...","answer_mode":"evidence"}`.
The response returns an excerpt copied **verbatim** from an authorized source
and its filename citation, or the explicit statement
`Insufficient authorized evidence to answer.` with no sources/citations.
A server-owned cosine threshold (0.67) selects the two paths. Client requests
cannot lower the threshold; `generate=true` is disallowed in evidence mode.
The old free-form `generate=true` Ollama route remains a *separate unverified
generative mode* and must not be represented as grounded/certified.

The threshold detects low similarity, **not semantic entailment**. A highly
similar but incomplete or incorrect excerpt can still slip through. Extractive
mode guarantees only exact-copy provenance, not factual relevance.

## Run on actual local embeddings (CPU)

From the repository root:

```bash
cd python-ai/rag-docs
python -m pip install fastembed pytest fastapi httpx
OPENBLAS_NUM_THREADS=1 python quality_eval.py --output /tmp/rag-quality-report.json
python -m pytest -q tests/test_quality_eval.py tests/test_acl.py
```

For a conservative build/release gate, add `--enforce-gate`: it exits with
code **2** if ineligible. Do not put this synthetic evaluation into a production
deployment gate as the only evidence; it is a portfolio demonstration of the
*gate mechanism*. The evaluator also accepts an injected embedder for
deterministic contract tests.

Input files:
- [10 synthetic policy passages](eval/quality_corpus.json) — made for this test, not customer documents
- [28 authored questions/labels](eval/quality_cases.json) — 14 labeled answerable and 14 labeled negative or inaccessible
- [Tenant-scoped permission sets](eval/quality_acl.json) — used before retrieval, never added afterward
- [Executable evaluator](quality_eval.py), [unit/API tests](tests/test_quality_eval.py)

## Observed real ONNX run — 2026-11-07

Model: locally executed `BAAI/bge-small-en-v1.5` through `fastembed`,
default cosine threshold **0.67**. This is one small CPU run; no significance
intervals, independent user dataset or production latency SLO.

| Measure | Observed |
| --- | ---: |
| Labeled answerable cases | 14 |
| Correct authorized source excerpts | 13 / 14 |
| Answerable questions incorrectly refused | 0 / 14 |
| Answerable questions given wrong source | 1 / 14 |
| Labeled negative/unauthorized cases | 14 |
| Correct abstentions | 11 / 14 |
| Negative cases answered instead of abstained | 3 / 14 |
| Cross-tenant source disclosure | 0 |
| Nonverbatim source excerpts | 0 |
| Baseline false answers (no refusal) | 14 / 14 |
| False answers prevented by quote/refusal mode | 11 |
| Correct baseline source selections turned into refusals | 0 |

**Observed failure examples:** a warranty question was matched to refund policy;
questions about late-payment penalties and hotline ownership produced topical
but insufficient excerpts. The test asking whether a refund is possible after
100 days is **label-ambiguous**: the 14-day policy might be interpreted as an
implicit answer. We retain this label in the published first measurement,
rather than quietly relabeling it after seeing predictions.

**Quality gate: `NOT_ELIGIBLE`.** It reports
`unsupported_answers`, `wrong_evidence_source`, and
`insufficient_sample_size` (minimum 100 overall, at least 30 positive and 30 negative),
and `insufficient_abstention_recall` (minimum 95% negative rejection).
The gate also requires at least 90% correct-source answerability, so a system
that abstains on every question cannot pass. A passing policy would still require
independent review; it is not a statistical proof or production approval.

## What counts as a stronger next iteration?

1. Gather a genuinely **blind, representative, independently annotated** set
   including paraphrases, adversarially similar irrelevant passages, explicit
   unsupported questions, revocation, multilingual cases and conflicts between
   documents. Define answerability, citations and adjudication rules **before**
   running the model.
2. Use a separate development/calibration set to choose confidence/abstention
   policy and **freeze** it before scoring a sealed holdout; record model
   hash/version, corpus hashes and CPU configuration.
3. Evaluate **answer entailment** and faithfulness independently of literal
   quoting: human annotation (or a separately verified reference model) must
   decide whether a cited excerpt actually supports the requested conclusion.
4. Add p50/p95 latency, uncertain/rejected-case review and tests for stale
   authorization during long inference. Evaluate free-form Ollama output
   separately; this report makes no correctness claim about it.

This is intentionally a **failure-exposing** engineering benchmark and a
candidate screening demonstration, not a claim of best-in-class RAG.
