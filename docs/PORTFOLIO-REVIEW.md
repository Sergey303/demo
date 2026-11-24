# Portfolio verification and improvement register

Baseline: public main `ab1ecaf`, 2026-11-24. This is a technical backlog, not a claim of commercial deployment or a personnel assessment. Three separate review perspectives (backend/architecture, AI, full-stack) examined source excerpts, then key observations were cross-checked against the repository. No sustained load testing is required for this iteration.

## Evidence-first improvement order

| Priority | Scope | Acceptance |
| --- | --- | --- |
| P0-01 | Public CI and generated task inventory | **PASS**: inventory and four [Edge CI jobs](https://github.com/Sergey303/demo/actions/runs/45348790448) on f43d0a2; historical failed run [45320393497](https://github.com/Sergey303/demo/actions/runs/45320393497). |
| P0-02 | Review entrypoints | **PASS** on f43d0a2: reconciled EP-10/11, EP-12 boundary, Redis v2 and inline ONNX; review-link check passed. |
| P0-03 | AppForge authentication | **PASS**: reproduced two successful rotations; fixed to one winner, replay denial and rollback/retry on PostgreSQL. [Evidence](../appforge-admin/REFRESH-ROTATION.md); upstream AppForge b159c2fa published. |
| P0-04 | AI quality | **PARTIAL**: [finite-choice semantic contract](../python-ai/rag-docs/SEMANTIC-CONTRACT.md), 12 authored cases and five offline tests; live model run interrupted, independent human labels remain absent. |
| P1-01 | Tool Agent / Alice | **PARTIAL**: Tool Agent bounded descriptor-based reads, five offline tests PASS. Alice pipe limits and child process cleanup remain open. |
| P1-02 | Audio Search / frontend | **PASS (offline)**: standard median/empty hits (3 tests); shared React range validation (10 tests). Historical model timings not recalculated; full browser/build regression remains separate. |
| P1-03 | GosVet / generated admin | **PARTIAL**: GosVet versioned structural validation (3 offline tests PASS); full business journey and related-entity CRUD remain open. |
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
| [GosVet](../GosVet/README.md) | Portable clinical workflow prototype; versioned storage shape validation implemented; end-to-end business cases remain. |
| [AppForge sample](../appforge-admin/README.md) | Generated EF/React and Customer CRUD evidence; refresh race reproduced and fixed; [real PostgreSQL regression](../appforge-admin/REFRESH-ROTATION.md). |
| [Alice](../alice-voice-gpt/README.md) | Local webhook/CLI prototype; stdout/stderr read-to-end is a resource-bound weakness, real voice acceptance separate. |
| [Audio Search](../python-ai/audio-search/README.md) | Small authored reranking evaluation; empty result and standard median fixed; no new model measurement. |
| [RAG](../python-ai/rag-docs/README.md) | Provenance and abstention; independent semantic labels absent. |
| [Ticket classifier](../python-ai/ticket-classifier/README.md) | Training and inference code; split not stratified, historical CI issues need current verification. |
| [GPU cosine](../python-ai/gpu-cosine/README.md) | Triton source; no hardware evidence, validate matching CUDA devices. |
| [Tool Agent](../python-ai/tool-agent/README.md) | Explicit restricted tools; bounded regular-file prefix reads verified on Linux; listing and approved draft writes remain separate. |
| [Edge Network](../EdgeNetworkSecurity/README.md) | Local Redis v2 and provider-specific offline evidence; not deployed anti-DDoS. |
| [Edge AI](../EdgeAI/README.md) | Real ONNX runtime; artificial labels not real-world detection quality. |
| [Edge scenarios](../EdgeIntegratedScenarios/README.md) | Deterministic fallback and local HTTP integration; small authored evaluation. |

The backlog is ordered by expected evidence/correctness improvement relative to effort, not by an invented probability of hiring. Historical evidence remains immutable; new tests must record exact base, conditions, results and limitations.
