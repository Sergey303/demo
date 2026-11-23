"""Train a tiny logistic model on AUTHORED SYNTHETIC data, export ONNX.

No pretrained data/models, network calls or third-party weights. This is an
educational inference fixture, NOT a validated security detector.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import numpy as np
import onnx
from onnx import TensorProto, helper

from features import FEATURE_NAMES, MODEL_ID, vectorize

SEED = 20261123
TRAIN_ROWS = 640
HOLDOUT_ROWS = 160
OPSET = 13
IR_VERSION = 8


def synthetic_rows(seed: int, count: int):
    rng = np.random.default_rng(seed)
    matrix = []
    labels = []
    # Deliberate artificial label-generating rule. Legitimate bursts and
    # low-rate abuse overlap; no real traffic was used.
    source_weights = np.array([1.6, 3.0, 1.1, 0.9], dtype=np.float64)
    for _ in range(count):
        baseline = float(rng.uniform(1.0, 25.0))
        seconds = int(rng.integers(5, 91))
        rate = float(rng.lognormal(mean=np.log(baseline * 1.4), sigma=1.10))
        requests = min(10_000_000, max(0, int(round(rate * seconds))))
        error_fraction = float(rng.beta(1.25, 7.0 if rng.random() > 0.2 else 2.0))
        errors = min(requests, int(round(requests * error_fraction)))
        window = {"requests": requests, "seconds": seconds,
                  "errors": errors, "baseline_rps": baseline}
        features = vectorize(window)
        matrix.append(features)
        latent = float(np.dot(features, source_weights) - 2.1
                       + rng.normal(0.0, 0.35))
        probability = 1.0 / (1.0 + np.exp(-np.clip(latent, -40, 40)))
        labels.append(float(rng.random() < probability))
    return np.asarray(matrix, dtype=np.float64), np.asarray(labels, dtype=np.float64).reshape(-1, 1)


def train():
    x, y = synthetic_rows(SEED, TRAIN_ROWS)
    w = np.zeros((len(FEATURE_NAMES), 1), dtype=np.float64)
    b = np.zeros((1,), dtype=np.float64)
    for _ in range(800):
        logits = np.clip(x @ w + b, -40.0, 40.0)
        p = 1.0 / (1.0 + np.exp(-logits))
        error = p - y
        w -= 0.8 * ((x.T @ error) / len(x) + 0.005 * w)
        b -= 0.8 * error.mean(axis=0)
    return w.astype(np.float32), b.astype(np.float32)


def create_graph(w: np.ndarray, b: np.ndarray):
    initializer = [
        helper.make_tensor("W", TensorProto.FLOAT, [len(FEATURE_NAMES), 1], w.reshape(-1).tolist()),
        helper.make_tensor("B", TensorProto.FLOAT, [1], b.tolist()),
    ]
    graph = helper.make_graph(
        nodes=[
            helper.make_node("MatMul", ["features", "W"], ["linear"], name="weighted_features"),
            helper.make_node("Add", ["linear", "B"], ["logits"], name="bias"),
            helper.make_node("Sigmoid", ["logits"], ["risk_score"], name="probability_output"),
        ],
        name="authored_synthetic_logistic_classifier",
        inputs=[helper.make_tensor_value_info("features", TensorProto.FLOAT, ["batch", len(FEATURE_NAMES)])],
        outputs=[helper.make_tensor_value_info("risk_score", TensorProto.FLOAT, ["batch", 1])],
        initializer=initializer,
    )
    model = helper.make_model(graph, producer_name="Sergey303/demo EdgeAI",
                              opset_imports=[helper.make_opsetid("", OPSET)])
    model.ir_version = IR_VERSION
    model.model_version = 1
    model.doc_string = "SYNTHETIC training labels; no validation on real traffic. Never use for automatic blocking."
    onnx.checker.check_model(model)
    return model


def build(out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    w, b = train()
    model = create_graph(w, b)
    payload = model.SerializeToString(deterministic=True)
    if len(payload) > 1_000_000:
        raise ValueError("model too large")
    (out / "model.onnx").write_bytes(payload)
    source = Path(__file__).read_bytes() + Path(__file__).with_name("features.py").read_bytes()
    metadata = {
        "id": MODEL_ID,
        "model_file": "model.onnx",
        "model_sha256": sha256(payload).hexdigest(),
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
    (out / "manifest.json").write_text(json.dumps(metadata, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return metadata


def main():
    parser = argparse.ArgumentParser(description="Build an offline synthetic ONNX model fixture")
    parser.add_argument("--out", type=Path, default=Path(__file__).with_name("artifacts"))
    args = parser.parse_args()
    result = build(args.out)
    print(json.dumps({"status": "model-generated-not-inferred", "model_sha256": result["model_sha256"],
                      "model_dir": str(args.out)}, sort_keys=True))


if __name__ == "__main__":
    main()
