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
from build_model import build, train
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
        expected = float(1.0 / (1.0 + np.exp(-float(x @ w + b))))
        self.assertAlmostEqual(predicted, expected, places=5)

    def test_reproducible_model_bytes_and_sha(self):
        with tempfile.TemporaryDirectory() as second:
            metadata = build(Path(second))
            self.assertEqual(metadata["model_sha256"], self.manifest["model_sha256"])
            self.assertEqual(sha256((self.out / "model.onnx").read_bytes()).hexdigest(),
                             self.manifest["model_sha256"])

    def test_tampering_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / "model.onnx").write_bytes((self.out / "model.onnx").read_bytes() + b"X")
            (directory / "manifest.json").write_bytes((self.out / "manifest.json").read_bytes())
            with self.assertRaisesRegex(ValueError, "SHA256"):
                OnnxWindowScorer(directory)
            (directory / "model.onnx").write_bytes((self.out / "model.onnx").read_bytes())
            metadata = dict(self.manifest, id="wrong-model-version")
            (directory / "manifest.json").write_text(json.dumps(metadata))
            with self.assertRaisesRegex(ValueError, "manifest/version"):
                OnnxWindowScorer(directory)

    def test_batch_bounds_bad_values_and_pii(self):
        self.assertEqual(len(self.scorer.score_many([
            {"requests": 2, "seconds": 5, "errors": 0, "baseline_rps": 1}] * 2)), 2)
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
            self.assertGreaterEqual(self.scorer.score(example), 0)
        self.assertEqual(self.scorer.session.get_providers(), ["CPUExecutionProvider"])

    def test_real_benchmark_reports_latency(self):
        metrics = benchmark_run(self.out, iterations=10)
        self.assertEqual(metrics["model_sha256"], self.manifest["model_sha256"])
        self.assertEqual(metrics["timed_iterations"], 10)
        self.assertGreaterEqual(metrics["warm_p95_ms"], 0)
        self.assertEqual(metrics["status"], "local-tested")


if __name__ == "__main__":
    unittest.main()
