"""Controller lifecycle tests; no Docker, no network."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

CONTROLLER = Path(__file__).resolve().parents[1] / "tools" / "primary_gate.py"
spec = importlib.util.spec_from_file_location("primary_gate", CONTROLLER)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


@unittest.skipUnless(os.name == "posix", "Requires a Unix local filesystem")
class PrimaryGateControllerTests(unittest.TestCase):
    def test_requires_fencing_and_waits_full_window(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "primary"
            with self.assertRaises(ValueError):
                gate.control(path, "a" * 40, window=1)
            self.assertFalse(path.exists())
            start = time.monotonic()
            gate.control(path, "a" * 40, window=1, max_clock_delta_ms=50, fenced=True)
            self.assertGreaterEqual(time.monotonic() - start, 1.05)
            self.assertEqual(path.read_text(), "1000:" + "a" * 40 + "\n")
            gate.control(path)
            self.assertEqual(path.read_text(), "closed\n")

    def test_controller_death_keeps_gate_closed_and_restart_waits_again(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "primary"
            gate.publish(path, "1000:" + "a" * 40 + "\n")
            process = subprocess.Popen([sys.executable, str(CONTROLLER), str(path),
                                        "--run-id", "b" * 40, "--window", "1",
                                        "--old-primary-fenced"])
            try:
                deadline = time.monotonic() + 3
                while path.read_text() != "closed\n":
                    self.assertLess(time.monotonic(), deadline)
                    time.sleep(.02)
            finally:
                process.kill()
                process.wait(timeout=3)
            self.assertEqual(path.read_text(), "closed\n")
            start = time.monotonic()
            gate.control(path, "b" * 40, window=1, fenced=True)
            self.assertGreaterEqual(time.monotonic() - start, 1)
            self.assertEqual(path.read_text(), "1000:" + "b" * 40 + "\n")
