"""Anycast routing, failure, overload, and negative tests."""
from pathlib import Path
import json
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from model import Site, Client, route
from replay import replay_text


class TestAnycast(unittest.TestCase):
    def test_failover_overload_session_break(self):
        stages = replay_text((HERE / "two-sites-failover.json").read_text())["stages"]
        self.assertEqual(len(stages), 4)
        self.assertEqual(stages[0]["overloaded_sites"], ["edge-a"])
        self.assertEqual(stages[0]["site_load"]["edge-a"]["load_rps"], 210)
        self.assertEqual(stages[1]["overloaded_sites"], ["edge-b"])
        self.assertEqual(stages[1]["site_load"]["edge-b"]["load_rps"], 260)
        self.assertEqual(stages[1]["interrupted_sessions"], ["client-1", "client-2"])
        self.assertEqual(stages[2]["interrupted_sessions"], ["client-1", "client-2"])
        self.assertEqual(stages[3]["unassigned_clients"], ["client-1", "client-2", "client-3"])
        self.assertEqual(stages[3]["interrupted_sessions"], ["client-1", "client-2", "client-3"])

    def test_tie_break_and_no_load_balance(self):
        sites = [Site("z", 1), Site("a", 1)]
        clients = [Client("c", 3, {"z": 5, "a": 5})]
        outcome = route(sites, clients)
        self.assertEqual(outcome["assignments"]["c"], "a")
        self.assertEqual(outcome["overloaded_sites"], ["a"])

    def test_unreachable_and_session_failure(self):
        sites = [Site("a", 10, healthy=False)]
        clients = [Client("c", 1, {"a": 10})]
        actual = route(sites, clients, previous={"c": "a"})
        self.assertIsNone(actual["assignments"]["c"])
        self.assertEqual(actual["interrupted_sessions"], ["c"])

    def test_reject_bad_models(self):
        with self.assertRaises(ValueError):
            Site("bad/site", 5)
        with self.assertRaises(ValueError):
            Site("a", True)
        with self.assertRaises(ValueError):
            Client("c", -1, {"a": 1})
        with self.assertRaises(ValueError):
            Client("c", 1, {"a": True})
        with self.assertRaises(ValueError):
            route([Site("a", 5), Site("a", 5)], [Client("c", 1, {"a": 3})])
        with self.assertRaises(ValueError):
            route([Site("a", 5)], [Client("c", 1, {"missing": 3})])

    def test_reject_invalid_stage(self):
        source = json.loads((HERE / "two-sites-failover.json").read_text())
        for wrong in ({"id": "fail", "disabled": ["missing"]},
                      {"id": "bad", "disabled": ["edge-a", "edge-a"]},
                      {"id": "../x", "disabled": []},
                      {"id": "bad", "disabled": "edge-a"}):
            with self.subTest(wrong=wrong):
                data = dict(source, stages=[wrong])
                with self.assertRaises((ValueError, TypeError)):
                    replay_text(json.dumps(data))

    def test_repeatable_fixture(self):
        data = (HERE / "two-sites-failover.json").read_text()
        self.assertEqual(replay_text(data), replay_text(data))
        self.assertEqual(replay_text(data)["status"], "simulated")


if __name__ == "__main__":
    unittest.main()
