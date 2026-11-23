"""Offline quality evaluation of a heuristic, NOT a calibrated AI model."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import isfinite
from pathlib import Path
from baseline import Window, score

MAX_BYTES = 1_000_000
MAX_RECORDS = 1_000
FIELDS = {"requests", "seconds", "errors", "baseline_rps"}


def _rate(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 6) if denominator else None


def evaluate_text(data: str, threshold: float = 0.5) -> dict:
    if not isinstance(threshold, (int, float)) or not isfinite(threshold) or not 0 < threshold <= 1:
        raise ValueError("threshold must be finite and in (0, 1]")
    if len(data.encode("utf-8")) > MAX_BYTES:
        raise ValueError("dataset too large")

    counts = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    seen: set[str] = set()
    for n, line in enumerate(data.splitlines(), start=1):
        if n > MAX_RECORDS:
            raise ValueError("too many records")
        try:
            row = json.loads(line)
            if not isinstance(row, dict) or set(row) != {"id", "label", "window"}:
                raise ValueError("invalid record keys")
            if not isinstance(row["id"], str) or not 1 <= len(row["id"]) <= 64:
                raise ValueError("invalid record id")
            if row["id"] in seen:
                raise ValueError("duplicate record id")
            seen.add(row["id"])
            if type(row["label"]) is not int or row["label"] not in (0, 1):
                raise ValueError("label must be 0 or 1")
            if not isinstance(row["window"], dict) or set(row["window"]) != FIELDS:
                raise ValueError("invalid window keys")
            window = Window(**row["window"])
            predicted = int(score(window) >= threshold)
            actual = row["label"]
            key = "tp" if predicted and actual else "fp" if predicted else "fn" if actual else "tn"
            counts[key] += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"record {n} is invalid: {exc}") from exc

    if not seen:
        raise ValueError("empty dataset")
    tp, tn, fp, fn = (counts[k] for k in ("tp", "tn", "fp", "fn"))
    return {
        "status": "simulated",
        "algorithm": "heuristic-v1-rules-only",
        "dataset_sha256": sha256(data.encode("utf-8")).hexdigest(),
        "threshold": threshold,
        "records": len(seen),
        "counts": counts,
        "precision": _rate(tp, tp + fp),
        "recall": _rate(tp, tp + fn),
        "false_positive_rate": _rate(fp, fp + tn),
        "false_negative_rate": _rate(fn, fn + tp),
        "limitations": "Synthetic authored labels; not a real-world DDoS or ML accuracy estimate",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate deterministic synthetic anomaly baseline")
    parser.add_argument("--dataset", type=Path, default=Path(__file__).with_name("fixtures.jsonl"))
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()
    try:
        if args.dataset.stat().st_size > MAX_BYTES:
            raise ValueError("dataset too large")
        result = evaluate_text(args.dataset.read_text(encoding="utf-8"), args.threshold)
    except (OSError, UnicodeError, ValueError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, sort_keys=True, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
