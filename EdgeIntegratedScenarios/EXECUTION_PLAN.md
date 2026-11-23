# Execution plan for Codex CLI — three edge projects

All work belongs in **Sergey303/demo**, not KnowledgePilot. Follow each project's AGENTS.md and the TASK.md next to the code it describes.

## Current verified scope
- Implemented: toy BGP best-path selection (`../EdgeNetworkSecurity/simulator/bgp/model.py`), heuristic anomaly baseline (`../EdgeAI/scenarios/traffic-anomaly-detection/baseline.py`), safety-first decision policy (`ai-assisted-ddos-defense/policy.py`).
- Offline tests: `python -m unittest discover -s EdgeIntegratedScenarios/tests -v` (8 tests run locally when authored).
- Not implemented: real Anycast, ML inference, CDN/WAF/IaC deployment, metrics/replay, full L7 API, real provider tests.

## Dependency-oriented work order

| Order | Scope | Task | Deliverable / gate |
| --- | --- | --- | --- |
| 1 | ENS | [ENS-01](../EdgeNetworkSecurity/simulator/bgp/TASK.md) | input schema + deterministic JSON replay, negative tests |
| 2 | ENS | [ENS-02](../EdgeNetworkSecurity/simulator/anycast/TASK.md) | site outage/routing and session failure simulation |
| 3 | EAI | [EAI-01](../EdgeAI/scenarios/traffic-anomaly-detection/TASK.md) | labelled synthetic fixtures, calibrated vs uncalibrated distinction |
| 4 | EIS | [EIS-01](ai-assisted-ddos-defense/TASK.md) | offline replay, policy audit and false-positive/negative evaluation |
| 5 | ENS | [ENS-04](../EdgeNetworkSecurity/implementations/local/TASK.md) | localhost-only actual HTTP 429 and recovery |
| 6 | ENS | [ENS-03](../EdgeNetworkSecurity/shared/traffic-generator/TASK.md) | bounded loopback generator |
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
