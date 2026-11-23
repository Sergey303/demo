# Edge labs — second parallel Codex CLI wave: independent acceptance

**Date:** 2026-11-23. **Repository:** `Sergey303/demo`. **Merged base:** `2360467` (first wave). Three independent Codex CLI agents executed in separate clean Git worktrees and touched only their assigned project subtrees. No original Alice changes were touched.

## What changed

| Workstream | Runnable results | Verification boundary |
| --- | --- | --- |
| **EdgeAI (EAI-05–EAI-08)** | Synthetic image/stripe classifier with PGM input; sensor predictive-maintenance threshold with time-separated holdout; Python socket-audit offline inference check; same-fixture deterministic timing/quality comparison | Actual *local Python* runs and synthetic fixtures. No real industrial image/sensor data, calibrated detection guarantees or OS-enforced network isolation |
| **Cloudflare** | Safe request-guard Worker, fixed GET health route, generated request ID, sanitized origin request, upstream redirects forbidden, bounded timeout to 504 | Five local Node tests only. **No Cloudflare deployment, provider rate-limit/WAF configuration, DNS or L3/L4 protection** |
| **EdgeCenter + Yandex Cloud** | Strict vendor-neutral offline JSON staging-intent schemas and local validators for TLS, origin shielding, WAF/rate-limit policy, caching, metadata-only logs and rollback | Six tests per provider in pinned `jsonschema==4.23.0` venv. **Not** actual provider API/Terraform capability, entitlement or staging proof |
| **EIS live HTTP → offline advice** | `run_http.py`: two bounded localhost probe phases against real ASP.NET Core, emits actual HTTP status and latency + separate rule/advisory interpretations | Opt-in real HTTP test and negative tests. `429` is **temporary rate limiting**, not WAF hard block; 503 remains dependency unavailable. No online AI scoring inside ASP.NET Core |

## Full merged independent verification

| Non-overlapping test suite | Passed |
| --- | ---: |
| BGP simulator | 6 |
| Anycast simulator | 6 |
| Rules-only anomaly evaluation | 7 |
| Policy replay | 10 |
| Safe loopback HTTP probe | 6 |
| Synthetic EdgeAI local examples | 5 |
| Cloudflare Worker | 5 |
| EdgeCenter offline contract | 6 |
| Yandex Cloud offline contract | 6 |
| Real ASP.NET Core/Redis, incl. fail-closed and recovery | 14 |
| EIS offline orchestrator + opt-in actual HTTP experiment | 26 |
| Native CPU ONNX feature/model tests | 11 |
| ONNX-assisted policy integration (same merged revision) | 3 |
| **Total** | **111** |

**All 111 tests passed locally in the merged source worktree.** .NET 10 build: **0 warnings and 0 errors**. Redis tests used an isolated disposable Redis 7 loopback container. ONNX used Python 3.12 pinned NumPy/ONNX/ONNX Runtime in an isolated venv; inference is actual native CPU execution on a *synthetic-trained* model. No real security-provider services were called. GitHub Actions completion is a separate acceptance gate; the local test results alone do not prove a green CI run.

### Reproduce core behavior

```bash
# One-command offline orchestration, always simulated
python3 -B EdgeIntegratedScenarios/run.py
python3 -B EdgeIntegratedScenarios/task_inventory.py --check

# Bounded local live HTTP/Redis tests — Docker required for Redis
EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1 \
  python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
RUN_EDGE_HTTP_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v

# Cloudflare: Node testing without account
node --test EdgeNetworkSecurity/implementations/cloudflare/workers/request-guard/worker.test.mjs

# RU provider contracts: install exact requirements in an isolated environment
python3 -m pip install -r EdgeNetworkSecurity/implementations/edgecenter-ru/contract/requirements.txt
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/edgecenter-ru/contract -p test_contract.py -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/yandex-cloud/contract -p test_contract.py -v

# Actual ONNX: install packages in a venv, generate the model, run tests
python3 -m pip install -r EdgeAI/implementations/onnx-local/requirements.txt
python3 -B EdgeAI/implementations/onnx-local/build_model.py
python3 -B -m unittest discover -s EdgeAI/implementations/onnx-local/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/onnx-tests -v
```

The `EDGE_REDIS_NETWORK_CONTAINER=rdc-project` variable applies **only** inside the nested RDC container where Docker port-publishing uses another namespace. On a normal Docker host omit it. All local traffic must remain on loopback, at most 10 RPS and 60s per controlled scenario.

## Observed actual HTTP evidence

[Recorded JSON](EVIDENCE-HTTP-ADVICE.json) contains 4 HTTP **200**, 6 **429**, and 6 **503** responses across two loopback phases (0 transport errors). The corresponding policy advice is **offline and simulated**, never changing real API enforcement. In particular:
- 200 = allowed HTTP request; advisory scorer may mark `observe`;
- 429 = enforced rate-limit response, retained as `rate_limited` (NOT permanent WAF `block`);
- 503 = quota backend unavailable, retained as `unavailable`.

No real user traffic or attack was generated.

## Remaining work

The generated [canonical task inventory](TASK-INVENTORY.md) has **18 numbered work areas and 36 deduplicated explicit open follow-ups**. All the local baseline portions of EAI-05 through EAI-08 are now implemented. Five work areas (EAI-03, EAI-04, ENS-05, ENS-06, ENS-07) remain **provider-blocked** pending accounts, rights, supported API/entitlements and approved staging. Redis TLS/ACL/primary failover, shared distributed concurrency, hard inference resource sandbox, independently sourced datasets, runtime API scoring (not offline advice) and measured provider behavior are NOT complete.

No existing project has been production deployed. This evidence is limited to tested local implementations and authored synthetic inputs.
