import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import run_http

RATE_COUNTS = {"200": 4, "429": 6}
RATE_OBSERVATIONS = {
    "status": "local-tested", "requests_attempted": 10,
    "responses_by_status": RATE_COUNTS,
}


class HttpExperimentTests(unittest.TestCase):
    def test_same_window_and_cohorts_preserve_enforcement(self):
        original = json.dumps(RATE_OBSERVATIONS)
        report = run_http.compare(RATE_OBSERVATIONS, 1, set(RATE_COUNTS), None)
        self.assertEqual(json.dumps(RATE_OBSERVATIONS), original)
        self.assertEqual(report["status"], "simulated")
        self.assertEqual(report["window"], dict(requests=10, seconds=1, errors=6, baseline_rps=1))
        allowed, blocked = (report["cohorts_by_observed_http_status"][code] for code in ("200", "429"))
        self.assertEqual((allowed["rule_only"]["action"], allowed["assisted"]["action"]),
                         ("allow", "observe"))
        self.assertEqual(blocked["rule_only"], blocked["assisted"])
        self.assertEqual(blocked["assisted"], "rate_limited")
        self.assertEqual(blocked["source"], "preserved_http_rate_limit")

    def test_invalid_ports_fail_before_any_probe_runs(self):
        probe = run_http.load_probe()
        with patch.object(run_http, "load_probe", return_value=probe), patch.object(probe, "run_probe") as run:
            for ports in ((5088, 5088), (5088, 999), (5088, "evil.example"), (True, 5088)):
                with self.subTest(ports=ports), self.assertRaises(ValueError):
                    run_http.run(*ports)
            run.assert_not_called()

    def test_no_advice_for_incomplete_or_unexpected_http(self):
        for observation in (
            {"status": "incomplete", "responses_by_status": RATE_COUNTS},
            {"status": "interrupted"},
            {"status": "local-tested", "responses_by_status": {"200": 4}},
            {"status": "local-tested", "responses_by_status": {**RATE_COUNTS, "302": 1}},
        ):
            self.assertEqual(run_http.compare(observation, 1, set(RATE_COUNTS), run_http.ONNX_ARTIFACTS)["status"],
                             "skipped")

    def test_503_preserved_without_scoring(self):
        observation = {
            "status": "local-tested", "requests_attempted": 4, "responses_by_status": {"503": 4},
        }
        with patch.object(run_http, "onnx_score") as score:
            result = run_http.compare(observation, 1, {"503"}, run_http.ONNX_ARTIFACTS)
        score.assert_not_called()
        cohort = result["cohorts_by_observed_http_status"]["503"]
        self.assertEqual((cohort["rule_only"], cohort["assisted"]), ("unavailable", "unavailable"))

    def test_onnx_timeout_and_failure_keep_rule_only(self):
        for failure, reason in (
            (subprocess.TimeoutExpired("worker", 5), "timeout"),
            (subprocess.CalledProcessError(1, "worker"), "unavailable_or_invalid"),
        ):
            with patch.object(run_http.subprocess, "run", side_effect=failure) as worker:
                result = run_http.compare(RATE_OBSERVATIONS, 1, set(RATE_COUNTS), run_http.ONNX_ARTIFACTS)
                self.assertEqual(worker.call_args.kwargs["timeout"], run_http.ONNX_TIMEOUT_SECONDS)
            self.assertEqual(result["scoring"]["reason"], reason)
            self.assertIsNone(result["score"])
            allowed = result["cohorts_by_observed_http_status"]["200"]
            self.assertEqual((allowed["assisted"]["action"], allowed["assisted"]["source"]),
                             ("allow", "rule-fallback"))

    def test_real_worker_timeout_falls_back(self):
        with tempfile.TemporaryDirectory() as temporary:
            worker = Path(temporary) / "busy.py"
            worker.write_text("import time\ntime.sleep(10)\n", encoding="utf-8")
            with patch.object(run_http, "ONNX_RUNTIME", worker), patch.object(
                run_http, "ONNX_TIMEOUT_SECONDS", 0.1
            ):
                result = run_http.compare(
                    RATE_OBSERVATIONS, 1, set(RATE_COUNTS), run_http.ONNX_ARTIFACTS
                )
        self.assertEqual(result["scoring"]["reason"], "timeout")
        self.assertIsNone(result["score"])

    def test_onnx_valid_and_invalid_scores(self):
        output = {"provider": "CPUExecutionProvider", "model_id": "fixture",
                  "model_sha256": "0" * 64}
        for score, expected in ((1.0, "observe"), (float("nan"), "allow"), (True, "allow")):
            child = subprocess.CompletedProcess([], 0, json.dumps({**output, "score": score}))
            with patch.object(run_http.subprocess, "run", return_value=child):
                result = run_http.compare(RATE_OBSERVATIONS, 1, set(RATE_COUNTS), run_http.ONNX_ARTIFACTS)
            self.assertEqual(result["cohorts_by_observed_http_status"]["200"]["assisted"]["action"],
                             expected)
            self.assertEqual(result["cohorts_by_observed_http_status"]["429"]["assisted"],
                             "rate_limited")


@unittest.skipUnless(os.getenv("RUN_EDGE_HTTP_TESTS") == "1",
                     "Set RUN_EDGE_HTTP_TESTS=1 for disposable ASP.NET Core HTTP tests")
class LiveHttpExperimentTests(unittest.TestCase):
    def start_api(self, dll, base_env, **settings):
        with socket.socket() as reservation:
            reservation.bind(("127.0.0.1", 0))
            port = reservation.getsockname()[1]
        env = {**base_env, **settings, "LOCAL_EDGE_PORT": str(port)}
        process = subprocess.Popen(["dotnet", str(dll)], cwd=dll.parent, env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(self.stop_api, process)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline and process.poll() is None:
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                    return port
            except OSError:
                time.sleep(0.1)
        self.fail(f"ASP.NET Core failed to listen on loopback (exit={process.poll()})")

    @staticmethod
    def stop_api(process):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)

    def test_cli_observes_real_200_429_and_503(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = directory / "empty-nuget-source"
            source.mkdir()
            build = directory / "build"
            project = (HERE.parent / "EdgeNetworkSecurity/implementations/local/src"
                       / "LocalEdgeApi/LocalEdgeApi.csproj")
            env = {
                "PATH": os.environ["PATH"],
                "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
                "DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE": "true",
                "DOTNET_CLI_HOME": str(directory),
                "DOTNET_GENERATE_ASPNET_CERTIFICATE": "false",
                "DOTNET_NOLOGO": "1",
                "NUGET_PACKAGES": os.environ.get("NUGET_PACKAGES", str(Path.home() / ".nuget/packages")),
            }
            subprocess.run(
                ["dotnet", "build", str(project), "--artifacts-path", str(build),
                 "--source", str(source), "-p:NuGetAudit=false", "--nologo", "-v:q"],
                env=env, timeout=60, check=True,
            )
            dll = build / "bin/LocalEdgeApi/debug/LocalEdgeApi.dll"
            with socket.socket() as unavailable_dependency:
                # Hold a port without listening, so no real Redis instance can be contacted.
                unavailable_dependency.bind(("127.0.0.1", 0))
                redis_port = unavailable_dependency.getsockname()[1]
                rate = self.start_api(dll, env, LOCAL_EDGE_PERMITS="4", LOCAL_EDGE_WINDOW_SECONDS="60")
                unavailable = self.start_api(dll, env, LOCAL_EDGE_REDIS_PORT=str(redis_port))
                result = subprocess.run(
                    [sys.executable, "-B", str(HERE / "run_http.py"), "--rate-port", str(rate),
                     "--unavailable-port", str(unavailable)],
                    capture_output=True, text=True, timeout=15,
                )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            report = json.loads(result.stdout)
            self.assertEqual(report["schema_version"], 1)
            self.assertEqual(report["status"], "complete")
            for phase, expected in (("fixed_window", {"200", "429"}),
                                    ("quota_unavailable", {"503"})):
                actual = report["http_observations"][phase]
                simulated = report["offline_policy_comparison"][phase]
                self.assertEqual(set(actual["responses_by_status"]), expected)
                self.assertEqual(actual["transport_errors"], 0)
                self.assertLessEqual(actual["requests_attempted"], 10)
                self.assertEqual(simulated["status"], "simulated")
                self.assertEqual(actual["responses_by_status"], {
                    status: cohort["count"]
                    for status, cohort in simulated["cohorts_by_observed_http_status"].items()
                })
