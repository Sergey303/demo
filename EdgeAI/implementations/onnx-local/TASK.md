# EAI-02 — Codex CLI: local ONNX inference

**Status: IMPLEMENTED (source and tests) / PENDING native CPU verification.** The RDC device became unavailable before this increment could run ONNX tests locally. The `.github/workflows/edge-baselines.yml` `onnx-cpu` job installs pinned dependencies and must run them; never mark **local-tested** solely because files compile statically.

## Implemented

- [x] `features.py` — bounded, versioned numerical request-window feature contract, no IP/PII.
- [x] `build_model.py` — deterministic training on authored synthetic windows, ONNX `MatMul/Add/Sigmoid`, model SHA manifest with provenance, no downloads.
- [x] `runtime.py` — ONNX Runtime `CPUExecutionProvider`, input/output shape checks, model identity/hash checks, bounded batches (1..32), fail-fast on corrupt model.
- [x] `benchmark.py` — actual CPU session initialization and warm p50/p95/p99 timings (measurement on successful execution).
- [x] `tests/test_features.py`, `tests/test_model.py` — boundary, determinism, integrity, numerical comparison, no-socket inference and benchmark acceptance.
- [x] `EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py` — integrated scoring with observe-only policy, verified by separate test.

## P0 verification and follow-up

- [ ] Confirm the **`onnx-cpu` GitHub Actions job completes successfully** or run the exact commands in [README.md](README.md) on the restored RDC machine. If it fails, fix and rerun; never report a pass without evidence.
- [ ] Add hard wall-clock timeouts/isolation (killable subprocess or dedicated restricted worker). An ONNX Runtime session API call itself cannot currently be bounded by our request timeout.
- [ ] Validate tampering of manifest itself, graph op allowlist, model size/metadata and failure modes of malformed ONNX protobufs.
- [ ] Add an independently sourced/licensed dataset, trained/held-out split, calibration error, false-positive analysis for legitimate bursts and drift detection.
- [ ] Make model architecture/feature versions and test scenario snapshots backward-compatible or explicitly reject upgrades.

## P1 architecture

- [ ] Add .NET 10 inference adapter and real edge-device/WASM execution under an explicit hardware budget.
- [ ] Optional HTTP API integration: expose advisory score as `observe` only, with bounded timeout, deterministic fallback and no model-driven hard blocks.
- [ ] CPU, RAM, p95 latency, throughput/cold start and network-disabled tests on Windows/Linux; publish measured environment details.
- [ ] Provider parity with Cloudflare Workers AI and Yandex Cloud on comparable tasks/models; do not imply regional cloud inference is true edge execution.

No cloud credentials, personal data, public load/attack traffic, third-party model weights or implicit downloads. Further TODOs stay next to code with falsifiable acceptance criteria.
