"""Opt-in true ASP.NET Core → Python CLI → isolated native ONNX integration.

Set RUN_EDGE_INLINE_FULL_TESTS=1 only in a controlled Linux workstation with
.NET 10, pinned ONNX dependencies and libseccomp. All HTTP is loopback.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[2]
ONNX_DIR = ROOT / "EdgeAI" / "implementations" / "onnx-local"
SCRIPT = ROOT / "EdgeIntegratedScenarios" / "ai-assisted-ddos-defense" / "inline_advisory.py"
LOCAL_TESTS = ROOT / "EdgeNetworkSecurity" / "implementations" / "local" / "tests"
PROJECT = ROOT / "EdgeNetworkSecurity" / "implementations" / "local" / "src" / "LocalEdgeApi" / "LocalEdgeApi.csproj"


def get_json(url: str, timeout: float = 16) -> tuple[int, dict, float]:
    start = time.monotonic()
    with build_opener(ProxyHandler({})).open(url, timeout=timeout) as response:
        return response.status, json.loads(response.read()), (time.monotonic() - start) * 1000


@unittest.skipUnless(os.getenv("RUN_EDGE_INLINE_FULL_TESTS") == "1", "opt-in native .NET/ONNX E2E")
@unittest.skipUnless(sys.platform == "linux" and shutil.which("dotnet"), "Linux + .NET 10 required")
class RealInlineAdvisoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            import onnxruntime
            import onnx
            import numpy
        except ImportError as error:
            raise unittest.SkipTest("pinned ONNX dependencies are required") from error
        for package, expected in ((numpy, "2.2.6"), (onnx, "1.19.1"), (onnxruntime, "1.23.2")):
            if package.__version__ != expected:
                raise unittest.SkipTest(f"{package.__name__}=={expected} required")
        sys.path.insert(0, str(ONNX_DIR))
        sys.path.insert(0, str(LOCAL_TESTS))
        from build_model import build
        import test_local_edge_api
        cls.build = staticmethod(build)
        cls.RunningApi = test_local_edge_api.RunningApi
        scratch = Path(cls.enterClassContext(tempfile.TemporaryDirectory(dir=SCRIPT.parent)))
        feed = scratch / "empty-feed"
        feed.mkdir()
        output = scratch / "build"
        subprocess.run(
            ["dotnet", "build", str(PROJECT), "--nologo", "-v:q",
             "--artifacts-path", str(output), f"-p:RestoreSources={feed}",
             "-p:NuGetAudit=false"],
            cwd=ROOT, timeout=120, check=True,
        )
        dll = next(output.glob("bin/LocalEdgeApi/debug/LocalEdgeApi.dll"))
        cls.enterClassContext(patch.object(test_local_edge_api, "DLL", dll))

    def setUp(self):
        self.enterContext(patch.dict(os.environ))
        for name in ("LOCAL_EDGE_ADVISORY_PREWARM", "LOCAL_EDGE_ADVISORY_MODE",
                     "LOCAL_EDGE_REDIS_PORT"):
            os.environ.pop(name, None)

    def settings(self, artifact_dir: Path) -> dict[str, str]:
        return {
            "LOCAL_EDGE_ADVISORY_ENABLED": "1",
            "LOCAL_EDGE_ADVISORY_PYTHON": sys.executable,
            "LOCAL_EDGE_ADVISORY_SCRIPT": str(SCRIPT),
            "LOCAL_EDGE_ADVISORY_ARTIFACTS": str(artifact_dir),
            "LOCAL_EDGE_ADVISORY_TIMEOUT_MS": "3000",
            "LOCAL_EDGE_ADVISORY_THRESHOLD_PCT": "80",
            "LOCAL_EDGE_ADVISORY_BASELINE_RPS": "2",
            "LOCAL_EDGE_WINDOW_SECONDS": "60",
            "LOCAL_EDGE_PERMITS": "1",
        }

    def persistent_settings(self, artifacts: Path) -> dict[str, str]:
        return self.settings(artifacts) | {
            "LOCAL_EDGE_ADVISORY_MODE": "persistent",
            "LOCAL_EDGE_ADVISORY_WORKER_SCRIPT": str(SCRIPT.with_name("persistent_worker.py")),
            "LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS": "12000",
            "LOCAL_EDGE_PERMITS": "2",
        }

    def assert_prewarm(self, metrics: dict, *, ready: bool, attempts: int, failures: int):
        self.assertIs(metrics["advisoryWorkerReady"], ready)
        for field, expected in (("advisoryPrewarmAttempts", attempts),
                                ("advisoryPrewarmFailures", failures)):
            self.assertIs(type(metrics[field]), int)
            self.assertEqual(metrics[field], expected)

    def wait_for_prewarm(self, api, *, ready: bool) -> dict:
        deadline = time.monotonic() + 15
        last = None
        while (remaining := deadline - time.monotonic()) > 0:
            try:
                _, last, _ = get_json(api.base_url + "/metrics", timeout=min(1, remaining))
            except (URLError, TimeoutError):
                pass
            else:
                for field in ("started", "completed", "advisoryScored", "advisoryFallback"):
                    self.assertEqual(last[field], 0, f"{field} during startup: {last}")
                failures = last["advisoryPrewarmFailures"]
                if failures or last["advisoryWorkerReady"] is True:
                    if time.monotonic() <= deadline:
                        self.assert_prewarm(last, ready=ready, attempts=1, failures=int(not ready))
                        return last
                    break
            time.sleep(max(0, min(0.1, deadline - time.monotonic())))
        self.fail(f"Prewarm did not reach the expected state within 15s: {last}")

    def test_prewarm_reuses_ready_session_and_preserves_quota(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            directory = Path(temporary)
            artifacts = directory / "artifacts"
            self.build(artifacts)
            settings = self.persistent_settings(artifacts) | {"LOCAL_EDGE_ADVISORY_PREWARM": "1"}
            with self.RunningApi(**settings) as api:
                self.wait_for_prewarm(api, ready=True)
                # A fresh worker/session would need these files at startup.
                for name in ("model.onnx", "manifest.json"):
                    (artifacts / name).rename(directory / name)

                for request in ("FIRST", "SECOND"):
                    status, body, latency = get_json(api.base_url + "/api/expensive")
                    print(f"PREWARM_HTTP_{request}_MS={latency:.2f}", flush=True)
                    self.assertEqual(status, 200)
                    self.assertEqual(body["advisory"]["source"], "onnx-cpu")
                    self.assertEqual(body["advisory"]["fallback"], "none")
                    self.assertTrue(0 <= body["advisory"]["score"] <= 1)
                    self.assertLessEqual(latency, 1000, f"{request} warm HTTP took {latency:.2f} ms")

                with self.assertRaises(HTTPError) as throttled:
                    get_json(api.base_url + "/api/expensive")
                self.assertEqual(throttled.exception.code, 429)
                throttled.exception.close()
                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assert_prewarm(metrics, ready=True, attempts=1, failures=0)
                for field in ("started", "completed", "advisoryScored"):
                    self.assertEqual(metrics[field], 2)
                self.assertEqual(metrics["rateRejected"], 1)
                self.assertEqual(metrics["advisoryFallback"], 0)
                self.assertEqual(metrics["advisoryWorkerRestarts"], 0)

    def test_missing_model_prewarm_keeps_ready_and_falls_back(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            settings = self.persistent_settings(Path(temporary)) | {"LOCAL_EDGE_ADVISORY_PREWARM": "1"}
            with self.RunningApi(**settings) as api:
                self.wait_for_prewarm(api, ready=False)
                status, body, _ = get_json(api.base_url + "/api/expensive")
                self.assertEqual(status, 200)
                self.assertEqual(body["advisory"]["source"], "rule-only")
                self.assertIn(body["advisory"]["fallback"], ("unavailable", "timeout"))
                status, body, _ = get_json(api.base_url + "/ready")
                self.assertEqual((status, body), (200, {"status": "ready"}))
                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assert_prewarm(metrics, ready=False, attempts=1, failures=1)
                self.assertEqual(metrics["advisoryScored"], 0)
                self.assertEqual(metrics["advisoryFallback"], 1)

    def test_one_shot_native_or_bounded_fallback_preserves_rate_limit(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            artifacts = Path(temporary)
            self.build(artifacts)
            with self.RunningApi(**self.settings(artifacts)) as api:
                status, body, latency = get_json(api.base_url + "/api/expensive")
                self.assertEqual(status, 200)
                self.assertEqual(body["status"], "processed")
                recommendation = body["advisory"]
                # Native startup may exceed the deliberate 3s one-shot
                # deadline under high CI load. Either real CPU inference or
                # deterministic rule-only timeout is a correct safe outcome;
                # the persistent native test below MUST execute ONNX.
                native = recommendation["source"] == "onnx-cpu"
                self.assertIn(recommendation["source"], ("onnx-cpu", "rule-only"))
                self.assertEqual(recommendation["fallback"], "none" if native else "timeout")
                self.assertEqual(recommendation["status"], "simulated")
                self.assertIn(recommendation["action"], ("allow", "observe"))
                self.assertTrue(math.isfinite(recommendation["score"]))
                self.assertLessEqual(recommendation["score"], 1)
                self.assertGreaterEqual(recommendation["score"], 0)

                with self.assertRaises(HTTPError) as caught:
                    get_json(api.base_url + "/api/expensive")
                self.assertEqual(caught.exception.code, 429)

                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assertEqual(metrics["completed"], 1)
                self.assertEqual(metrics["rateRejected"], 1)
                self.assertEqual(metrics["advisoryScored"], int(native))
                self.assertEqual(metrics["advisoryFallback"], int(not native))
                print(f"INLINE_HTTP_ONE_SHOT_MS={latency:.2f} NATIVE={native}", flush=True)

    def test_native_persistent_model_reused_and_quota_unchanged(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            artifacts = Path(temporary)
            self.build(artifacts)
            with self.RunningApi(**self.persistent_settings(artifacts)) as api:
                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assert_prewarm(metrics, ready=False, attempts=0, failures=0)
                cold_status, cold_body, cold_ms = get_json(api.base_url + "/api/expensive")
                warm_status, warm_body, warm_ms = get_json(api.base_url + "/api/expensive")
                self.assertEqual((cold_status, warm_status), (200, 200))
                for result in (cold_body, warm_body):
                    advisory = result["advisory"]
                    self.assertEqual(advisory["source"], "onnx-cpu")
                    self.assertEqual(advisory["fallback"], "none")
                    self.assertIn(advisory["action"], ("allow", "observe"))
                    self.assertTrue(math.isfinite(advisory["score"]))
                with self.assertRaises(HTTPError) as throttled:
                    get_json(api.base_url + "/api/expensive")
                self.assertEqual(throttled.exception.code, 429)
                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assert_prewarm(metrics, ready=True, attempts=0, failures=0)
                self.assertEqual(metrics["advisoryWorkerRestarts"], 0)
                self.assertEqual(metrics["advisoryScored"], 2)
                self.assertEqual(metrics["advisoryFallback"], 0)
                self.assertEqual(metrics["started"], 2)
                self.assertEqual(metrics["completed"], 2)
                print(f"PERSISTENT_NATIVE_HTTP_COLD_MS={cold_ms:.2f} WARM_MS={warm_ms:.2f}", flush=True)

    def test_missing_model_uses_real_cli_fallback_without_http_failure(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            with self.RunningApi(**self.settings(Path(temporary))) as api:
                status, body, _ = get_json(api.base_url + "/api/expensive")
                self.assertEqual(status, 200)
                recommendation = body["advisory"]
                self.assertEqual(recommendation["source"], "rule-only")
                self.assertEqual(recommendation["fallback"], "unavailable")
                self.assertIn(recommendation["action"], ("allow", "observe"))
                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assertEqual(metrics["advisoryFallback"], 1)


if __name__ == "__main__":
    unittest.main()
