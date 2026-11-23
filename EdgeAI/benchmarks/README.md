# Edge AI benchmarks

The first benchmark implementation is now [ONNX local CPU benchmark](../implementations/onnx-local/benchmark.py). It **executes the generated ONNX model** using native ONNX Runtime if installed; captures model hash, CPU execution provider, session initialization time and warm-inference p50/p95/p99.

```bash
python3 -m pip install -r EdgeAI/implementations/onnx-local/requirements.txt
python3 EdgeAI/implementations/onnx-local/build_model.py
python3 EdgeAI/implementations/onnx-local/benchmark.py --iterations 50
```

**Verification status:** native ONNX CPU run completed locally on `rdc-project` (Python 3.12.14, NumPy 2.2.6, ONNX 1.19.1, ONNX Runtime 1.23.2). Measured on Intel Core i5-12400: session initialization 45.9863 ms; warm p50/p95/p99 0.0059/0.0084/0.0490 ms with 5 warmups and 50 iterations. These are machine-specific samples, not SLA or security detection performance. The dedicated CI `onnx-cpu` job has been configured to perform the smoke test and numerical validation.

These are **local CPU execution timings on synthetic examples**, not real-world security effectiveness, network-edge latency or cloud performance. No actual benchmark numbers should be asserted without a captured run. The synthetic holdout label hash records the test distribution but cannot serve as an independent externally verified dataset.

## Shared traffic inputs

Run from the repository root. The default command measures the rules-only scorer. The second command also measures the existing CPU ONNX scorer when its dependencies and generated artifacts already exist locally.

```bash
python3 -B EdgeAI/benchmarks/compare.py --iterations 20
python3 -B EdgeAI/benchmarks/compare.py --iterations 20 --onnx-artifacts EdgeAI/implementations/onnx-local/artifacts
```

Both scorers receive the same validated JSONL traffic windows and use threshold 0.5. A single report records the input SHA-256 and each model/source SHA-256. The default dataset comes from the 12 authored traffic fixtures and is separate from the ONNX feature-space training generator. Use `--dataset` to evaluate another JSONL file with the same schema. Missing or invalid data and scoring failures abort the run.

The first scoring pass supplies quality metrics and warms each scorer. Timed predictions then repeat the whole corpus, one window at a time. Warm percentiles include score validation and scorer-specific feature work. ONNX setup measures model loading and session creation after imports. Timed process CPU and throughput include loop overhead. For comparisons between reports, check schema, dataset hash, batch size, threshold, environment and run settings, and disclose model/backend changes. Machine-specific latency and synthetic quality have limited applicability to external workloads.

See [TASK.md](TASK.md) for open benchmark work.
