"""Apply a REAL locally generated ONNX model to the synthetic decision replay.

The inference is actual CPU ONNX Runtime; the input labels and rule decisions
remain simulated. This is *never* an autonomous blocking implementation.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
ONNX_DIR = REPO_ROOT / "EdgeAI" / "implementations" / "onnx-local"
sys.path.insert(0, str(ONNX_DIR))

from runtime import OnnxWindowScorer
from replay import evaluate_text

MAX_DATA_BYTES = 1_000_000


def evaluate_onnx(data: str, artifact_dir: Path, threshold: float = 0.5) -> dict:
    # Strict manifest SHA256 check and real native CPU session initialization
    # happen before any policies or synthetic fixtures are evaluated.
    scorer = OnnxWindowScorer(artifact_dir)
    report = evaluate_text(data, threshold, scorer=scorer.score)
    report["model"] = {
        "runtime": "onnxruntime",
        "provider": "CPUExecutionProvider",
        "model_id": scorer.model_id,
        "model_sha256": scorer.model_sha256,
        "execution": "real CPU inference; synthetic scenarios",
    }
    report["note"] = (
        "ONNX Runtime executed real model ops (MatMul/Add/Sigmoid);"
        " labels, test cases and policy decisions remain synthetic."
        " Advisory score cannot hard-block, Redis quota is unaffected."
    )
    return report


def main():
    parser = argparse.ArgumentParser(description="Offline synthetic policy replay with real ONNX Runtime")
    parser.add_argument("--artifact-dir", type=Path, default=ONNX_DIR / "artifacts")
    parser.add_argument("--dataset", type=Path, default=HERE / "fixtures.jsonl")
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()
    try:
        if args.dataset.stat().st_size > MAX_DATA_BYTES:
            raise ValueError("dataset too large")
        result = evaluate_onnx(args.dataset.read_text(encoding="utf-8"),
                               args.artifact_dir, args.threshold)
    except (ValueError, OSError, RuntimeError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
