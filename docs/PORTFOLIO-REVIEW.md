# Portfolio verification and improvement register

Baseline: public main `ab1ecaf`, 2026-11-24. This is a technical backlog, not a claim of commercial deployment or a personnel assessment. Three separate review perspectives (backend/architecture, AI, full-stack) examined source excerpts, then key observations were cross-checked against the repository. No sustained load testing is required for this iteration.

## Evidence-first improvement order

| Priority | Scope | Acceptance |
| --- | --- | --- |
| P0-01 | Public CI and generated task inventory | Regenerate inventory; local --check passes; verify subsequent public Edge CI separately. Historical failed run [45320393497](https://github.com/Sergey303/demo/actions/runs/45320393497). |
| P0-02 | Review entrypoints | Reconcile EP-10/11 main status, EP-12 branch boundary, Redis v2 and inline ONNX; pass review-link check. |
| P0-03 | AppForge authentication | Reproduce concurrent refresh on disposable PostgreSQL; exactly one refresh succeeds; atomic old-session consumption and new-session issuance; propagate correction to generator upstream rather than silently diverge generated code. |
| P0-04 | AI quality | Freeze a separate evaluation set; independently annotate sufficient/insufficient evidence, negation and refusal; report failures without tuning on holdout. Do not claim independent human review if unavailable. |
| P1-01 | Tool Agent / Alice | Bound file/pipe reading before allocation; verify negative resource-limit cases and child process cleanup. |
| P1-02 | Audio Search / frontend | Empty hits are a miss; standard median; validate finite ordered audio ranges and integral document offsets with negative tests. |
| P1-03 | GosVet / generated admin | Versioned persisted-state validation; one complete business journey including invalid input and recovery, plus related-entity CRUD acceptance. |
| P1-04 | Backend / Enterprise | Explicit text-job access boundary; distinguish model readiness from database readiness; disclose capped retrieval coverage; test process-tree cleanup. |
| P1-05 | EP-12 | Review separate branch and acceptance artifacts, publish only coherent validated slices, do not merge solely to claim OIDC/operability. |
| P2 | Edge / ML depth | Shared concurrency, production ingress, external provider validation, independent anomaly quality data, classifier stratification, GPU execution where supported. Scope by target role. |

## Project coverage and evidence boundaries

| Project | Evidence / next check |
| --- | --- |
| [Reliable Jobs](../dotnet-outbox/README.md) | PostgreSQL transactions and outbox; review text-job UUID access and crash/finalize boundaries. |
| [Architecture](../architecture/README.md) | Grant-first retrieval, ADRs, MCP, EP-10/11 in main; EP-12u is separate (45 branch-only commits at baseline). |
| [Enterprise AI](../enterprise-demo/README.md) | Real local model/DB/browser evidence; semantic correctness and model readiness separate. |
| [Hiring Demo](../hiring-demo/README.md) | Real HTTP/DB demonstration; launcher cleanup is a candidate verification task. |
| [Bootstrap dashboard](../bootstrap5/README.md) | React/browser contracts; strengthen range validation. |
| [GosVet](../GosVet/README.md) | Portable clinical workflow prototype; storage compatibility and end-to-end business cases. |
| [AppForge sample](../appforge-admin/README.md) | Generated EF/React and Customer CRUD evidence; refresh-race hypothesis from AuthTokenService.RefreshAsync, needs integration reproduction. |
| [Alice](../alice-voice-gpt/README.md) | Local webhook/CLI prototype; stdout/stderr read-to-end is a resource-bound weakness, real voice acceptance separate. |
| [Audio Search](../python-ai/audio-search/README.md) | Small authored reranking evaluation; evaluate_holdout.check assumes nonempty hits and uses upper middle sample as median. |
| [RAG](../python-ai/rag-docs/README.md) | Provenance and abstention; independent semantic labels absent. |
| [Ticket classifier](../python-ai/ticket-classifier/README.md) | Training and inference code; split not stratified, historical CI issues need current verification. |
| [GPU cosine](../python-ai/gpu-cosine/README.md) | Triton source; no hardware evidence, validate matching CUDA devices. |
| [Tool Agent](../python-ai/tool-agent/README.md) | Explicit restricted tools; read_text currently reads entire file before truncation. |
| [Edge Network](../EdgeNetworkSecurity/README.md) | Local Redis v2 and provider-specific offline evidence; not deployed anti-DDoS. |
| [Edge AI](../EdgeAI/README.md) | Real ONNX runtime; artificial labels not real-world detection quality. |
| [Edge scenarios](../EdgeIntegratedScenarios/README.md) | Deterministic fallback and local HTTP integration; small authored evaluation. |

The backlog is ordered by expected evidence/correctness improvement relative to effort, not by an invented probability of hiring. Historical evidence remains immutable; new tests must record exact base, conditions, results and limitations.
