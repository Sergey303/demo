"""Offline decision replay tests; no network or provider resources required."""
from pathlib import Path
import json
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from replay import evaluate_text  # noqa: E402


def record(**overrides):
    item = {
        "id": "synthetic-01",
        "label": 0,
        "rule_action": "allow",
        "window": {"requests": 50, "seconds": 60, "errors": 0, "baseline_rps": 2},
        "model_failure": False,
    }
    item.update(overrides)
    return json.dumps(item)


class TestReplay(unittest.TestCase):
    def test_fixture_reports_tradeoff(self):
        result = evaluate_text((HERE / "fixtures.jsonl").read_text())
        self.assertEqual(result["records"], 12)
        self.assertEqual(result["rule_only"]["confusion"], {"tp": 1, "tn": 5, "fp": 2, "fn": 4})
        self.assertEqual(result["assisted"]["confusion"], {"tp": 3, "tn": 4, "fp": 3, "fn": 2})
        self.assertEqual(result["model_fallbacks"], 2)
        self.assertEqual(result["new_observations"], 3)
        self.assertEqual(result["hard_blocked_benign"], 1)
        self.assertEqual(result["status"], "simulated")
        self.assertEqual(len(result["audit"]), 12)
        self.assertTrue(all(item["status"] == "simulated" and item["policy_id"] == "demo-policy-v1"
                            for item in result["audit"]))

    def test_repeatable(self):
        data = (HERE / "fixtures.jsonl").read_text()
        self.assertEqual(evaluate_text(data), evaluate_text(data))

    def test_advisory_never_automatic_block(self):
        result = evaluate_text(record(), scorer=lambda _: 1.0)
        self.assertEqual(result["assisted"]["confusion"]["fp"], 1)
        self.assertEqual(result["hard_blocked_benign"], 0)

    def test_rule_block_skips_model(self):
        def forbidden(_):
            raise AssertionError("model must not run for blocked requests")
        result = evaluate_text(record(rule_action="block", label=1), scorer=forbidden)
        self.assertEqual(result["assisted"]["confusion"]["tp"], 1)

    def test_model_exception_fallback(self):
        def timed_out(_):
            raise TimeoutError("simulated outage")
        report = evaluate_text(record(), scorer=timed_out)
        self.assertEqual(report["model_fallbacks"], 1)
        self.assertEqual(report["assisted"]["confusion"]["tn"], 1)

    def test_invalid_model_score_fallback(self):
        for score in (float("nan"), float("inf"), -1, 2, "invalid"):
            with self.subTest(score=score):
                result = evaluate_text(record(), scorer=lambda _: score)
                self.assertEqual(result["model_fallbacks"], 1)

    def test_reject_bad_inputs(self):
        for data in ("", "not json", "{}", record(id="../unsafe"), record(label=True),
                     record(model_failure="false"), record(window={}),
                     record(rule_action="challenge")):
            with self.subTest(data=data):
                with self.assertRaises(ValueError):
                    evaluate_text(data)

    def test_reject_duplicate_ids(self):
        data = record() + "\n" + record()
        with self.assertRaises(ValueError):
            evaluate_text(data)

    def test_always_validates_window_even_with_mock_scorer(self):
        with self.assertRaises(ValueError):
            evaluate_text(record(window={"requests": -1, "seconds": 1, "errors": 0,
                                         "baseline_rps": 1}), scorer=lambda _: 0)

    def test_threshold_validated(self):
        for value in (float("nan"), float("inf"), 0, -1, 1.1, True):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    evaluate_text(record(), threshold=value)


if __name__ == "__main__":
    unittest.main()
