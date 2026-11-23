"""Compare local traffic scorers with identical labeled JSONL inputs."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from math import ceil, isfinite
from pathlib import Path
import platform
import sys
from time import perf_counter_ns, process_time_ns

ROOT = Path(__file__).resolve().parents[1]
TRAFFIC = ROOT / "scenarios" / "traffic-anomaly-detection"
sys.path.insert(0, str(TRAFFIC))
from baseline import score
from evaluate import MAX_BYTES, load_records

THRESHOLD = 0.5


def measure(model, predict, records, iterations, setup_ms):
    def checked_score(record):
        value = predict(record)
        if not isfinite(value) or not 0 <= value <= 1:
            raise ValueError("invalid scorer output")
        return value

    counts = dict.fromkeys(("tp", "tn", "fp", "fn"), 0)
    first_prediction_ms = None
    for record in records:
        started = perf_counter_ns()
        actual = record[0]
        predicted = checked_score(record) >= THRESHOLD
        if first_prediction_ms is None:
            first_prediction_ms = (perf_counter_ns() - started) / 1e6
        outcome = ("tp" if actual else "fp") if predicted else ("fn" if actual else "tn")
        counts[outcome] += 1

    durations = []
    cpu_started = process_time_ns()
    wall_started = perf_counter_ns()
    for _ in range(iterations):
        for record in records:
            started = perf_counter_ns()
            checked_score(record)
            durations.append((perf_counter_ns() - started) / 1e6)
    wall_ns = perf_counter_ns() - wall_started
    cpu_ns = process_time_ns() - cpu_started
    durations.sort()
    tp, tn, fp, fn = (counts[key] for key in ("tp", "tn", "fp", "fn"))
    return {
        **model,
        "counts": counts,
        "accuracy": (tp + tn) / len(records),
        "precision": tp / (tp + fp) if tp + fp else None,
        "recall": tp / (tp + fn) if tp + fn else None,
        "setup_ms": setup_ms,
        "first_prediction_ms": first_prediction_ms,
        "warmup_predictions": len(records),
        "timed_predictions": len(durations),
        "warm_ms": {
            f"p{p}": durations[ceil(len(durations) * p / 100) - 1] for p in (50, 95, 99)
        },
        "timed_process_cpu_ms": cpu_ns / 1e6,
        "predictions_per_second": len(durations) * 1e9 / wall_ns,
        "errors": 0,
    }


def run(dataset, iterations, artifacts):
    with dataset.open("rb") as stream:
        data = stream.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("dataset too large")
    records = load_records(data.decode("utf-8"))
    runs = [measure(
        {"model": "heuristic-v1-rules-only", "backend": "python",
         "model_sha256": sha256((TRAFFIC / "baseline.py").read_bytes()).hexdigest()},
        lambda record: score(record[2]), records, iterations, None,
    )]
    if artifacts is not None:
        sys.path.insert(0, str(ROOT / "implementations" / "onnx-local"))
        from runtime import OnnxWindowScorer, ort

        started = perf_counter_ns()
        scorer = OnnxWindowScorer(artifacts)
        setup_ms = (perf_counter_ns() - started) / 1e6
        runs.append(measure(
            {"model": scorer.model_id, "model_sha256": scorer.model_sha256,
             "backend": "CPUExecutionProvider", "runtime_version": ort.__version__},
            lambda record: scorer.score(record[1]), records, iterations, setup_ms,
        ))
    return {
        "schema_version": 1,
        "task": "traffic-anomaly",
        "location": "local",
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "python": platform.python_version(), "os": platform.system(),
            "architecture": platform.machine(), "processor": platform.processor() or None,
        },
        "dataset": {"sha256": sha256(data).hexdigest(), "records": len(records)},
        "threshold": THRESHOLD,
        "iterations": iterations,
        "batch_size": 1,
        "runs": runs,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=TRAFFIC / "fixtures.jsonl")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--onnx-artifacts", type=Path)
    args = parser.parse_args()
    if not 1 <= args.iterations <= 200:
        parser.error("iterations must be 1..200")
    try:
        print(json.dumps(run(args.dataset, args.iterations, args.onnx_artifacts), indent=2))
    except (ImportError, OSError, RuntimeError, ValueError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
