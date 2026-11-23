"""These tests execute a REAL ONNX Runtime CPU model, not mocks.

Run after explicitly installing requirements.txt; CI installs them in a separate
required job. No model binaries, pre-trained weights or external services.
"""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from features import MODEL_ID, vectorize
from build_model import build, create_graph, train
from runtime import OnnxWindowScorer
from benchmark import run as benchmark_run

import numpy as np


class TestRealOnnxInference(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.out = Path(cls.temporary.name)
        cls.manifest = build(cls.out)
        cls.scorer = OnnxWindowScorer(cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_genuine_runtime_and_numerical_result(self):
        self.assertEqual(self.scorer.session.get_providers(), ["CPUExecutionProvider"])
        self.assertEqual(self.scorer.model_id, MODEL_ID)
        w, b = train()
        example = {"requests": 250, "seconds": 10, "errors": 45, "baseline_rps": 3}
        x = np.asarray(vectorize(example), dtype=np.float32).reshape(1, 4)
        direct = float(self.scorer.session.run(["risk_score"], {"features": x})[0][0, 0])
        predicted = self.scorer.score(example)
        self.assertAlmostEqual(predicted, direct, places=6)
        expected = float(1.0 / (1.0 + np.exp(-(x @ w + b).item())))
        self.assertAlmostEqual(predicted, expected, places=5)

    def test_reproducible_model_bytes_and_sha(self):
        with tempfile.TemporaryDirectory() as second:
            metadata = build(Path(second))
            self.assertEqual(metadata["model_sha256"], self.manifest["model_sha256"])
            first_payload = (self.out / "model.onnx").read_bytes()
            self.assertEqual((Path(second) / "model.onnx").read_bytes(), first_payload)
            self.assertEqual(sha256(first_payload).hexdigest(), self.manifest["model_sha256"])

    def test_rejects_fixed_batch_even_with_matching_hash(self):
        model = create_graph(*train())
        for tensor in (model.graph.input[0], model.graph.output[0]):
            tensor.type.tensor_type.shape.dim[0].dim_value = 1
        payload = model.SerializeToString(deterministic=True)
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / "model.onnx").write_bytes(payload)
            metadata = dict(self.manifest, model_sha256=sha256(payload).hexdigest())
            (directory / "manifest.json").write_text(json.dumps(metadata), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "input/output"):
                OnnxWindowScorer(directory)

    def test_tampering_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / "model.onnx").write_bytes((self.out / "model.onnx").read_bytes() + b"X")
            (directory / "manifest.json").write_bytes((self.out / "manifest.json").read_bytes())
            with self.assertRaisesRegex(ValueError, "SHA256"):
                OnnxWindowScorer(directory)
            (directory / "model.onnx").write_bytes((self.out / "model.onnx").read_bytes())
            metadata = dict(self.manifest, model_sha256="z" * 64)
            (directory / "manifest.json").write_text(json.dumps(metadata), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid model SHA256"):
                OnnxWindowScorer(directory)
            metadata = dict(self.manifest, id="wrong-model-version")
            (directory / "manifest.json").write_text(json.dumps(metadata))
            with self.assertRaisesRegex(ValueError, "manifest/version"):
                OnnxWindowScorer(directory)

    def test_rejects_tampered_manifest_metadata_and_duplicate_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / "model.onnx").write_bytes((self.out / "model.onnx").read_bytes())
            manifest = directory / "manifest.json"
            for change in ({"training_rows": 1}, {"opset": 13.0},
                           {"builder_sources_sha256": "0" * 64}, {"extra": True}):
                with self.subTest(change=change):
                    manifest.write_text(json.dumps(dict(self.manifest, **change)))
                    with self.assertRaisesRegex(ValueError, "manifest"):
                        OnnxWindowScorer(directory)
            manifest.write_text('{"id":"wrong",' + json.dumps(self.manifest)[1:])
            with self.assertRaisesRegex(ValueError, "duplicate"):
                OnnxWindowScorer(directory)

    def test_rejects_invalid_model_even_with_matching_hash(self):
        model = create_graph(*train())
        model.graph.node[-1].op_type = "Relu"
        external = create_graph(*train())
        external.graph.initializer[0].data_location = 1
        external.graph.initializer[0].external_data.add(key="location", value="other")
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            for payload, reason in (
                (b"\xff", "malformed ONNX"),
                (model.SerializeToString(), "operator"),
                (external.SerializeToString(), "graph"),
                (b"X" * 1_000_001, "model size"),
            ):
                with self.subTest(reason=reason):
                    (directory / "model.onnx").write_bytes(payload)
                    meta = dict(self.manifest, model_sha256=sha256(payload).hexdigest())
                    (directory / "manifest.json").write_text(json.dumps(meta))
                    with self.assertRaisesRegex(ValueError, reason):
                        OnnxWindowScorer(directory)

    def test_batch_bounds_bad_values_and_pii(self):
        example = {"requests": 2, "seconds": 5, "errors": 0, "baseline_rps": 1}
        scores = self.scorer.score_many([example] * 32)
        self.assertEqual(len(scores), 32)
        np.testing.assert_allclose(scores, self.scorer.score(example), rtol=1e-6)
        for windows in ([], [{}], [1], [
            {"requests": 1, "seconds": 1, "errors": 2, "baseline_rps": 1}],
            [{"requests": 1, "seconds": 1, "errors": 0, "baseline_rps": 1, "ip": "secret"}],
            [{"requests": 1, "seconds": 1, "errors": 0, "baseline_rps": 1}] * 33):
            with self.subTest(windows=repr(windows)[:60]):
                with self.assertRaises(ValueError):
                    self.scorer.score_many(windows)

    def test_offline_cpu_execution_requires_no_socket(self):
        example = {"requests": 250, "seconds": 10, "errors": 100, "baseline_rps": 3}
        with patch.object(socket, "socket", side_effect=AssertionError("network attempted")):
            scorer = OnnxWindowScorer(self.out)
            self.assertGreaterEqual(scorer.score(example), 0)
        self.assertEqual(scorer.session.get_providers(), ["CPUExecutionProvider"])

    def test_real_benchmark_reports_latency(self):
        metrics = benchmark_run(self.out, iterations=10)
        self.assertEqual(metrics["model_sha256"], self.manifest["model_sha256"])
        self.assertEqual(metrics["timed_iterations"], 10)
        self.assertGreaterEqual(metrics["warm_p95_ms"], 0)
        self.assertEqual(metrics["status"], "local-tested")


if __name__ == "__main__":
    unittest.main()
