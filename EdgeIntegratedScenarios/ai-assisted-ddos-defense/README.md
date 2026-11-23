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

- No WAF/CDN/provider SDK, no real customer model, no live traffic, no replay of recorded user data. The optional ONNX path executes an authored synthetic-trained model, not a validated security model.
- TODO: versioned transport contracts, explicit simulated model latency/timeout/retries, immutable policy audit, negative tests for signed updates, real holdout corpus with provenance, per-provider staged integration and measured observability.
- See [TASK.md](TASK.md) and [global execution plan](../EXECUTION_PLAN.md).

## Optional real ONNX CPU inference (EAI-02 integration)

After following [EdgeAI ONNX setup](../../EdgeAI/implementations/onnx-local/README.md):

```bash
python3 EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py
python3 -B -m unittest discover -s EdgeIntegratedScenarios/onnx-tests -v
```

This CLI calls the genuine ONNX Runtime CPU session while keeping the same **12 labelled synthetic windows** and policy. Model score may add `observe` but never an automatic `block`; existing deterministic rule blocks remain authoritative. Outputs are marked `simulated` because the traffic and policy evaluation are artificial. The dedicated `onnx-cpu` CI job must pass before the ONNX path can be called runtime-verified.

## Fifth-wave persistent worker

The standalone [persistent NDJSON transport](persistent_worker.py) creates one
CPU session after installing the existing Linux seccomp filter and handles
serial windows with strict framing and fixed redacted failures. See the
[launch/parent contract](../README.md#fifth-wave-persistent-onnx-transport-standalone)
and [local evidence](../EVIDENCE-WAVE5-PERSISTENT-PYTHON.md). The one-shot CLI is
unchanged. Persistent ASP.NET integration remains pending independent checks.
