"""Dependency-free checks for versioned ONNX input contract."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from features import MODEL_ID, FEATURE_NAMES, vectorize


class FeatureTests(unittest.TestCase):
    def test_known_values(self):
        features = vectorize({"requests": 100, "seconds": 10,
                              "errors": 25, "baseline_rps": 2})
        self.assertEqual(len(features), 4)
        self.assertAlmostEqual(features[0], 0.3125)
        self.assertAlmostEqual(features[1], 0.25)
        self.assertAlmostEqual(features[2], 0.1)
        self.assertAlmostEqual(features[3], 100 / 3000)

    def test_zero_traffic(self):
        self.assertEqual(vectorize({"requests": 0, "seconds": 30, "errors": 0,
                                    "baseline_rps": 0}), [0.0] * 4)

    def test_rejects_untrusted_values(self):
        good = {"requests": 10, "seconds": 5, "errors": 0, "baseline_rps": 2}
        bad = [
            dict(good, requests=True), dict(good, requests=-1),
            dict(good, errors=11), dict(good, seconds=0),
            dict(good, baseline_rps=float("nan")),
            dict(good, baseline_rps=float("inf")),
            dict(good, baseline_rps=10**400),
            dict(good, ip="127.0.0.1"), dict(good, baseline_rps=-1),
        ]
        for window in bad:
            with self.subTest(window=window), self.assertRaises(ValueError):
                vectorize(window)

    def test_stable_feature_schema(self):
        self.assertEqual(MODEL_ID, "synthetic-window-logreg-v1")
        self.assertEqual(len(FEATURE_NAMES), 4)


if __name__ == "__main__":
    unittest.main()
