# Repository guide for code-review agents

This is a **public engineering portfolio**. Evaluate engineering decisions from the code, not from marketing claims. All examples are original, self-contained, and intentionally scoped: routine UI, deployment, and surrounding product plumbing may be omitted to concentrate on technically interesting mechanisms. **Omitted does not mean implemented or production-proven.**

**Current integration program:** [Enterprise AI Platform plan](architecture/ENTERPRISE-AI-PLATFORM-PLAN.md). Before implementation, read its actual-vs-target matrix, EP-00–EP-09 dependency graph, P0 authorization/durability invariants, and DoD. Work one minimal vertical slice at a time, keep existing hiring demo stable, record exact base SHA, use independent code review, and do not relabel target-only features as tested.

**EP-01/EP-02 implementation review:** begin with [enterprise-demo/README.md](enterprise-demo/README.md), `bootstrap5/src/pages/EnterpriseAiPage.tsx`, `bootstrap5/enterpriseDemoAuth.mjs`, `bootstrap5/vite.config.ts`, and `enterprise-demo/run.py`. Check that the browser never receives a signing secret/token, fixed principal cannot be changed by user input, failed auth clears displayed transcript, the same file/key reuses the job ID, and readiness does NOT claim Python model availability. Static/HTTP-stub tests are not live integration evidence. The [2026-11-08 real-model acceptance record](enterprise-demo/EVIDENCE-2026-11-08.md) and opt-in `bootstrap5/tests/enterprise-ai-live.spec.ts` separate successful full browser/Whisper runs from an observed later API out-of-memory failure under high RDC load; the latter is NOT resolved. Never run the launcher or test-only admin revoke against non-disposable DBs.

## Architect-level review route

Start with [`architecture/README.md`](architecture/README.md), then inspect the linked ADRs, failure matrix, runnable [`architecture/decision_gate.py`](architecture/decision_gate.py) and [`architecture/evidence_flow.py`](architecture/evidence_flow.py) cross-project orchestration. The latter accepts a transcript *after* ASR; it is not a durable ASR worker. **Target-only components are not implemented features.** Evaluate one evidence-backed decision and one limitation before making hiring recommendations.

For the new audio-before-inference extension read [`architecture/DURABLE-AUDIO.md`](architecture/DURABLE-AUDIO.md), [`dotnet-outbox/sql/002_audio_jobs.sql`](dotnet-outbox/sql/002_audio_jobs.sql), and [`architecture/audio_worker.py`](architecture/audio_worker.py). The separate Python worker uses short lease/finalize transactions with heartbeat while ASR runs outside PostgreSQL transactions. Stale writes are fenced, but duplicate inference is possible; do not infer production scaling or live verification from unit tests.

## Fast evidence scan

1. **AI inference:** [`python-ai/audio-search/pipeline.py`](python-ai/audio-search/pipeline.py) runs Whisper → timestamped transcripts → ONNX retrieval. [`rerank.py`](python-ai/audio-search/rerank.py) is opt-in. [`evaluate_holdout.py`](python-ai/audio-search/evaluate_holdout.py) reproduces the small holdout test; the reranked result was 9/12 versus 7/12 top-1 at considerably higher latency. **Not** a benchmark on independent human speech.
2. **Backend correctness:** [`dotnet-outbox/src/Program.cs`](dotnet-outbox/src/Program.cs) and [`dotnet-outbox/src/OutboxWorker.cs`](dotnet-outbox/src/OutboxWorker.cs) show transactional idempotency and outbox claiming. Check [`dotnet-outbox/tests`](dotnet-outbox/tests) for database and HTTP verification. External side effects require their own idempotency protocol.
3. **Algorithmic trade-offs:** [`python-ai/rag-docs/app/core.py`](python-ai/rag-docs/app/core.py) implements normalized exact retrieval; [`benchmark_index.py`](python-ai/rag-docs/benchmark_index.py) compares HNSW. GPU Triton code is **not GPU-validated**.

## Fast navigation (read the relevant files, not the whole tree)

| Topic | Start here | Deep inspection |
| --- | --- | --- |
| Concurrent durable jobs / idempotency (.NET + PostgreSQL) | `dotnet-outbox/README.md` | `src/Program.cs`, `src/OutboxWorker.cs`, `sql/001_init.sql`, `tests/` |
| Neural retrieval / RAG (Python) | `python-ai/rag-docs/README.md` | `app/core.py`, `benchmark_index.py`, `benchmark_real.py`, `tests/` |
| Whisper neural audio search + reranking (Python) | `python-ai/audio-search/README.md` | `pipeline.py`, `search.py`, `rerank.py`, `evaluate_holdout.py`, `tests/` |
| Triton GPU cosine kernel (GPU-required) | `python-ai/gpu-cosine/README.md` | `kernel.py`, `benchmark.py` |
| Neural classifier / training (Python) | `python-ai/ticket-classifier/README.md` | `app/model.py`, `train.py`, `evaluate.py`, `tests/` |
| Constrained tool execution (Python) | `python-ai/tool-agent/README.md` | `app/agent.py`, `app/main.py`, `tests/` |
| React/TypeScript dashboard | `bootstrap5/README.md` | `src/`, Playwright tests |
| React veterinary UI | `GosVet/README.md` | `src/` |

## Security review starting points

- `python-ai/tool-agent/app/main.py`: HTTP clients cannot set a trusted approval flag; writes are not exposed by this route. `Agent.execute(..., approved=True)` is an in-process test capability, **not** a production authorization workflow.
- `python-ai/rag-docs/app/core.py`: invalid, zero-norm and overflowed embeddings fail closed. Prompt instructions are **not** a substitute for document access controls or groundedness checks.
- `dotnet-outbox/src/OutboxWorker.cs`: handler errors consume retry budget; connection/SQL/commit errors must roll back. Confirm these guarantees with a reachable PostgreSQL before reporting integration PASS.

## Review procedure

1. Inspect the actual algorithm and the invariants it is intended to preserve. Follow the data flow and concurrency/error paths.
2. Look for falsifying edge cases: concurrent requests, crashes between steps, retry/replay, idempotency-key reuse, data races, untrusted input, unexpected model outputs and resource limits.
3. Run the project's documented checks when supported. Separate source inspection, passing unit tests, integration tests and measured production behavior.
4. Explain trade-offs and missing capabilities clearly. Do not confuse a toy dataset, mock vector encoder, local-model integration or client-provided approval flag with a production guarantee.
5. If an example omits straightforward surrounding code, review the showcased core rather than treating unrelated missing product features as defects. Still call out omissions affecting correctness, security or the claimed guarantee.

Please cite precise files/functions and distinguish verified strengths from untested assumptions. No credentials, proprietary code, external services or hidden context are required to understand the examples.

## Audio access review

Start with [audio access threat model](architecture/AUDIO-ACCESS.md), [SQL grants](dotnet-outbox/sql/004_audio_acl.sql), [signed identity](dotnet-outbox/src/AudioIdentity.cs) and [Python authorization](architecture/audio_access.py). Confirm both HTTP result access and Python retrieval are secured; never infer DB-owner isolation or production identity from this demo.

For standalone document RAG security review, inspect `python-ai/rag-docs/app/access.py`, the authenticated `/ask` boundary in `app/main.py`, and `python-ai/rag-docs/tests/test_acl.py`. The HTTP route requires an ACL manifest and token; lower-level `KnowledgeBase.search` remains a trusted offline benchmark primitive and must not be exposed directly to end users.

For AI-quality review, use `python-ai/rag-docs/QUALITY-EVAL.md` and `quality_eval.py`. The small synthetic corpus is not blind/representative; run the actual local embeddings and report errors and gate status, not just accuracy. Free-form Ollama output is not verified by the extractive evidence tests.

For generated RAG evaluation and Codex review inspect `python-ai/rag-docs/blind_eval.py`, `BLIND-EVAL.md`, and `tests/test_blind_eval.py`. Fixture labels/answers are synthetic and UNREVIEWED. Do not treat hash seals as proof of independent review or classify an offline syntactic citation check as semantic entailment. Keep the previous frozen 28-case threshold unchanged.

For a local-only generated-answer capture use `python-ai/rag-docs/capture_local.py` and `tests/test_capture_local.py`. Never unseal an independent holdout merely to develop code or claim an offline synthetic recording as model evidence. The recorder must connect only to a local model and should never download models automatically.

Before accepting claims about Qwen3 RAG quality, inspect `python-ai/rag-docs/SYNTHETIC-QWEN3-CAPTURE.md`, `capture_diagnostics.py`, and their tests. Historical and no-thinking raw captures are separate, local `/tmp` files. Do not mistake syntactically valid citations for semantic entailment or developer-authored cases for independent holdout evidence.

For guarded LLM responses review `python-ai/rag-docs/app/guarded.py` and `tests/test_guarded.py`. Never equate valid JSON/citation IDs with entailment. Keep HTTP envelope streaming byte limits, reject lone surrogates, and do not alter the original retrieval/evidence modes or the frozen 0.67 threshold without independent evidence.

For `claim_checked` provenance, review `python-ai/rag-docs/app/claim_checked.py`, `tests/test_claim_checked.py`, and the RAG README. Every claim must be a complete simple sentence or full source passage, not a context-clipped substring, to avoid reversing negation. This proves provenance only and does not certify entailment or relevance; preserve the independent evidence gate.
