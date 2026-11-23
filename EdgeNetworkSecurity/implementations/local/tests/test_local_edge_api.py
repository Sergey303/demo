"""ASP.NET Core loopback HTTP integration tests. Requires .NET 10 SDK, no NuGet packages."""
import concurrent.futures
from contextlib import closing
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "src" / "LocalEdgeApi" / "LocalEdgeApi.csproj"
DLL = ROOT / "src" / "LocalEdgeApi" / "bin" / "Debug" / "net10.0" / "LocalEdgeApi.dll"


def choose_port():
    with closing(socket.socket()) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def get(url, headers=None):
    opener = build_opener(ProxyHandler({}))
    try:
        with opener.open(Request(url, headers=headers or {}), timeout=2.0) as response:
            return response.status, dict(response.headers), json.loads(response.read())
    except HTTPError as error:
        body = json.loads(error.read())
        return error.code, dict(error.headers), body


class RunningApi:
    def __init__(self, **settings):
        self.port = choose_port()
        self.base_url = f"http://127.0.0.1:{self.port}"
        env = dict(os.environ)
        env.update(ASPNETCORE_URLS="http://0.0.0.0:1",
                   LOCAL_EDGE_PORT=str(self.port),
                   LOCAL_EDGE_PERMITS="4",
                   LOCAL_EDGE_WINDOW_SECONDS="2",
                   LOCAL_EDGE_CONCURRENCY="2")
        env.update(settings)
        self.process = subprocess.Popen(["dotnet", str(DLL)], cwd=ROOT, env=env,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError(f"Local Edge API exited with {self.process.returncode}")
            try:
                status, _, _ = get(self.base_url + "/health")
                if status == 200:
                    return
            except (URLError, OSError, ValueError):
                pass
            time.sleep(0.08)
        self.close()
        raise RuntimeError("Local Edge API did not become healthy")

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


@unittest.skipUnless(shutil.which("dotnet"), "Requires .NET SDK")
class LocalEdgeApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which("dotnet"):
            raise unittest.SkipTest("dotnet not installed")
        result = subprocess.run(["dotnet", "build", str(PROJECT), "--nologo", "-v:q",
                                 "--ignore-failed-sources"], cwd=ROOT, capture_output=True,
                                text=True, timeout=90)
        if result.returncode:
            raise RuntimeError(result.stdout[-2500:] + result.stderr[-1500:])

    def test_health_metrics_and_real_429_then_recovery(self):
        with RunningApi() as api:
            status, _, body = get(api.base_url + "/health")
            self.assertEqual(status, 200)
            self.assertTrue(body["loopbackOnly"])

            observed = [get(api.base_url + "/api/expensive") for _ in range(6)]
            self.assertEqual([s for s, _, _ in observed[:4]], [200] * 4)
            self.assertEqual([s for s, _, _ in observed[4:]], [429] * 2)
            self.assertTrue(all(body["error"] == "rate_limited" for _, _, body in observed[4:]))
            for _, headers, _ in observed[4:]:
                if "Retry-After" in headers:
                    self.assertGreaterEqual(int(headers["Retry-After"]), 1)

            status, _, metrics = get(api.base_url + "/metrics")
            self.assertEqual(status, 200)
            self.assertEqual(metrics["completed"], 4)
            self.assertEqual(metrics["rateRejected"], 2)
            self.assertEqual(metrics["concurrencyRejected"], 0)
            self.assertEqual(metrics["scope"], "single_process")
            self.assertNotIn("userId", metrics)

            # Changes to X-Forwarded-For cannot create fresh rate limiter buckets.
            for n in range(3):
                status, _, _ = get(api.base_url + "/api/expensive",
                                   {"X-Forwarded-For": f"10.10.0.{n}"})
                self.assertEqual(status, 429)
            time.sleep(2.25)
            status, _, _ = get(api.base_url + "/api/expensive")
            self.assertEqual(status, 200)

    def test_concurrency_budget_returns_503(self):
        with RunningApi(LOCAL_EDGE_PERMITS="100", LOCAL_EDGE_WINDOW_SECONDS="5",
                        LOCAL_EDGE_CONCURRENCY="1") as api:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(get, api.base_url + "/api/expensive?holdMs=450")
                time.sleep(0.10)
                second_status, _, second_body = get(api.base_url + "/api/expensive?holdMs=100")
                first_status, _, _ = first.result(timeout=3)
            self.assertEqual(first_status, 200)
            self.assertEqual(second_status, 503)
            self.assertEqual(second_body["error"], "concurrency_exhausted")
            _, _, metrics = get(api.base_url + "/metrics")
            self.assertEqual(metrics["concurrencyRejected"], 1)

    def test_generator_against_real_api(self):
        import importlib.util
        import sys
        module_path = ROOT.parents[1] / "shared" / "traffic-generator" / "probe.py"
        spec = importlib.util.spec_from_file_location("demo_edge_probe_integration", module_path)
        probe = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = probe
        spec.loader.exec_module(probe)
        scenario = json.dumps({
            "id": "actual-429", "target": "local",
            "durationSeconds": 1, "maxRequestsPerSecond": 10,
            "trafficProfile": "baseline",
        })
        with RunningApi() as api:
            report = probe.run_probe(scenario, api.base_url + "/api/expensive")
            self.assertEqual(report["status"], "local-tested")
            self.assertGreater(int(report["responses_by_status"].get("429", 0)), 0)
            self.assertGreater(int(report["responses_by_status"].get("200", 0)), 0)
            self.assertEqual(report["transport_errors"], 0)

    def test_request_validation_and_liveness(self):
        with RunningApi() as api:
            for value in ("-1", "501", "invalid"):
                status, _, body = get(api.base_url + f"/api/expensive?holdMs={value}")
                self.assertEqual(status, 400)
                self.assertEqual(body["error"], "invalid_hold_ms")
            status, _, body = get(api.base_url + "/api/expensive?unknown=x")
            self.assertEqual(status, 400)
            self.assertEqual(body["error"], "invalid_hold_ms")
            status, _, _ = get(api.base_url + "/health")
            self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
