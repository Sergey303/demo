# Architecture management portfolio — decisions, not technology inventory

Decision pack, 2026-11-24. This is a proposed management operating model for a small team delivering a confidential enterprise evidence assistant, not historical management results, market prices or production SLA. It connects real repository evidence to prioritization, cost and release gates.

## Executive decision

Fund the reliable, access-controlled search and job foundation before expanding AI features. Preserve human review of unsupported answers; release identity BFF in bounded slices. Defer custom distributed monitoring, ANN, GPU and broker unless measured need justifies ownership. Prefer the simplest architecture that meets security and availability constraints, not a universal preference for monoliths or microservices.

- [EP-12 release decision](EP12-RELEASE-DECISION.md): staged rollout, evidence and blockers.
- [TCO model](tco.py) and [four executable tests](test_tco.py): compare local, managed and hybrid, including operational labor and capacity steps.
- [Existing ADRs](../adr/001-outbox-vs-broker.md), [AI inference decision](../adr/002-local-models-vs-managed-ai.md), [retrieval decision](../adr/003-retrieval-quality-cost.md).

## Economic decision: generation path (illustrative scenario, RUB/month)

Assume 2,000 input / 250 output tokens per request, hypothetical prices 300/900 RUB per million, managed overhead 0.05 RUB/request, 3,000 RUB/month managed integration, 4 engineer-hours/month. Local worker 16,000 RUB/month, hypothetical 60,000 admitted requests/month at a validated target workload (capacity not measured), 12 engineer-hours/month plus 2 hours per additional worker, 0.12 RUB marginal cost/request. Fully loaded engineering rate 2,500 RUB/hour. Hybrid needs both stacks and 4 extra hours of policy governance. Shared infrastructure and labor are omitted only if identical between options; backups, storage, egress, HA spare capacity, taxes, model quality, incident costs and one-off migration must be priced before commitment. No real tariff or throughput claim.

| Monthly requests | Local | Managed if all data eligible | Hybrid, 20% local-only |
|---:|---:|---:|---:|
| 1,000 | 46,120 | 13,875 | 69,724 |
| 10,000 | 47,200 | 21,750 | 76,240 |
| 50,000 | 52,000 | 56,750 | 105,200 |
| 100,000 | 79,000 (2 workers) | 100,500 | 141,400 |

Managed marginal cost = 0.875 RUB/request. First-worker crossover = 43,709 requests/month given these assumptions, not a universal threshold. At worker capacity, local cost jumps; never linearly extrapolate throughput. The hybrid scenario is more expensive because fixed costs duplicate, not because hybrid is inherently inferior. With any local-only data, all-managed is inadmissible; the managed column is counterfactual, not a choice. Unknown classification routes to local or safe refusal; never fall back to managed without permission.

Decision for an initial pilot: local-only for restricted data, no large model on shared critical host; prioritize retrieval/CPU and explicit abstention. If all data eligible and volumes small, compare compliant managed pilot with local service. Measure quality on separate holdout, p95, peak memory, queue age, accepted good answers per RUB, retry rate and engineering hours. A cheaper wrong answer is not savings. Model switch requires policy review and measured benefit; start with cap, admission control and independent health signal. Revisit if three months' measured forecast crosses capacity-adjusted TCO, or quality/latency fails. Use same workload, count failures in denominator.

Run:
```sh
cd architecture/management
python3 -B -m unittest -v test_tco.py
python3 -B tco.py
python3 -B tco.py --private-fraction 0
```

## Technology ownership and exit conditions

| Decision | Why now | Trigger to invest more | Rollback / exit |
|---|---|---|---|
| PostgreSQL outbox vs broker | One durable commit and fewer ops components; existing real SQL tests | Measured queue age/lock/I/O breaches agreed SLO under representative traffic; independent fanout or retention needs | Dual-run relay with dedup and replay; retain source of truth until verified |
| Exact retrieval vs ANN/rerank | Auditable baseline; small authored audio experiment improves 7/12 to 9/12 at higher historical upper-middle latency | Blind paired recall/answer quality improvement and p95 within budget, including grant changes | Keep exact authorized fallback; remove optional reranker |
| Separate BFF vs custom IAM everywhere | Central cookie/session/ingress boundary and revocation evidence; avoid repeating auth in business apps | Real supported provider plus current main integration CI; only add service split if independent ownership/security warrants | Config-controlled rollout; no unauthenticated fallback |
| Managed observability vs bespoke monitor | Buy/reuse standard collector and alerting for general metrics; keep custom signed topology prototype only for explicit trust gaps | Demonstrated missing capability after collector proof, quantified maintenance and threat model | Keep standard metrics; UNKNOWN on missing trust; disable optional exporter |
| CPU vs GPU | Avoid fixed GPU idle cost and local memory pressure | Representative queue/latency and quality measurement, resource isolation, measured utilization and total cost | Budgeted CPU/managed eligible fallback; no confidential data leakage |

## Technical debt and 90-day delivery proposal

Priority is risk-adjusted value and cost of delay, not number of TODOs. Security boundary/integrity failures and red CI block a release; production claims require evidence. For other work score impact (0–3), urgency (0–3), risk reduction (0–3), divide by estimated engineer-days (range); record rationale, confidence, dependency and reassess weekly. Never let scoring override a hard security gate.

Illustrative capacity: two engineers, 13 weeks x 5 days x 2 = 130 person-days gross; reserve 30 for support/review/leave, 100 planned. Allocate 50 to customer-facing core and acceptance, 25 to debt/security/CI, 15 to observability/operations, 10 to measured experiments. No assigned people or actual delivery history implied.

| Window | Deliverable | Exit evidence |
|---|---|---|
| Days 1–30 | Green CI, stable authorized retrieval, bounded resources, EP-12A–G release review | Full CI current commit, rollback runbook, no auth regressions; don't merge unreviewed EP12U |
| Days 31–60 | One complete pilot business flow, calibrated refusal and quality evaluation | Independent labels + access/negative tests; operator time and error counts; no real deployment claim without acceptance |
| Days 61–90 | Cost/quality capacity decision and monitored pilot | Measured cost per accepted answer, privacy approval, recovery drill, budget alarm; otherwise stop or reduce scope |

Debt register (estimate ranges are proposed, not logged effort):

| Item | Risk and action | Owner role | Days |
|---|---|---|---:|
| CI dependency drift | Test/runtime dependency separation, CPU-only package strategy, lock/supply-chain policy; six CI jobs green before closing | Build owner | 1–3 |
| EP-12 divergent branch | Stage A–G, preserve main; review U artifacts separately | Platform lead + security reviewer | 3–7 |
| RAG semantic errors | Independent dataset, abstention policy, freeze model; current synthetic gate not release quality | AI lead + domain reviewer | 5–15 |
| Resource limits / Alice / local inference | Bound process memory, admission and deadline; kill/cleanup acceptance | Platform owner | 2–5 |
| Generated apps | Regression at generator boundary and update consumers; refresh fix already evidenced | App platform owner | 2–4 |
| Real business workflow | End-to-end acceptance, validation and recovery | Product owner + engineer | 3–8 |

## Risk and operational governance

| Risk | Prevention / detection | Stop or rollback condition |
|---|---|---|
| Confidential data or cross-tenant leak | Grant-first retrieval, independent auth/security tests, no external inference by default | Any confirmed leak: isolate path, revoke access, incident review |
| Unsupported AI output | Evidence and abstention, independent adjudication, explicit review queue | Any unsupported answer on critical acceptance case; keep AI advisory only |
| Queue or resource exhaustion | Bounded concurrency, timeout and memory; disk/queue budget; avoid huge CUDA dependency downloads on CPU jobs | Over budget or missing metrics: reject new optional work; preserve accepted work |
| Unrecoverable identity/session outage | Disposable migration, restore rehearsal, secure key preservation, fail closed | Failed revocation or rollback rehearsal; no insecure fallback |
| Silent monitoring false healthy | Explicit UNKNOWN; bounded tags; independent desired/actual source | Missing/expired signed authority or telemetry; do not advertise healthy |
| Delivery cost overrun | Budget vs actual hours/cloud bill, track unplanned toil | Forecast breaches approved budget: cut optional features before adding infra |

Proposed pilot targets, to be validated with stakeholders: 100% authorized negative cases denied; zero critical unsupported claims in the agreed test set (not proof of zero production risk); 100% restore/drill acceptance; no red required CI; service availability, latency and recovery objectives negotiated from business impact and measured baseline. Weekly review: CI pass rate, lead time/change failure, recovery duration, queue age, infrastructure spend, engineering toil, quality and coverage. Owners are roles, not invented employees. Separate change approval and evidence owner for production security decisions.
