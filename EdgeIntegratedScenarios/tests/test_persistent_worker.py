"""Stdlib transport tests; opt-in native tests require the pinned ONNX venv."""
import importlib.util
import io
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

EIS = Path(__file__).resolve().parents[1]
SCRIPT = EIS / "ai-assisted-ddos-defense" / "persistent_worker.py"
ONNX_DIR = EIS.parent / "EdgeAI" / "implementations" / "onnx-local"
WINDOW = dict(requests=10, seconds=1, errors=0, baseline_rps=10)
PAYLOAD = json.dumps(WINDOW).encode() + b"\n"
READY = b'{"schema_version":1,"kind":"ready","model":"onnx-cpu"}\n'
ERROR = b"persistent worker failed\n"


def load_worker():
    spec = importlib.util.spec_from_file_location("persistent_worker", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def command(directory, *extra):
    return [sys.executable, "-I", "-B", str(SCRIPT), "--artifact-dir", str(directory), *extra]


def line(child, timeout=10):
    # Unbuffered child stdout avoids hidden read-ahead when using selectors.
    with selectors.DefaultSelector() as selector:
        selector.register(child.stdout, selectors.EVENT_READ)
        if not selector.select(timeout):
            raise TimeoutError("worker response deadline")
    return child.stdout.readline()


class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.worker = load_worker()

    def test_two_requests_single_scorer_and_flush_per_frame(self):
        scorer = Mock()
        scorer.score.side_effect = [0.2, 0.8]
        output = Mock(wraps=io.BytesIO())
        self.worker.serve(scorer, 0.8, io.BytesIO(PAYLOAD * 2), output)
        self.assertEqual(output.flush.call_count, 3)
        rows = output.write.call_args_list
        self.assertEqual(rows[0].args[0], READY)
        for row, action, score in zip(rows[1:], ["allow", "observe"], [0.2, 0.8]):
            data = row.args[0]
            self.assertLessEqual(len(data), 2048)
            self.assertEqual(json.loads(data), dict(schema_version=1, action=action,
                source="onnx-cpu", score=score, fallback="none", status="simulated",
                policy_id="demo-policy-v1"))
        self.assertEqual(scorer.score.call_count, 2)

    def test_strict_frames_and_bounds(self):
        bad = [b"\n", b"{}\n", b"[]\n", b"null\n", b"\xff\n", PAYLOAD[:-1],
               PAYLOAD[:-2] + b',"requests":10}\n',
               PAYLOAD[:-2] + b',"private_marker":0}\n', b"[" * 1500 + b"]" * 1500 + b"\n"]
        bad.append(PAYLOAD[:-1] + b"{}\n")
        for field, values in {
            "requests": [True, -1, 10_000_001, 1.0, {}, []],
            "seconds": [False, 0, 3601, 1.0],
            "errors": [True, -1, 11, None],
            "baseline_rps": [False, -1, 10_000_001, 0.0, float("nan"), float("inf"), -float("inf")],
        }.items():
            bad.extend(json.dumps(dict(WINDOW, **{field: value})).encode() + b"\n" for value in values)
        bad.extend([b" " * 4096 + b"\n", PAYLOAD[:-1].ljust(4096) + b"\n"])
        for payload in bad:
            with self.subTest(payload=payload[:90]):
                scorer = Mock()
                destination = io.BytesIO()
                with self.assertRaises((ValueError, RecursionError)):
                    self.worker.serve(scorer, 0.8, io.BytesIO(payload), destination)
                self.assertEqual(destination.getvalue(), READY)
                scorer.score.assert_not_called()
        for window in [dict(requests=0, seconds=1, errors=0, baseline_rps=0),
                       dict(requests=10_000_000, seconds=3600, errors=10_000_000, baseline_rps=10_000_000)]:
            self.assertEqual(self.worker.read_window(io.BytesIO(json.dumps(window).encode() + b"\n")), window)
        self.assertEqual(self.worker.read_window(io.BytesIO(PAYLOAD[:-1].ljust(4095) + b"\n")), WINDOW)
        self.assertIsNone(self.worker.read_window(io.BytesIO()))

    def test_inference_failure_never_emits_score(self):
        for score in [True, None, "0.5", float("nan"), float("inf"), -0.1, 1.1]:
            output = io.BytesIO()
            with self.assertRaises(ValueError):
                self.worker.serve(Mock(score=Mock(return_value=score)), 0.8, io.BytesIO(PAYLOAD), output)
            self.assertEqual(output.getvalue(), READY)
        output = io.BytesIO()
        with self.assertRaises(RuntimeError):
            self.worker.serve(Mock(score=Mock(side_effect=RuntimeError("private"))),
                              0.8, io.BytesIO(PAYLOAD), output)
        self.assertEqual(output.getvalue(), READY)

    def test_seccomp_precedes_runtime_import_and_single_constructor(self):
        events = []
        worker = self.worker
        original_import = __import__
        scorer = object()
        def checked_import(name, *args, **kwargs):
            if name == "runtime":
                self.assertEqual(events, ["filter"])
                events.append("import")
            return original_import(name, *args, **kwargs)
        runtime = types.ModuleType("runtime")
        runtime.OnnxWindowScorer = Mock(return_value=scorer)
        filter_module = types.ModuleType("_onnx_worker")
        filter_module.deny_network = Mock(side_effect=lambda: events.append("filter"))
        with patch.dict(sys.modules, runtime=runtime, _onnx_worker=filter_module), \
                patch("builtins.__import__", side_effect=checked_import), patch.object(sys, "platform", "linux"):
            self.assertIs(worker.load_scorer(EIS), scorer)
        runtime.OnnxWindowScorer.assert_called_once_with(EIS)
        filter_module.deny_network.side_effect = RuntimeError("unsupported")
        runtime.OnnxWindowScorer.reset_mock()
        with patch.dict(sys.modules, runtime=runtime, _onnx_worker=filter_module), patch.object(sys, "platform", "linux"):
            with self.assertRaises(RuntimeError):
                worker.load_scorer(EIS)
        runtime.OnnxWindowScorer.assert_not_called()
        with patch.object(sys, "platform", "win32"):
            with self.assertRaises(RuntimeError):
                worker.load_scorer(EIS)

    def test_startup_failures_are_redacted_no_ready(self):
        with tempfile.TemporaryDirectory(dir=EIS) as directory:
            for extra in [("--threshold", "nan"), ("--threshold", "inf"),
                          ("--threshold", "-0.1"), ("--threshold", "1.1"),
                          ("--threshold", "private_marker"), ("--unknown",), ()]:
                result = subprocess.run(command(directory, *extra), input=b"", capture_output=True, timeout=10)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, b"")
                self.assertEqual(result.stderr, ERROR)
        for directory in ["relative/private_marker", str(EIS / "absent-private-marker")]:
            result = subprocess.run(command(directory), capture_output=True, timeout=10)
            self.assertEqual((result.stdout, result.stderr), (b"", ERROR))
            self.assertNotEqual(result.returncode, 0)

    @unittest.skipUnless(sys.platform == "linux", "Linux seccomp")
    def test_subprocess_serial_protocol_deadline_and_redacted_failures(self):
        # Only the scorer is a fixture; real worker startup/filter/pipe handling.
        harness = """import sys, types, runpy
runtime = types.ModuleType('runtime')
class Scorer:
    count = 0
    def __init__(self, directory):
        Scorer.count += 1
        assert Scorer.count == 1
        print('private native startup diagnostic', flush=True)
        print('private native diagnostic', file=sys.stderr, flush=True)
    def score(self, window):
        if window['requests'] == 13: raise RuntimeError('private inference failure')
        return 0.8
runtime.OnnxWindowScorer = Scorer
sys.modules['runtime'] = runtime
script = sys.argv.pop(1)
runpy.run_path(script, run_name='__main__')
"""
        for payload in [b"{}\n", b" " * 4097, b"\xff\n",
                        json.dumps(dict(WINDOW, requests=13)).encode() + b"\n"]:
            result = subprocess.run([sys.executable, "-I", "-B", "-c", harness,
                str(SCRIPT), "--artifact-dir", str(EIS)], input=payload,
                capture_output=True, timeout=5)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, READY)
            self.assertEqual(result.stderr, ERROR)
        child = subprocess.Popen([sys.executable, "-I", "-B", "-c", harness,
            str(SCRIPT), "--artifact-dir", str(EIS)], stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
        try:
            self.assertEqual(line(child), READY)
            for _ in range(2):
                child.stdin.write(PAYLOAD)
                child.stdin.flush()
                self.assertEqual(json.loads(line(child))["action"], "observe")
                self.assertIsNone(child.poll())
            child.stdin.write(PAYLOAD[:-1])
            child.stdin.flush()
            with self.assertRaises(TimeoutError):
                line(child, timeout=0.1)
            child.kill()
            child.wait(timeout=5)
            self.assertEqual(child.stdout.read(), b"")
            self.assertEqual(child.stderr.read(), b"")
        finally:
            NativeTests.cleanup_child(child)

    @unittest.skipUnless(sys.platform == "linux", "Linux seccomp")
    def test_real_seccomp_denies_socket_syscalls(self):
        # No socket can be opened: both Python and direct libc must get EPERM.
        program = '''import sys, ctypes, errno
sys.path.insert(0, sys.argv[1])
from _onnx_worker import deny_network
deny_network()
import socket
for family in (socket.AF_INET, socket.AF_INET6, socket.AF_UNIX):
    try: socket.socket(family, socket.SOCK_STREAM)
    except OSError as e: assert e.errno == errno.EPERM
    else: raise AssertionError('socket allowed')
try: socket.socketpair()
except OSError as e: assert e.errno == errno.EPERM
else: raise AssertionError('socketpair allowed')
libc = ctypes.CDLL(None, use_errno=True)
assert libc.socket(2, 1, 0) == -1 and ctypes.get_errno() == errno.EPERM
'''
        result = subprocess.run([sys.executable, "-I", "-B", "-c", program, str(ONNX_DIR)], capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)


@unittest.skipUnless(os.getenv("RUN_EDGE_PERSISTENT_ONNX_TESTS") == "1", "opt-in pinned native ONNX venv")
class NativeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import importlib.metadata
        for name, version in [("numpy", "2.2.6"), ("onnx", "1.19.1"), ("onnxruntime", "1.23.2")]:
            if importlib.metadata.version(name) != version:
                raise RuntimeError("pinned ONNX dependencies required")
        if sys.prefix == sys.base_prefix:
            raise RuntimeError("use a pinned virtual environment")
        cls.tmp = tempfile.TemporaryDirectory(dir=EIS)
        cls.directory = Path(cls.tmp.name)
        sys.path.insert(0, str(ONNX_DIR))
        try:
            from build_model import build
            build(cls.directory)
        finally:
            sys.path.pop(0)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def child(self):
        child = subprocess.Popen(command(self.directory), stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
        self.addCleanup(self.cleanup_child, child)
        self.assertEqual(line(child), READY)
        return child

    @staticmethod
    def cleanup_child(child):
        if child.poll() is None:
            child.kill()
        child.wait(timeout=5)
        for stream in (child.stdin, child.stdout, child.stderr):
            stream.close()

    def test_two_sequential_requests_same_pid_and_session(self):
        child = self.child()
        pid = child.pid
        # Deleting artifacts after ready makes any repeated constructor fail.
        with tempfile.TemporaryDirectory(dir=EIS) as saved:
            for name in ("model.onnx", "manifest.json"):
                (self.directory / name).rename(Path(saved) / name)
            try:
                for window in [WINDOW, dict(requests=100, seconds=1, errors=100, baseline_rps=1)]:
                    child.stdin.write(json.dumps(window).encode() + b"\n")
                    child.stdin.flush()
                    response = line(child)
                    expected = json.loads(response)
                    score = expected.pop("score")
                    self.assertIs(type(score), float)
                    self.assertTrue(0 <= score <= 1)
                    self.assertEqual(expected, dict(schema_version=1, action="observe" if score >= 0.8 else "allow",
                        source="onnx-cpu", fallback="none", status="simulated", policy_id="demo-policy-v1"))
                    self.assertLessEqual(len(response), 2048)
                    self.assertEqual(child.pid, pid)
                    self.assertIsNone(child.poll())
            finally:
                for name in ("model.onnx", "manifest.json"):
                    (Path(saved) / name).rename(self.directory / name)
        child.stdin.close()
        child.wait(timeout=5)
        self.assertEqual(child.returncode, 0)
        self.assertEqual(child.stdout.read(), b"")
        self.assertEqual(child.stderr.read(), b"")

    def test_bad_frames_exit_without_response(self):
        for payload in [b"{}\n", b" " * 4097, b"\xff\n", PAYLOAD[:-2] + b',"requests":10}\n']:
            child = self.child()
            child.stdin.write(payload)
            child.stdin.flush()
            child.wait(timeout=5)
            self.assertNotEqual(child.returncode, 0)
            self.assertEqual(child.stdout.read(), b"")
            self.assertEqual(child.stderr.read(), ERROR)

    def test_parent_deadline_kills_incomplete_frame_and_restarts(self):
        child = self.child()
        child.stdin.write(PAYLOAD[:-1])
        child.stdin.flush()
        with self.assertRaises(TimeoutError):
            line(child, timeout=0.1)
        child.kill()
        child.wait(timeout=5)
        replacement = self.child()
        self.assertNotEqual(child.pid, replacement.pid)
        replacement.stdin.write(PAYLOAD)
        replacement.stdin.flush()
        self.assertEqual(json.loads(line(replacement))["source"], "onnx-cpu")


if __name__ == "__main__":
    unittest.main()
