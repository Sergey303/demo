"""Synthetic evaluation tests: python3 -m unittest discover -s EdgeAI/scenarios/traffic-anomaly-detection/tests -v."""
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from evaluate import evaluate_text  # noqa: E402


class TestQuality(unittest.TestCase):
    def test_authored_fixture_reports_both_errors(self):
        result = evaluate_text((HERE / "fixtures.jsonl").read_text(), threshold=0.5)
        self.assertEqual(result["records"], 12)
        self.assertGreater(result["counts"]["fp"], 0)
        self.assertGreater(result["counts"]["fn"], 0)
        self.assertEqual(result["status"], "simulated")
        self.assertIsNotNone(result["false_positive_rate"])

    def test_reproducible(self):
        fixture = (HERE / "fixtures.jsonl").read_text()
        self.assertEqual(evaluate_text(fixture), evaluate_text(fixture))

    def test_invalid_input(self):
        for data in ("", "garbage\n", '{"id":"x"}\n', "[]" + "\n"):
            with self.subTest(data=data):
                with self.assertRaises(ValueError):
                    evaluate_text(data)

    def test_threshold_boundary(self):
        with self.assertRaises(ValueError):
            evaluate_text((HERE / "fixtures.jsonl").read_text(), float("nan"))
        with self.assertRaises(ValueError):
            evaluate_text((HERE / "fixtures.jsonl").read_text(), 0)

    def test_duplicate_ids(self):
        fixture = (HERE / "fixtures.jsonl").read_text().splitlines()[0]
        with self.assertRaisesRegex(ValueError, "duplicate"):
            evaluate_text(fixture + "\n" + fixture)

    def test_rejects_boolean_label(self):
        with self.assertRaises(ValueError):
            evaluate_text('{"id":"b","label":true,"window":{"requests":5,"seconds":1,"errors":0,"baseline_rps":1}}')

    def test_rejects_too_many_records(self):
        line = '{"id":"x%04d","label":0,"window":{"requests":0,"seconds":1,"errors":0,"baseline_rps":1}}'
        with self.assertRaisesRegex(ValueError, "too many"):
            evaluate_text("\n".join(line % n for n in range(1001)))


if __name__ == "__main__":
    unittest.main()
