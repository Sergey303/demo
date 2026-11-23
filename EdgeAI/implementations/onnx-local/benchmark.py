"""Repeatable real CPU inference timing on locally generated synthetic data.

Local p50/p95 is measured, not a cloud/edge SLA. No model/download network I/O.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
from math import ceil
from pathlib import Path
from statistics import median
from time import perf_counter

from build_model import HOLDOUT_ROWS, SEED, synthetic_rows
from runtime import OnnxWindowScorer


def percentile(data: list[float], p: float) -> float:
    sample = sorted(data)
    return round(sample[max(0, ceil(p * len(sample)) - 1)], 4)


def run(artifact_dir: Path, iterations: int = 50) -> dict:
    if type(iterations) is not int or not 5 <= iterations <= 200:
        raise ValueError("iterations must be 5..200")
    started = perf_counter()
    scorer = OnnxWindowScorer(artifact_dir)
    init_ms = (perf_counter() - started) * 1000

    # Generate held-out *synthetic* windows in feature-space, not real traffic.
    x, y = synthetic_rows(SEED + 1, HOLDOUT_ROWS)
    import numpy as np
    durations = []
    outputs = []
    for index in range(iterations + 5):
        input_tensor = x[index % len(x)].astype(np.float32).reshape(1, -1)
        tick = perf_counter()
        result = scorer.session.run(["risk_score"], {"features": input_tensor})
        delta_ms = (perf_counter() - tick) * 1000
        if index >= 5:
            durations.append(delta_ms)
            outputs.append(float(result[0][0][0]))
    if not all(np.isfinite(score) and 0 <= score <= 1 for score in outputs):
        raise RuntimeError("invalid inference output")
    return {
        "status": "local-tested",
        "runtime": "onnxruntime",
        "provider": "CPUExecutionProvider",
        "model_id": scorer.model_id,
        "model_sha256": scorer.model_sha256,
        "holdout_kind": "authored synthetic, not a real traffic corpus",
        "holdout_labels_sha256": sha256(y.tobytes()).hexdigest(),
        "warmup_iterations": 5,
        "timed_iterations": iterations,
        "session_init_ms": round(init_ms, 4),
        "warm_p50_ms": round(median(durations), 4),
        "warm_p95_ms": percentile(durations, 0.95),
        "warm_p99_ms": percentile(durations, 0.99),
        "note": "Single process CPU measurements only; cannot predict network latency or real-world detection quality",
    }


def main():
    parser = argparse.ArgumentParser(description="Time real local ONNX Runtime CPU inference")
    parser.add_argument("--artifact-dir", type=Path, default=Path(__file__).with_name("artifacts"))
    parser.add_argument("--iterations", type=int, default=50)
    args = parser.parse_args()
    try:
        result = run(args.artifact_dir, args.iterations)
    except (ValueError, OSError, RuntimeError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
