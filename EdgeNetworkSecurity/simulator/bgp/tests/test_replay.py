"""Offline route replay and negative input tests."""
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from replay import replay_text


def make(**fields):
    base = {"id": "x", "prefix": "203.0.113.0/24", "events": [
        {"type": "announce", "next_hop": "a", "as_path": [65001], "local_pref": 100}]}
    base.update(fields)
    return json.dumps(base)


class TestBGPReplay(unittest.TestCase):
    def test_withdraw_and_restore(self):
        result = replay_text((HERE / "withdraw-recovery.json").read_text())
        self.assertEqual(result["status"], "simulated")
        self.assertEqual([v["selected"]["next_hop"] if v["selected"] else None
                         for v in result["steps"]], ["edge-a", "edge-a", "edge-b", None, "edge-c"])

    def test_route_preference_over_path_length(self):
        events = [
            {"type": "announce", "next_hop": "long", "as_path": [1, 2, 3], "local_pref": 200},
            {"type": "announce", "next_hop": "short", "as_path": [4], "local_pref": 100}]
        result = replay_text(make(events=events))
        self.assertEqual(result["steps"][-1]["selected"]["next_hop"], "long")

    def test_tie_break_is_stable(self):
        events = [
            {"type": "announce", "next_hop": "b", "as_path": [5], "local_pref": 100},
            {"type": "announce", "next_hop": "a", "as_path": [6], "local_pref": 100}]
        self.assertEqual(replay_text(make(events=events))["steps"][-1]["selected"]["next_hop"], "a")

    def test_loop_and_invalid_asn(self):
        for path in ([12, 12], [True], [-1], [4294967296], [], [1] * 33):
            with self.subTest(path=path), self.assertRaises(ValueError):
                replay_text(make(events=[{"type": "announce", "next_hop": "a",
                                          "as_path": path, "local_pref": 100}]))

    def test_invalid_inputs(self):
        for data in (
            "", "not json", make(id="../bad"), make(prefix="203.0.113.1/24"),
            make(prefix="bad-network"), make(events=[]),
            make(events=[{"type": "withdraw", "next_hop": "../bad"}]),
            make(events=[{"type": "announce", "next_hop": "a",
                          "as_path": [12], "local_pref": True}]),
            make(events=[{"type": "announce", "next_hop": "a", "as_path": [12]}]),
        ):
            with self.subTest(data=data[:50]), self.assertRaises(ValueError):
                replay_text(data)

    def test_max_events(self):
        event = {"type": "withdraw", "next_hop": "a"}
        with self.assertRaisesRegex(ValueError, "events"):
            replay_text(make(events=[event] * 1001))


if __name__ == "__main__":
    unittest.main()
