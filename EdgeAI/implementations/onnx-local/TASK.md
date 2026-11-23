# EAI-02 — Codex CLI: local ONNX inference

**Status: STANDALONE HARDENING LOCALLY VERIFIED (2026-11-23).** The pinned CPU suite passed 20 tests on Linux x86-64. Hardening base SHA was `c2969b38c8a4c762eccab931a747701a4ea54881`. See the [hardening evidence](README.md#standalone-hardening-verification) and [initial CPU run](README.md#verified-cpu-run-2026-11-23).

## Implemented

- [x] `features.py` — bounded, versioned numerical request-window feature contract, no IP/PII.
- [x] `build_model.py` — deterministic training on authored synthetic windows, ONNX `MatMul/Add/Sigmoid`, model SHA manifest with provenance, no downloads.
- [x] `runtime.py` — ONNX Runtime `CPUExecutionProvider`, input/output shape checks, model identity/hash checks, bounded batches (1..32), fail-fast on corrupt model.
- [x] `benchmark.py` — actual CPU session initialization and warm p50/p95/p99 timings (measurement on successful execution).
- [x] `tests/test_features.py`, `tests/test_model.py` — boundary, determinism, integrity, numerical comparison, no-socket inference and benchmark acceptance.
- [x] `EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py` — integrated scoring with observe-only policy, verified by separate test.

## P0 verification and follow-up

- [x] Run the standalone README commands with pinned dependencies and native `CPUExecutionProvider`. Local evidence covers generation, scoring, integrity and shape regressions, and warm inference timing.
- [x] Confirm the `onnx-cpu` GitHub Actions job ([green native ONNX run 45209131000](https://github.com/Sergey303/demo/actions/runs/45209131000)) and repeat on RDC, including persistent seccomp worker and full HTTP→ONNX tests.
- [x] Add standalone wall-clock enforcement with a killable, reaped Linux subprocess, a socket filter, bounded I/O and deterministic rules fallback. The existing in-process API remains available to current callers.
- [x] Validate tampered manifest metadata and fields, malformed ONNX protobufs, unsupported operators, external data, model size and tensor schema. SHA-256 checks integrity only.
- [ ] Add an independently sourced/licensed dataset, trained/held-out split, calibration error, false-positive analysis for legitimate bursts and drift detection.
- [ ] Make model architecture/feature versions and test scenario snapshots backward-compatible or explicitly reject upgrades.

## P1 architecture

- [ ] Add .NET 10 inference adapter and real edge-device/WASM execution under an explicit hardware budget.
- [x] Optional localhost HTTP API integration: the ASP.NET Core demo launches a bounded isolated ONNX scorer after successful quota admission; advice is only `allow/observe` with deterministic fallback and never hard-blocks. Locally verified, not production-ready.
- [ ] CPU, RAM, p95 latency, throughput/cold start and network-disabled tests on Windows/Linux; publish measured environment details.
- [ ] Provider parity with Cloudflare Workers AI and Yandex Cloud on comparable tasks/models; do not imply regional cloud inference is true edge execution.

No cloud credentials, personal data, public load/attack traffic, third-party model weights or implicit downloads. Further TODOs stay next to code with falsifiable acceptance criteria.
