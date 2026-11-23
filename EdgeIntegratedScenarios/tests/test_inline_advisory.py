"""CLI boundary tests, plus opt-in native CPU inference."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from time import monotonic
import unittest
from unittest.mock import patch

EIS = Path(__file__).resolve().parents[1]
SCRIPT = EIS / "ai-assisted-ddos-defense" / "inline_advisory.py"
ONNX_DIR = EIS.parent / "EdgeAI" / "implementations" / "onnx-local"
WINDOW = {"requests": 0, "seconds": 1, "errors": 0, "baseline_rps": 0}
PAYLOAD = json.dumps(WINDOW).encode()


def command(*extra, timeout="2500", threshold="0.8"):
    return [sys.executable, "-I", "-B", str(SCRIPT), "--timeout-ms", timeout,
            "--threshold", threshold, *extra]


def invoke(payload=PAYLOAD, *extra, **flags):
    return subprocess.run(command(*extra, **flags), input=payload,
                          capture_output=True, timeout=5)


def load_cli():
    spec = importlib.util.spec_from_file_location("inline_advisory", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ResponseAssertions:
    def assert_rejected(self, result):
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b"")
        self.assertEqual(result.stderr, b"inline advisory failed\n")

    def assert_response(self, result, *, source, fallback, action, score=None):
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, b"")
        expected = dict(schema_version=1, action=action, source=source,
                        fallback=fallback, status="simulated", policy_id="demo-policy-v1")
        response = json.loads(result.stdout)
        actual_score = response.pop("score")
        self.assertIs(type(actual_score), float)
        self.assertTrue(0 <= actual_score <= 1)
        self.assertEqual(response, expected)
        if score is not None:
            self.assertEqual(actual_score, score)
        self.assertEqual(result.stdout, json.dumps(
            dict(json.loads(result.stdout)), separators=(",", ":")).encode() + b"\n")


class InlineAdvisoryTests(ResponseAssertions, unittest.TestCase):
    def test_rule_only_contract_at_exact_input_limit(self):
        self.assert_response(invoke(PAYLOAD.ljust(4096)),
                             source="rule-only", fallback="unavailable", action="allow", score=0.0)

    def test_corrupt_local_artifacts_keep_rule_observation(self):
        with tempfile.TemporaryDirectory(dir=EIS) as directory:
            artifacts = Path(directory)
            (artifacts / "manifest.json").write_text("{}")
            (artifacts / "model.onnx").write_bytes(b"corrupt")
            payload = json.dumps(dict(requests=100, seconds=1, errors=100, baseline_rps=1)).encode()
            result = invoke(payload, "--artifact-dir", directory)
        self.assert_response(result, source="rule-only", fallback="unavailable",
                             action="observe", score=1.0)

    def test_invalid_windows_have_no_output_or_input_echo(self):
        bad = [b"", b"[]", b"null", b"{}", b"\xff", PAYLOAD + b"{}",
               PAYLOAD.ljust(4097), PAYLOAD[:-1], b"[" * 2000 + b"]" * 2000,
               PAYLOAD[:-1] + b',"requests":0}', PAYLOAD[:-1] + b',"private_marker":0}']
        for field, values in {
            "requests": [True, -1, 10_000_001, 0.0],
            "seconds": [True, 0, 3601, 1.0],
            "errors": [False, -1, 1],
            "baseline_rps": [False, -1, 10_000_001, 0.0, float("nan"), float("inf")],
        }.items():
            bad.extend(json.dumps(dict(WINDOW, **{field: value})).encode() for value in values)
        for payload in bad:
            with self.subTest(payload=payload[:100]):
                self.assert_rejected(invoke(payload))

    def test_invalid_flags_have_sanitized_error(self):
        for flags in ({"timeout": "99"}, {"timeout": "2501"}, {"timeout": "100.0"},
                      {"threshold": "nan"}, {"threshold": "inf"}, {"threshold": "-0.1"},
                      {"threshold": "1.1"}):
            with self.subTest(flags=flags):
                self.assert_rejected(invoke(**flags))
        self.assert_rejected(invoke(PAYLOAD, "--artifact-dir", "relative/private_marker"))
        self.assert_rejected(invoke(PAYLOAD, "--private-marker"))

    def test_open_stdin_cannot_keep_worker_alive(self):
        with subprocess.Popen(command(timeout="100"), stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE) as child:
            try:
                child.stdin.write(PAYLOAD)
                child.stdin.flush()
                child.wait(timeout=3)
                self.assert_rejected(subprocess.CompletedProcess(
                    child.args, child.returncode, child.stdout.read(), child.stderr.read()))
            finally:
                if child.poll() is None:
                    child.kill()

    @unittest.skipUnless(os.name == "posix", "exec with a closed file descriptor")
    def test_closed_stdin_has_sanitized_error(self):
        result = subprocess.run(
            [sys.executable, "-I", "-B", "-c",
             "import os, sys; os.close(0); os.execv(sys.executable, sys.argv[1:])",
             *command()], capture_output=True, timeout=5)
        self.assert_rejected(result)

    def test_scorer_response_schema_and_timeout(self):
        cli = load_cli()
        isolated = cli.load_isolated()
        cases = [
            (isolated.ScoreResult(mode="onnx-cpu", scores=(0.8,), reason=None),
             ("onnx-cpu", 0.8, "none")),
            (isolated.ScoreResult(mode="rule-only", scores=(0.0,), reason="timeout"),
             ("rule-only", 0.0, "timeout")),
            *[(item, ("rule-only", 0.0, "unavailable")) for item in (
                None, {"mode": "onnx-cpu", "scores": [0.99], "reason": None},
                isolated.ScoreResult(mode="onnx-cpu", scores=(True,), reason=None),
                isolated.ScoreResult(mode="onnx-cpu", scores=(float("inf"),), reason=None),
                isolated.ScoreResult(mode="onnx-cpu", scores=(0.1, 0.2), reason=None),
                isolated.ScoreResult(mode="onnx-cpu", scores=(0.9,), reason="timeout"),
                isolated.ScoreResult(mode="other", scores=(0.9,), reason=None),
                isolated.ScoreResult(mode="rule-only", scores=(0.9,), reason="none"),
            )],
        ]
        for scorer_result, expected in cases:
            with self.subTest(scorer_result=scorer_result):
                with patch.object(isolated, "IsolatedWindowScorer") as scorer:
                    scorer.return_value.score.return_value = scorer_result
                    self.assertEqual(cli.score_window(WINDOW, EIS, monotonic() + 1.0), expected)


@unittest.skipUnless(os.getenv("RUN_EDGE_INLINE_ONNX_TESTS") == "1", "enable native CPU test explicitly")
@unittest.skipUnless(sys.platform == "linux", "ONNX isolation requires Linux")
class InlineAdvisoryOnnxTests(ResponseAssertions, unittest.TestCase):
    def test_native_cpu_scoring(self):
        sys.path.insert(0, str(ONNX_DIR))
        try:
            from build_model import build
        finally:
            sys.path.pop(0)
        with tempfile.TemporaryDirectory(dir=EIS) as directory:
            build(Path(directory))
            result = invoke(PAYLOAD, "--artifact-dir", directory)
        self.assert_response(result, source="onnx-cpu", fallback="none", action="allow")


if __name__ == "__main__":
    unittest.main()
