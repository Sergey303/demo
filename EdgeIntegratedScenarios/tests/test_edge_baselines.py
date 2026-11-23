"""Offline cross-project contract smoke; run: python -m unittest discover -s EdgeIntegratedScenarios/tests -v."""
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


bgp = load("demo_edge_bgp", "EdgeNetworkSecurity/simulator/bgp/model.py")
anomaly = load("demo_edge_anomaly", "EdgeAI/scenarios/traffic-anomaly-detection/baseline.py")
policy = load("demo_edge_policy", "EdgeIntegratedScenarios/ai-assisted-ddos-defense/policy.py")


class TestBGP(unittest.TestCase):
    def test_preference_withdrawal(self):
        t = bgp.RouteTable()
        t.announce(bgp.Route("203.0.113.0/24", "a", (1, 2, 3), 200))
        t.announce(bgp.Route("203.0.113.0/24", "b", (4,), 100))
        self.assertEqual(t.select("203.0.113.0/24").next_hop, "a")
        t.withdraw("203.0.113.0/24", "a")
        self.assertEqual(t.select("203.0.113.0/24").next_hop, "b")
        t.withdraw("203.0.113.0/24", "b")
        self.assertIsNone(t.select("203.0.113.0/24"))

    def test_loop(self):
        with self.assertRaises(ValueError):
            bgp.Route("prefix", "a", (12, 12))

    def test_tie(self):
        a, b = bgp.Route("p", "a", (1,)), bgp.Route("p", "b", (2,))
        self.assertEqual(bgp.best_route([b, a], "p"), a)


class TestAnomaly(unittest.TestCase):
    def test_bounded(self):
        self.assertEqual(anomaly.score(anomaly.Window(0, 10, 0, 1)), 0)
        self.assertGreater(anomaly.score(anomaly.Window(1000, 10, 200, 1)), 0.5)

    def test_bad_errors(self):
        with self.assertRaises(ValueError):
            anomaly.Window(2, 1, 3, 1)


class TestPolicy(unittest.TestCase):
    def test_ai_advisory_only(self):
        self.assertEqual(policy.decide("allow", 0.99).action, "observe")
        self.assertEqual(policy.decide("block", 0.01).action, "block")

    def test_fail_safe_fallback(self):
        self.assertEqual(policy.decide("allow", float("nan")).source, "rule-fallback")
        self.assertEqual(policy.decide("observe", None).action, "observe")

    def test_threshold(self):
        self.assertEqual(policy.decide("allow", 0.8).action, "observe")
        self.assertEqual(policy.decide("allow", 0.79).action, "allow")


if __name__ == "__main__":
    unittest.main()
