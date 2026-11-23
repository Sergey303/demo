import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import run as runner
import scenario_worker
import task_inventory


class ScenarioTests(unittest.TestCase):
    def test_cli(self):
        process = subprocess.run([sys.executable, "-B", str(HERE / "run.py")],
                                 cwd=HERE, capture_output=True, check=True, timeout=25)
        evidence = json.loads(process.stdout)
        self.assertEqual(evidence["schema_version"], 1)
        self.assertEqual(evidence["status"], "ok")
        self.assertTrue(all(p["source_status"] == "blocked" for p in evidence["providers"].values()))
        stages = evidence["stages"]
        self.assertEqual(list(stages), list(runner.STAGES))
        self.assertEqual(stages["bgp"]["failure_cases"]["no_route_steps"], [3])
        self.assertEqual(stages["bgp"]["failure_cases"]["recovered_steps"], [4])
        self.assertEqual(stages["anycast"]["failure_cases"]["unassigned_stages"], ["all-down"])
        self.assertEqual(stages["anomaly"]["counters"]["fp"], 2)
        self.assertEqual(stages["policy"]["counters"]["model_fallbacks"], 2)
        self.assertEqual(stages["policy"]["counters"]["hard_blocked_benign"], 1)

    def test_real_timeout_returns_error(self):
        with patch.object(runner, "TIMEOUT_SECONDS", 0.001):
            outcome = runner.run_stage("bgp")
        self.assertEqual(outcome["source_status"], "error")
        self.assertEqual(outcome["error"], "timeout")

    def test_worker_failure_and_invalid_payloads(self):
        for payload, code, expected in (
            (b"", 2, "worker_failed"),
            (b"{}", 0, "invalid_evidence"),
            (b" " * (runner.MAX_OUTPUT + 1), 0, "invalid_evidence"),
        ):
            def child(command, *, stdout, **kwargs):
                stdout.write(payload)
                return subprocess.CompletedProcess(command, code)
            with self.subTest(expected=expected), patch.object(runner.subprocess, "run", child):
                self.assertEqual(runner.run_stage("policy")["error"], expected)

    def test_failure_keeps_remaining_stage_evidence(self):
        def stage(name):
            return {"source_status": "error" if name == "bgp" else "simulated"}

        with patch.object(runner, "run_stage", stage):
            report = runner.run()
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["stages"]["policy"]["source_status"], "simulated")

    def test_strict_json(self):
        for payload in ('{"x": {"a": 1, "a": 2}}', '{"x": NaN}', '{"x": 1e309}'):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                runner.strict_json(payload)

    def test_schema_rejects_boolean_counters_and_unknown_keys(self):
        report = {"source_status": "simulated", "dataset_sha256": "a" * 64,
                  "counters": {"steps": 1, "no_route_steps": 0},
                  "failure_cases": {"no_route_steps": [], "recovered_steps": []}}
        runner.validate("bgp", report)
        for changes in ({"steps": True}, {"extra": 1}, {"no_route_steps": 1}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                runner.validate("bgp", {**report, "counters": {**report["counters"], **changes}})

    def test_socket_and_process_denial(self):
        script = f"""
import sys
sys.path.insert(0, {str(HERE)!r})
import socket
import subprocess
from scenario_worker import deny_external_io
sys.addaudithook(deny_external_io)
for action in (socket.socket, lambda: subprocess.run([sys.executable, '-V'])):
    try:
        action()
    except PermissionError:
        continue
    raise AssertionError('external I/O was permitted')
"""
        subprocess.run([sys.executable, "-I", "-B", "-S", "-c", script], check=True, timeout=5)

    def test_policy_rejects_model_hard_block(self):
        report = {"records": 1, "new_observations": 0, "model_fallbacks": 0,
                  "hard_blocked_benign": 0, "rule_only": {"confusion": {}},
                  "assisted": {"confusion": {}}, "audit": [
                      {"rule_action": "allow", "assisted_action": "block", "source": "anomaly-advisory"},
                  ]}
        with self.assertRaises(ValueError):
            scenario_worker.policy_summary(report)


class InventoryTests(unittest.TestCase):
    def test_deduplicates_and_skips_mentions(self):
        from unittest.mock import MagicMock
        first, second = MagicMock(), MagicMock()
        first.__lt__ = lambda self, other: False
        second.__lt__ = lambda self, other: False
        first.read_text.return_value = """# EIS-42 — Example
**Status TODO.** Another item remains TODO.
- [x] Completed item
- [ ] Open item
- [ ] [Other task](../TASK.md)
```
TODO: Example text
```
"""
        second.read_text.return_value = "# EIS-42 — Example\nTODO: open item.\n"
        tasks = task_inventory.collect([first, second])
        self.assertEqual(list(tasks), ["EIS-42"])
        task = tasks["EIS-42"]
        self.assertEqual(len(task.sources), 2)
        self.assertEqual(list(task.followups), ["open item"])
        self.assertEqual(len(task.followups["open item"][1]), 2)

    def test_checked_in_inventory(self):
        subprocess.run([sys.executable, "-B", str(HERE / "task_inventory.py"), "--check"],
                       check=True, timeout=5)
