# EAI-02 / ONNX integration — implementation and acceptance ledger

**Date:** 2026-11-23. **Repository:** Sergey303/demo, branch main.

> **Historical baseline:** this record was created before native ONNX verification. A subsequent parallel Codex run and independent merged-worktree acceptance passed 11 ONNX model/feature tests and 2 integration tests. See [verified evidence](EVIDENCE-CODEX-2026-11-23.md). The original pending status below is preserved as history, not current state.

## Current status

**SOURCE_COMMITTED / RUNTIME_TEST_PENDING.** The source and a required separate CI job have been created. The connected `rdc-project` became offline before this increment could install Python ONNX packages or run native tests. **Do not describe the ONNX execution as locally verified**. Earlier ENS/Redis evidence remains separate.

## Scope implemented in source

- `EdgeAI/implementations/onnx-local/features.py`: validated 4-field window contract; bounded numerical features, no IP/user/account fields.
- `build_model.py`: deterministic synthetic training, ONNX export (MatMul → Add → Sigmoid), IR 8, opset 13, `onnx.checker`, output SHA256 and provenance manifest.
- `runtime.py`: pinned model identity and manifest SHA, explicit CPU provider, actual `onnxruntime.InferenceSession(...).run(...)`, strict 1..32 sample batch, failure on missing/corrupted model. No HTTP/model downloads.
- `benchmark.py`: actual model init and CPU warm p50/p95/p99 measurement on synthetic holdout inputs, no invented latency numbers.
- `tests/test_features.py`, `tests/test_model.py`: expected numeric inference vs NumPy formula, deterministic model generation and SHA, tamper rejection, bounded input and batch, offline/no-socket test, real timing smoke.
- `EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py`: real model score passes through existing safety-first `allow → observe` policy on synthetic fixture; regular deterministic blocks remain authoritative; output status remains `simulated`.
- `EdgeIntegratedScenarios/onnx-tests/test_onnx_replay.py`: integrated genuine native CPU test, no provider SDKs.
- `.github/workflows/edge-baselines.yml`: independent `onnx-cpu` job that explicitly installs pinned packages, builds the ONNX file and runs native and integration tests.

## Required acceptance before reporting success

```bash
python3 -m pip install -r EdgeAI/implementations/onnx-local/requirements.txt
python3 EdgeAI/implementations/onnx-local/build_model.py
python3 -B -m unittest discover -s EdgeAI/implementations/onnx-local/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/onnx-tests -v
python3 EdgeAI/implementations/onnx-local/runtime.py \
  --window-json '{"requests":250,"seconds":10,"errors":45,"baseline_rps":3}'
python3 EdgeAI/implementations/onnx-local/benchmark.py --iterations 20
python3 EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py
```

Capture exact Python/NumPy/ONNX/ONNX Runtime versions, CPU architecture, SHA256, test output, observed p50/p95/p99, labels and report; confirm GitHub Actions `onnx-cpu` job success on the new commit. Until then, inference runtime and performance remain **unverified**.

## Deliberate limitations

The model is a logistic classifier trained on authored synthetic windows, **not** a validated DDoS model. Test labels and examples are synthetic; precision/recall say nothing about real attacks. Pinned model SHA does not constitute a signature. Hard wall-clock execution timeouts, model authorization, adversarial manipulation tests, independent datasets, real edge devices, provider parity and HTTP/Redis online integration are TODO; never connect automatic hard blocking to this model.

[Tasks and ownership](../EdgeAI/implementations/onnx-local/TASK.md) · [Integrated policy tasks](ai-assisted-ddos-defense/TASK.md)
