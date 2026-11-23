# Execution plan for Codex CLI — three edge projects

All work belongs in **Sergey303/demo**, not KnowledgePilot. Follow each project's AGENTS.md and the TASK.md next to the code it describes.

## Current verified scope
- Implemented: [BGP replay](../EdgeNetworkSecurity/simulator/bgp/README.md), [Anycast failover simulation](../EdgeNetworkSecurity/simulator/anycast/README.md), [synthetic quality evaluation](../EdgeAI/scenarios/traffic-anomaly-detection/README.md), [policy + decision replay](ai-assisted-ddos-defense/README.md).
- **51 tests observed passing locally across the test groups**: 37 simulator/policy, 6 bounded loopback probe, 4 original real HTTP, 4 new Redis tests. See [HTTP evidence](EVIDENCE-2026-11-23-HTTP.md) and [Redis fault/concurrency evidence](EVIDENCE-2026-11-23-REDIS.md). The latest direct-GitHub test-only boundary alignment still requires CI confirmation.
- Not implemented: provider-backed Anycast/BGP, trained ML inference, CDN/WAF/IaC deployment, Redis Cluster failover or production latency/availability/cost benchmarks. **Implemented:** real loopback L7 HTTP 429/503, bounded probe and an optional **atomic shared Redis fixed-window quota across two API replicas**, including outage/recovery tests. No distributed concurrency limit. Local simulations and quotas are **not** provider-level DDoS protection.

## Dependency-oriented work order

| Order | Scope | Task | Deliverable / gate |
| --- | --- | --- | --- |
| 1 | ENS | [ENS-01](../EdgeNetworkSecurity/simulator/bgp/TASK.md) | **DONE (offline)**: bounded JSON replay + negative tests; AS graph is further TODO |
| 2 | ENS | [ENS-02](../EdgeNetworkSecurity/simulator/anycast/TASK.md) | **DONE (offline)**: site outage/routing, overload and interrupted sessions |
| 3 | EAI | [EAI-01](../EdgeAI/scenarios/traffic-anomaly-detection/TASK.md) | **PARTIAL**: labelled synthetic quality evaluation; trained scorer TODO |
| 4 | EIS | [EIS-01](ai-assisted-ddos-defense/TASK.md) | **PARTIAL**: offline replay, bounded synthetic audit and FPR/FNR; provider integration TODO |
| 5 | ENS | [ENS-04](../EdgeNetworkSecurity/implementations/local/TASK.md) | **PARTIAL / locally verified**: ASP.NET Core 429/503, Redis-time atomic quota across replicas, cold/warm dependency outages and recovery; production proxy/Redis failover TODO |
| 6 | ENS | [ENS-03](../EdgeNetworkSecurity/shared/traffic-generator/TASK.md) | **PARTIAL / locally verified**: loopback generator, redirect protection, bounds and real 429 test; burst profiles TODO |
| 7 | EAI | [EAI-02](../EdgeAI/implementations/onnx-local/TASK.md) | actual offline ONNX smoke with permitted model |
| 8 | EAI | [EAI-08](../EdgeAI/benchmarks/TASK.md) | repeatable quality/latency report |
| 9 | ENS | [ENS-05 Cloudflare](../EdgeNetworkSecurity/implementations/cloudflare/TASK.md) | validated staging plans and Worker tests |
| 10 | ENS | [ENS-06 EdgeCenter](../EdgeNetworkSecurity/implementations/edgecenter-ru/TASK.md) | supported API/capability evidence |
| 11 | ENS | [ENS-07 Yandex](../EdgeNetworkSecurity/implementations/yandex-cloud/TASK.md) | staged IaC and configuration tests |
| 12 | EAI | [EAI-03](../EdgeAI/implementations/cloudflare-workers-ai/TASK.md), [EAI-04](../EdgeAI/implementations/yandex-cloud/TASK.md) | inference adapters, comparison and evidence |
| 13 | EIS | [EIS-00](TASK.md) | documented combined one-command demonstration |

Additional independent scenarios: [images](../EdgeAI/scenarios/image-inference/TASK.md), [predictive maintenance](../EdgeAI/scenarios/predictive-maintenance/TASK.md), [offline mode](../EdgeAI/scenarios/offline-inference/TASK.md).

## Review gates for every Codex increment
1. Record start SHA, status, touched paths and exact commands.
2. Run offline regression before and after; add a negative test for each security decision or failure path.
3. Separate *implemented*, *tested locally*, *simulated* and *provider-verified*. No deployed label merely because Terraform files exist.
4. Do not write credentials, publish cloud infrastructure, run public load tests, or change unrelated portfolio apps.
5. Leave bounded, precise TODOs when an external dependency or larger implementation remains.
