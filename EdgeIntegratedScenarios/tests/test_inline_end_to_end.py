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
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[2]
ONNX_DIR = ROOT / "EdgeAI" / "implementations" / "onnx-local"
SCRIPT = ROOT / "EdgeIntegratedScenarios" / "ai-assisted-ddos-defense" / "inline_advisory.py"
LOCAL_TESTS = ROOT / "EdgeNetworkSecurity" / "implementations" / "local" / "tests"
PROJECT = ROOT / "EdgeNetworkSecurity" / "implementations" / "local" / "src" / "LocalEdgeApi" / "LocalEdgeApi.csproj"


def get_json(url: str) -> tuple[int, dict, float]:
    start = time.monotonic()
    with build_opener(ProxyHandler({})).open(url, timeout=9) as response:
        return response.status, json.loads(response.read(2048)), (time.monotonic() - start) * 1000


@unittest.skipUnless(os.getenv("RUN_EDGE_INLINE_FULL_TESTS") == "1", "opt-in native .NET/ONNX E2E")
@unittest.skipUnless(sys.platform == "linux" and shutil.which("dotnet"), "Linux + .NET 10 required")
class RealInlineAdvisoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            import onnxruntime  # noqa: F401
            import onnx  # noqa: F401
            import numpy  # noqa: F401
        except ImportError as error:
            raise unittest.SkipTest("pinned ONNX dependencies are required") from error
        sys.path.insert(0, str(ONNX_DIR))
        sys.path.insert(0, str(LOCAL_TESTS))
        from build_model import build
        from test_local_edge_api import RunningApi
        cls.build = staticmethod(build)
        cls.RunningApi = RunningApi
        subprocess.run(["dotnet", "build", str(PROJECT), "--nologo", "-v:q",
                        "--ignore-failed-sources"], cwd=ROOT, timeout=120, check=True,
                       stdout=subprocess.DEVNULL)

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

    def test_native_cpu_advice_and_rate_limit_preservation(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temporary:
            artifacts = Path(temporary)
            self.build(artifacts)
            with self.RunningApi(**self.settings(artifacts)) as api:
                status, body, latency = get_json(api.base_url + "/api/expensive")
                self.assertEqual(status, 200)
                self.assertEqual(body["status"], "processed")
                recommendation = body["advisory"]
                self.assertEqual(recommendation["source"], "onnx-cpu")
                self.assertEqual(recommendation["fallback"], "none")
                self.assertEqual(recommendation["status"], "simulated")
                self.assertIn(recommendation["action"], ("allow", "observe"))
                self.assertTrue(math.isfinite(recommendation["score"]))
                self.assertLessEqual(recommendation["score"], 1)
                self.assertGreaterEqual(recommendation["score"], 0)

                from urllib.error import HTTPError
                with self.assertRaises(HTTPError) as caught:
                    get_json(api.base_url + "/api/expensive")
                self.assertEqual(caught.exception.code, 429)

                _, metrics, _ = get_json(api.base_url + "/metrics")
                self.assertEqual(metrics["completed"], 1)
                self.assertEqual(metrics["rateRejected"], 1)
                self.assertEqual(metrics["advisoryScored"], 1)
                self.assertEqual(metrics["advisoryFallback"], 0)
                print(f"INLINE_HTTP_NATIVE_CPU_MS={latency:.2f}", flush=True)

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
