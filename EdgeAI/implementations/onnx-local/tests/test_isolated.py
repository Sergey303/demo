"""Native subprocess inference and bounded failure behavior."""
import errno
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from isolated import IsolatedWindowScorer

WINDOW = {"requests": 250, "seconds": 10, "errors": 45, "baseline_rps": 3}


@unittest.skipUnless(sys.platform == "linux", "Linux subprocess confinement")
class TestIsolated(unittest.TestCase):
    def test_native_cpu_batch(self):
        from build_model import build
        from runtime import OnnxWindowScorer

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            build(path)
            expected = OnnxWindowScorer(path).score_many([WINDOW] * 32)
            result = IsolatedWindowScorer(path, timeout_seconds=10).score_many([WINDOW] * 32)
            self.assertEqual(result.mode, "onnx-cpu")
            self.assertEqual(result.scores, tuple(expected))

    def test_missing_model_uses_rules_and_invalid_input_raises(self):
        with tempfile.TemporaryDirectory() as directory:
            scorer = IsolatedWindowScorer(Path(directory))
            with patch("isolated.Popen", side_effect=AssertionError("unexpected worker spawn")):
                result = scorer.score_many([WINDOW])
            self.assertEqual((result.mode, result.reason), ("rule-only", "unavailable"))
            self.assertEqual(result.scores, (0.616745,))
            with self.assertRaises(ValueError):
                scorer.score_many([dict(WINDOW, ip="excluded")])

    def test_deadline_kills_and_reaps_a_hung_child(self):
        self.assert_worker_failure("import time; time.sleep(30)", "timeout", 0.15)

    def test_deadline_applies_after_stdout_closes(self):
        self.assert_worker_failure(
            "import os, time; os.close(1); time.sleep(30)", "timeout", 0.15,
        )

    def test_oversized_output_kills_and_reaps_child(self):
        self.assert_worker_failure(
            "import os, time; os.write(1, b'x' * 4096); time.sleep(30)",
            "unavailable", 2,
        )

    def assert_worker_failure(self, code, reason, deadline):
        children = []

        def start_child(command, **kwargs):
            child = subprocess.Popen([sys.executable, "-I", "-c", code], **kwargs)
            children.append(child)
            return child

        start = time.monotonic()
        with tempfile.TemporaryDirectory() as artifacts:
            (Path(artifacts) / "manifest.json").write_text("{}", encoding="utf-8")
            (Path(artifacts) / "model.onnx").write_bytes(b"test")
            with patch("isolated.Popen", side_effect=start_child):
                result = IsolatedWindowScorer(
                    Path(artifacts), timeout_seconds=deadline
                ).score_many([WINDOW])
        self.assertLess(time.monotonic() - start, deadline + 0.75)
        self.assertEqual((result.mode, result.reason), ("rule-only", reason))
        self.assertEqual(result.scores, (0.616745,))
        child, = children
        self.assertEqual(child.returncode, -signal.SIGKILL)
        with self.assertRaises(ChildProcessError):
            os.waitpid(child.pid, os.WNOHANG)

    def test_invalid_reply_discards_the_entire_batch(self):
        def start_child(command, **kwargs):
            return subprocess.Popen(
                [sys.executable, "-I", "-c",
                 "import sys; sys.stdin.read(); print('[0.1, true]')"], **kwargs
            )

        with tempfile.TemporaryDirectory() as artifacts:
            (Path(artifacts) / "manifest.json").write_text("{}", encoding="utf-8")
            (Path(artifacts) / "model.onnx").write_bytes(b"test")
            with patch("isolated.Popen", side_effect=start_child):
                result = IsolatedWindowScorer(Path(artifacts)).score_many([WINDOW, WINDOW])
        self.assertEqual((result.mode, result.reason), ("rule-only", "unavailable"))
        self.assertEqual(result.scores, (0.616745, 0.616745))

    def test_socket_filter_is_enforced_in_child(self):
        result = subprocess.run(
            [sys.executable, "-I", "-B", "-c",
             "import sys, socket; sys.path.insert(0, sys.argv[1]); "
             "from _onnx_worker import deny_network; deny_network(); socket.socket()",
             str(HERE)], capture_output=True, timeout=3,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn(f"PermissionError: [Errno {errno.EPERM}]".encode(), result.stderr)
