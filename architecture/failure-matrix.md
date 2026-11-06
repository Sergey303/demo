# Failure modes, trust boundaries and verification matrix

The **scope** is the [target platform](README.md), not a claim that all features exist today. Evidence levels: **TESTED** = executed code path; **PRIMITIVE** = isolated database behavior tested, not whole-system crash; **DESIGN** = requirement only; **LIMITATION** = known unfinished control.

| Scenario / abuse | Required system behavior | Status and proof | Next falsifying test |
| --- | --- | --- | --- |
| Duplicate POST (same key+payload) | One job ID and one outbox event | **TESTED** [HTTP smoke](../dotnet-outbox/tests/smoke.py) | Run across separate API replicas |
| Same key, different payload | Reject with 409, no extra job | **TESTED** [Program.cs](../dotnet-outbox/src/Program.cs) / smoke | Concurrent mixed-payload submission |
| Worker transaction rollback while row locked | Claim reappears for competing worker | **PRIMITIVE** [xUnit PostgreSQL](../dotnet-outbox/tests/ConcurrencyIntegrationTests.cs) | Kill actual worker after claim, before commit |
| PostgreSQL disconnected mid-commit | Do not consume handler retry budget, preserve recoverable state | **DESIGN** based on [worker boundaries](../dotnet-outbox/src/OutboxWorker.cs) | Fault injection with connection termination |
| Handler fails five times | Mark failed; preserve diagnostic and stop automatic retry | **DESIGN** [retry implementation](../dotnet-outbox/src/OutboxWorker.cs); no injected handler failure test | Configurable failing handler + integration test |
| External webhook crashes after sending | Recipient dedup with stable idempotency key | **LIMITATION** no external delivery adapter | Crash/replay with fake receiver |
| Cross-project orchestration interrupted during ASR | No claim of durable ingestion: job is not accepted until transcript POST | **LIMITATION** [orchestration](evidence_flow.py); pre-acceptance boundary explicitly documented | Kill process during Whisper inference and verify no accepted job |
| Transcript post retries | Stable idempotency key from canonical transcript; same job ID on replay | **CONTRACT TEST** [test](tests/test_evidence_flow.py); live multi-service retry still unverified | Repeat actual audio + confirm one job row in PostgreSQL |
| Durable audio accepted before ASR | WAV bytes + outbox commit atomically, Python worker claims `kind=audio` | **LIVE TESTED (2026-11-07)** [API](../dotnet-outbox/src/Program.cs), [migration](../dotnet-outbox/sql/002_audio_jobs.sql), [AI worker](audio_worker.py) | Apply migration and run [live ASR smoke](live_audio_smoke.py) |
| Audio worker dies during inference | Lease expires without holding an inference-time DB lock; another worker reclaims; stale worker cannot finalize | **TESTED on PostgreSQL** [process termination and fencing](tests/test_audio_postgres.py) | Heartbeat and 4-worker/8-job concurrency now tested; next simulate network partition and model cancellation |
| Missing/silent audio | Return no invented transcript | **UNIT** injected silence [pipeline tests](../python-ai/audio-search/tests/test_pipeline.py) | Real silent/corrupted audio E2E |
| Wrongly ranked passage | Measure paired regressions and gate cost/quality | **TESTED** synthetic [holdout](../python-ai/audio-search/evaluate_holdout.py); [fitness gate](decision_gate.py) | Blind real speech, per-passage evidence metric |
| Unanswerable user query | Abstain rather than manufacture evidence | **LIMITATION** [known failure](../python-ai/audio-search/README.md) | Blind positive/negative labels; calibrate thresholds |
| Document access revoked | Neither embeddings nor cached results reveal revoked content | **DESIGN** no multi-tenant ACL | Revoke between index and response; invalidate cache |
| Prompt injection in retrieved document | Treat retrieved text as data, no tool writes or unauthorized disclosure | **PARTIAL** [prompt](../python-ai/rag-docs/app/core.py); no model attack eval | Adversarial source with injected instructions |
| Client sends `approved: true` to HTTP tool API | Reject field; no write | **TESTED** [HTTP TestClient](../python-ai/tool-agent/tests/test_agent.py) | Add authenticated server-side one-use approval flow |
| PII in inference logs | Minimize/redact and enforce retention | **DESIGN** no production audit pipeline | PII seed, trace log inspection, deletion test |
| Search dependency or DB down | Readiness is 503 (where implemented), no silent success | **PARTIAL** [Jobs /ready](../dotnet-outbox/src/Program.cs) happy-path checked | Kill DB and prove /ready transitions 503 |

**Production release gates absent here:** authenticated tenancy, PII classification and purge, model/eval registry, OpenTelemetry tracing, SLO monitoring and deployment rollback. Do not infer them from green unit tests.
