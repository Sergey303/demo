import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "scenarios/image-inference/inference.py"
MAINTENANCE = "scenarios/predictive-maintenance/evaluate.py"
OFFLINE = "scenarios/offline-inference/run.py"
BENCHMARK = "benchmarks/compare.py"


class LocalExamples(unittest.TestCase):
    def cli(self, script, *args):
        return subprocess.run(
            [sys.executable, "-B", str(ROOT / script), *args],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )

    def test_image_holdout_and_raw_image(self):
        result = json.loads(self.cli(IMAGE).stdout)
        self.assertEqual(result["holdout"]["records"], 6)
        self.assertEqual(result["training_records"], 4)
        self.assertEqual(result["holdout"]["accuracy"], 1.0)
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            path = Path(directory) / "image.pgm"
            path.write_bytes(b"P5\n8 8\n255\n" + bytes([20, 20, 220, 220, 20, 20, 20, 20] * 8))
            self.assertEqual(json.loads(self.cli(IMAGE, "--image", str(path)).stdout)["label"], "vertical")
            path.write_bytes(b"P5\n8 8\n255\n" + bytes(64))
            self.assertIsNone(json.loads(self.cli(IMAGE, "--image", str(path)).stdout)["label"])
            for payload in (b"P5\n8 8\n255\n\x00", b"P5\n4 16\n255\n" + bytes(64)):
                with self.subTest(payload=payload):
                    path.write_bytes(payload)
                    with self.assertRaises(subprocess.CalledProcessError) as error:
                        self.cli(IMAGE, "--image", str(path))
                    self.assertIn("PGM", error.exception.stderr)

    def test_maintenance_scores_alerts_and_gaps(self):
        result = json.loads(self.cli(MAINTENANCE).stdout)
        self.assertLess(result["train_end"], result["holdout_start"])
        self.assertEqual(result["counts"], {"tp": 2, "fp": 1, "tn": 4, "fn": 1})
        self.assertEqual(result["lead_minutes"], [2])
        self.assertEqual(result["skipped"], {"missing": 1, "delayed": 1})

    def test_offline_runs_real_classifier_with_socket_guard(self):
        result = json.loads(self.cli(OFFLINE).stdout)
        self.assertTrue(result["socket_probe_denied"])
        self.assertEqual(result["network_attempts_during_inference"], 0)
        self.assertEqual(result["evaluation"], json.loads(self.cli(IMAGE).stdout))

    def test_requested_onnx_does_not_fall_back_when_artifacts_are_missing(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            for script in (OFFLINE, BENCHMARK):
                with self.subTest(script=script), self.assertRaises(subprocess.CalledProcessError):
                    self.cli(script, "--onnx-artifacts", directory)

    def test_benchmark_measures_all_fixture_rows(self):
        result = json.loads(self.cli(BENCHMARK, "--iterations", "2").stdout)
        self.assertEqual(result["dataset"]["records"], 12)
        run = result["runs"][0]
        self.assertEqual(run["counts"], {"tp": 3, "tn": 4, "fp": 2, "fn": 3})
        self.assertEqual(run["timed_predictions"], 24)
        self.assertGreaterEqual(run["warm_ms"]["p99"], run["warm_ms"]["p50"])
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            path = Path(directory) / "empty.jsonl"
            path.touch()
            with self.assertRaises(subprocess.CalledProcessError) as error:
                self.cli(BENCHMARK, "--dataset", str(path))
            self.assertIn("empty dataset", error.exception.stderr)


if __name__ == "__main__":
    unittest.main()
