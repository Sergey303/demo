"""Cross-project integration: actual ONNX inference, never automatic model blocking.

Requires explicit ONNX dependencies and must run in the separate ONNX CI job.
"""
from __future__ import annotations
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ONNX_DIR = ROOT / "EdgeAI" / "implementations" / "onnx-local"
INTEGRATED = ROOT / "EdgeIntegratedScenarios" / "ai-assisted-ddos-defense"
sys.path.insert(0, str(ONNX_DIR))
sys.path.insert(0, str(INTEGRATED))
sys.path.insert(0, str(INTEGRATED.parent))

from build_model import build
from onnx_replay import evaluate_onnx
from run_http import onnx_score


class RealOnnxPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.artifact_dir = Path(cls.tmp.name)
        build(cls.artifact_dir)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_real_cpu_inference_policy_is_observe_only(self):
        fixture = (INTEGRATED / "fixtures.jsonl").read_text(encoding="utf-8")
        report = evaluate_onnx(fixture, self.artifact_dir, threshold=0.5)
        self.assertEqual(report["status"], "simulated")
        self.assertEqual(report["records"], 12)
        self.assertEqual(report["model"]["provider"], "CPUExecutionProvider")
        self.assertEqual(len(report["model"]["model_sha256"]), 64)
        self.assertEqual(report["hard_blocked_benign"], 1)  # from RULE only
        self.assertEqual(report["rule_only"]["confusion"], {"tp": 1, "tn": 5, "fp": 2, "fn": 4})
        self.assertTrue(all(
            event["rule_action"] == "block" or event["assisted_action"] != "block"
            for event in report["audit"]
        ))

    def test_http_window_scores_in_cpu_subprocess(self):
        score, metadata = onnx_score(
            {"requests": 10, "seconds": 1, "errors": 6, "baseline_rps": 1},
            self.artifact_dir,
        )
        self.assertEqual(metadata["status"], "scored")
        self.assertEqual(metadata["kind"], "onnx_cpu")
        self.assertTrue(0 <= score <= 1)

    def test_missing_model_fails_before_replay(self):
        with tempfile.TemporaryDirectory() as missing:
            with self.assertRaisesRegex(ValueError, "Model or manifest absent"):
                evaluate_onnx("{}", Path(missing))


if __name__ == "__main__":
    unittest.main()
