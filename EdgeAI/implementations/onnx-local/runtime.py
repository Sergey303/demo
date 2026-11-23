"""Actual offline ONNX Runtime CPU inference with strict model integrity checks."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import isfinite
import os
from pathlib import Path
import stat

import numpy as np
import onnx
import onnxruntime as ort
from google.protobuf.message import DecodeError

from build_model import HOLDOUT_ROWS, IR_VERSION, OPSET, SEED, TRAIN_ROWS, create_graph

from features import FEATURE_NAMES, MODEL_ID, vectorize

MAX_MODEL_BYTES = 1_000_000
MAX_BATCH = 32
MAX_MANIFEST_BYTES = 16_384


def _read_regular(path: Path, limit: int) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_BINARY", 0)
    descriptor = os.open(path, flags)
    try:
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise ValueError("artifact must be a regular file")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            return stream.read(limit + 1)
    finally:
        os.close(descriptor)


def _unique_fields(pairs):
    fields = {}
    for key, value in pairs:
        if key in fields:
            raise ValueError("duplicate manifest key")
        fields[key] = value
    return fields


def _validated_checksum(raw: bytes) -> str:
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError("oversized model manifest")
    try:
        meta = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_fields)
    except RecursionError as exc:
        raise ValueError("invalid manifest nesting") from exc
    source = Path(__file__).with_name("build_model.py").read_bytes()
    source += Path(__file__).with_name("features.py").read_bytes()
    expected = {
        "id": MODEL_ID,
        "model_file": "model.onnx",
        "builder_sources_sha256": sha256(source).hexdigest(),
        "execution": "ONNXRuntime/CPU",
        "features": list(FEATURE_NAMES),
        "input_tensor": "features",
        "output_tensor": "risk_score",
        "opset": OPSET,
        "ir_version": IR_VERSION,
        "seed": SEED,
        "training_rows": TRAIN_ROWS,
        "holdout_seed": SEED + 1,
        "holdout_rows": HOLDOUT_ROWS,
        "provenance": "generated locally from authored synthetic windows and artificial labels; no downloaded weights",
        "security_claim": "NONE: not an actual DDoS model, score not calibrated",
    }
    if (type(meta) is not dict or meta.keys() != expected.keys() | {"model_sha256"}
            or any(type(meta[key]) is not type(value) or meta[key] != value
                   for key, value in expected.items())):
        raise ValueError("incompatible model manifest/version")
    checksum = meta["model_sha256"]
    if (type(checksum) is not str or len(checksum) != 64
            or any(digit not in "0123456789abcdef" for digit in checksum)):
        raise ValueError("invalid model SHA256")
    return checksum


def _validate_graph(payload: bytes) -> bytes:
    try:
        model = onnx.load_model_from_string(payload)
    except (DecodeError, ValueError) as exc:
        raise ValueError("malformed ONNX protobuf") from exc

    template = create_graph(np.zeros((len(FEATURE_NAMES), 1), dtype=np.float32),
                            np.zeros(1, dtype=np.float32))
    if [(node.domain, node.op_type) for node in model.graph.node] != [
        ("", "MatMul"), ("", "Add"), ("", "Sigmoid"),
    ]:
        raise ValueError("unsupported ONNX operator sequence")
    if model.graph.input != template.graph.input or model.graph.output != template.graph.output:
        raise ValueError("unexpected model input/output")

    # Match the builder contract in full, allowing only bounded weights and bias
    # to vary. This excludes alternate domains, attributes, subgraphs, external
    # tensor data, extra metadata and unknown protobuf fields.
    if len(model.graph.initializer) != len(template.graph.initializer):
        raise ValueError("unexpected ONNX graph initializers")
    for actual, expected in zip(model.graph.initializer, template.graph.initializer):
        values = actual.float_data
        if len(values) != len(expected.float_data) or any(
            not isfinite(value) or abs(value) > 100 for value in values
        ):
            raise ValueError("invalid ONNX graph weights")
        expected.float_data[:] = values
    trusted_bytes = template.SerializeToString(deterministic=True)
    if model.SerializeToString(deterministic=True) != trusted_bytes:
        raise ValueError("unexpected ONNX graph or model metadata")
    return trusted_bytes


class OnnxWindowScorer:
    def __init__(self, artifact_dir: Path):
        artifact_dir = Path(artifact_dir)
        try:
            checksum = _validated_checksum(_read_regular(artifact_dir / "manifest.json", MAX_MANIFEST_BYTES))
            model_bytes = _read_regular(artifact_dir / "model.onnx", MAX_MODEL_BYTES)
        except FileNotFoundError as exc:
            raise ValueError("Model or manifest absent; run build_model.py explicitly, no downloads") from exc
        if not 0 < len(model_bytes) <= MAX_MODEL_BYTES:
            raise ValueError("invalid model size")
        if sha256(model_bytes).hexdigest() != checksum:
            raise ValueError("model SHA256 mismatch")
        validated_model = _validate_graph(model_bytes)

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.enable_mem_pattern = False
        self.session = ort.InferenceSession(validated_model, sess_options=opts, providers=["CPUExecutionProvider"])
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
