"""Actual offline ONNX Runtime CPU inference with strict model integrity checks."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import isfinite
from pathlib import Path

import numpy as np
import onnxruntime as ort

from features import FEATURE_NAMES, MODEL_ID, vectorize

MAX_MODEL_BYTES = 1_000_000
MAX_BATCH = 32
MAX_MANIFEST_BYTES = 16_384


class OnnxWindowScorer:
    def __init__(self, artifact_dir: Path):
        artifact_dir = Path(artifact_dir)
        model_path = artifact_dir / "model.onnx"
        manifest_path = artifact_dir / "manifest.json"
        if not model_path.is_file() or not manifest_path.is_file():
            raise ValueError("Model or manifest absent; run build_model.py explicitly, no downloads")
        with manifest_path.open("rb") as manifest:
            manifest_bytes = manifest.read(MAX_MANIFEST_BYTES + 1)
        if len(manifest_bytes) > MAX_MANIFEST_BYTES:
            raise ValueError("oversized model manifest")
        meta = json.loads(manifest_bytes.decode("utf-8"))
        if (not isinstance(meta, dict) or meta.get("id") != MODEL_ID
                or meta.get("model_file") != "model.onnx"
                or meta.get("features") != list(FEATURE_NAMES)
                or meta.get("input_tensor") != "features"
                or meta.get("output_tensor") != "risk_score"
                or meta.get("opset") != 13 or meta.get("ir_version") != 8):
            raise ValueError("incompatible model manifest/version")
        checksum = meta.get("model_sha256")
        if (not isinstance(checksum, str) or len(checksum) != 64
                or any(digit not in "0123456789abcdef" for digit in checksum)):
            raise ValueError("invalid model SHA256")
        with model_path.open("rb") as model:
            model_bytes = model.read(MAX_MODEL_BYTES + 1)
        if not 0 < len(model_bytes) <= MAX_MODEL_BYTES:
            raise ValueError("invalid model size")
        if sha256(model_bytes).hexdigest() != checksum:
            raise ValueError("model SHA256 mismatch")

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.enable_mem_pattern = False
        self.session = ort.InferenceSession(model_bytes, sess_options=opts, providers=["CPUExecutionProvider"])
        self.session.disable_fallback()
        inputs, outputs = self.session.get_inputs(), self.session.get_outputs()
        if (len(inputs) != 1 or len(outputs) != 1
                or inputs[0].name != "features" or inputs[0].type != "tensor(float)"
                or inputs[0].shape != ["batch", len(FEATURE_NAMES)]
                or outputs[0].name != "risk_score" or outputs[0].type != "tensor(float)"
                or outputs[0].shape != ["batch", 1]
                or self.session.get_providers() != ["CPUExecutionProvider"]):
            raise ValueError("unexpected model input/output or execution provider")
        self.model_sha256 = checksum
        self.model_id = MODEL_ID

    def score_many(self, windows: list[dict]) -> list[float]:
        if not isinstance(windows, list) or not 1 <= len(windows) <= MAX_BATCH:
            raise ValueError("batch must contain 1..32 windows")
        vectors = [vectorize(window) for window in windows]
        values = np.asarray(vectors, dtype=np.float32)
        results = self.session.run(["risk_score"], {"features": values})
        if len(results) != 1 or results[0].shape != (len(windows), 1):
            raise RuntimeError("unexpected inference output shape")
        scores = [float(value) for value in results[0].reshape(-1)]
        if any(not isfinite(value) or not 0 <= value <= 1 for value in scores):
            raise RuntimeError("invalid ONNX model output")
        return scores

    def score(self, window: dict) -> float:
        return self.score_many([window])[0]


def main():
    parser = argparse.ArgumentParser(description="Offline ONNX Runtime CPU score on a synthetic window")
    parser.add_argument("--artifact-dir", type=Path, default=Path(__file__).with_name("artifacts"))
    parser.add_argument("--window-json", type=str, required=True, help="Four synthetic numeric window fields")
    args = parser.parse_args()
    try:
        window = json.loads(args.window_json)
        scorer = OnnxWindowScorer(args.artifact_dir)
        output = {"status": "local-tested", "runtime": "onnxruntime",
                  "provider": "CPUExecutionProvider", "model_id": scorer.model_id,
                  "model_sha256": scorer.model_sha256, "score": scorer.score(window),
                  "label": "synthetic-uncalibrated-advisory-only"}
    except (OSError, RuntimeError, ValueError, TypeError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    print(json.dumps(output, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
