# Edge AI benchmarks

The first benchmark implementation is now [ONNX local CPU benchmark](../implementations/onnx-local/benchmark.py). It **executes the generated ONNX model** using native ONNX Runtime if installed; captures model hash, CPU execution provider, session initialization time and warm-inference p50/p95/p99.

```bash
python3 -m pip install -r EdgeAI/implementations/onnx-local/requirements.txt
python3 EdgeAI/implementations/onnx-local/build_model.py
python3 EdgeAI/implementations/onnx-local/benchmark.py --iterations 50
```

**Verification status:** native ONNX CPU run completed locally on `rdc-project` (Python 3.12.14, NumPy 2.2.6, ONNX 1.19.1, ONNX Runtime 1.23.2). Measured on Intel Core i5-12400: session initialization 45.9863 ms; warm p50/p95/p99 0.0059/0.0084/0.0490 ms with 5 warmups and 50 iterations. These are machine-specific samples, not SLA or security detection performance. The dedicated CI `onnx-cpu` job has been configured to perform the smoke test and numerical validation.

These are **local CPU execution timings on synthetic examples**, not real-world security effectiveness, network-edge latency or cloud performance. No actual benchmark numbers should be asserted without a captured run. The synthetic holdout label hash records the test distribution but cannot serve as an independent externally verified dataset.

## TODO for Codex

- Build a common versioned JSONL dataset shared by rules-only heuristic, ONNX and provider-backed models; keep a pinned SHA and known licensing.
- Report true positive/false positive rates on independently labelled held-out examples; separate in-sample and holdout performance.
- Record CPU type, RAM, cold-start, warm-up count, error distribution and concurrency; do not compare different input/model versions without disclosure.
- Add latency p50/p95/p99 **for complete HTTP pipeline** separately from model inference.
- Compare Cloudflare/Yandex/other inference locations only once providers are configured and their real telemetry is available; no fabricated costs or SLA.

See [TASK.md](TASK.md).
