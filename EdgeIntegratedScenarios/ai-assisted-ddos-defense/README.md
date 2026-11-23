# AI-assisted DDoS defense — offline synthetic replay

**Implemented (local and rules-only):** `policy.py` permits an anomaly signal to upgrade `allow` to `observe`, never to autonomous `block`; deterministic `block` remains authoritative. `replay.py` loads the explicit EdgeAI baseline and compares the same **synthetic labelled** rows with and without advisory scoring. When inference fails, the deterministic rule takes over.

## Reproduce

From the repository root:

```bash
python3 EdgeIntegratedScenarios/ai-assisted-ddos-defense/replay.py
python3 -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v
```

Reports include independent confusion matrices for **flagging** (`observe` OR `block`), not actual security blocks. `hard_blocked_benign` counts deterministic rule blocks separately. The synthetic fixture intentionally demonstrates both higher detection and more false positives when AI advice enables observation. `status=simulated` is always present. No HTTP requests are made.

## Limits / TODO

- No WAF/CDN/provider SDK, no real model, no live traffic, no replay of recorded user data.
- TODO: versioned transport contracts, explicit simulated model latency/timeout/retries, immutable policy audit, negative tests for signed updates, real holdout corpus with provenance, per-provider staged integration and measured observability.
- See [TASK.md](TASK.md) and [global execution plan](../EXECUTION_PLAN.md).
