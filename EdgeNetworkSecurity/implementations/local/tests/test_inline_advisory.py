"""Real loopback HTTP with a local Python subprocess exercising the EIS wire contract."""

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest

from test_local_edge_api import PROJECT, RunningApi, get


FIXTURE = """
import json
import os
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).parent
assert sys.flags.isolated and sys.dont_write_bytecode
assert sys.argv[1:3] == ["--artifact-dir", str(root / "missing artifacts")]
assert sys.argv[3] == "--timeout-ms" and 100 <= int(sys.argv[4]) <= 2500
assert sys.argv[5] == "--threshold" and 0 < float(sys.argv[6]) <= 1
sample = json.load(sys.stdin)
assert set(sample) == {"requests", "seconds", "errors", "baseline_rps"}
assert all(type(value) is int for value in sample.values())
with (root / "calls").open("a") as calls:
    calls.write(json.dumps(sample) + "\\n")
(root / "pid").write_text(str(os.getpid()))
mode = (root / "mode").read_text()
result = dict(schema_version=1, action="observe", source="onnx-cpu", score=0.99,
              fallback="none", status="simulated", policy_id="demo-policy-v1")
if mode == "tree":
    child = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import time; time.sleep(10)"])
    (root / "child-pid").write_text(str(child.pid))
    time.sleep(10)
elif mode == "timeout":
    time.sleep(10)
elif mode == "crash":
    print(json.dumps(result), flush=True)
    sys.exit(2)
elif mode == "malformed":
    print("{")
    sys.exit()
elif mode == "large":
    print(" " * 2049)
elif mode == "extra":
    result["__proto__"] = {}
elif mode == "duplicate":
    print(json.dumps(result)[:-1] + ', "score":0}')
    sys.exit()
elif mode == "nonfinite":
    print(json.dumps(result).replace("0.99", "1e999"))
    sys.exit()
elif mode == "missing":
    assert not Path(sys.argv[2]).exists()
    result.update(source="rule-only", fallback="unavailable", score=0.99)
elif mode == "stderr":
    sys.stderr.write("discard me" * 10000)
print(json.dumps(result))
"""


@unittest.skipUnless(shutil.which("dotnet"), "Requires .NET SDK")
class InlineAdvisoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["dotnet", "build", str(PROJECT), "--nologo", "-v:q",
                        "--ignore-failed-sources"], check=True, timeout=90)

    def setUp(self):
        folder = self.enterContext(tempfile.TemporaryDirectory(dir=Path(__file__).parent))
        self.root = Path(folder)
        script = self.root / "inline_advisory.py"
        script.write_text(FIXTURE)
        self.mode("observe")
        self.settings = dict(LOCAL_EDGE_ADVISORY_ENABLED="1",
                             LOCAL_EDGE_ADVISORY_PYTHON=sys.executable,
                             LOCAL_EDGE_ADVISORY_SCRIPT=str(script),
                             LOCAL_EDGE_ADVISORY_ARTIFACTS=str(self.root / "missing artifacts"),
                             LOCAL_EDGE_ADVISORY_TIMEOUT_MS="500",
                             LOCAL_EDGE_WINDOW_SECONDS="60")

    def mode(self, name):
        (self.root / "mode").write_text(name)

    def api(self, **overrides):
        return RunningApi(**(self.settings | overrides))

    def calls(self):
        path = self.root / "calls"
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def expensive(self, api):
        return get(api.base_url + "/api/expensive")

    def metrics(self, api):
        return get(api.base_url + "/metrics")[2]

    def wait_until(self, predicate):
        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(0.01)
        self.fail("Timed out waiting for test condition")

    def test_default_disabled_and_unchanged_health_readiness(self):
        self.settings.pop("LOCAL_EDGE_ADVISORY_ENABLED")
        with self.api() as api:
            self.assertEqual(self.expensive(api)[2], {"status": "processed"})
            self.assertEqual(get(api.base_url + "/health")[2], {"status": "ok", "loopbackOnly": True})
            self.assertEqual(get(api.base_url + "/ready")[2], {"status": "ready"})
            self.assertEqual(self.metrics(api)["advisoryScored"], 0)
        self.assertEqual(self.calls(), [])

    def test_observe_is_http_200_and_worker_receives_only_aggregates(self):
        self.mode("stderr")
        with self.api(LOCAL_EDGE_ADVISORY_BASELINE_RPS="3") as api:
            url = api.base_url + "/api/expensive"
            self.assertEqual(get(url + "?holdMs=invalid")[0], 400)
            status, _, body = get(url + "/", {"X-Forwarded-For": "192.0.2.1", "X-User": "synthetic"})
            self.assertEqual(status, 200)
            self.assertEqual(body, {"status": "processed", "advisory": {
                "action": "observe", "source": "onnx-cpu", "status": "simulated",
                "fallback": "none", "score": 0.99}})
            metrics = self.metrics(api)
            self.assertEqual((metrics["advisoryScored"], metrics["advisoryFallback"],
                              metrics["advisoryObserved"]), (1, 0, 1))
        self.assertEqual(self.calls(), [{"requests": 2, "seconds": 60, "errors": 1, "baseline_rps": 3}])

    def test_threshold_applies_to_the_published_score(self):
        with self.api(LOCAL_EDGE_ADVISORY_THRESHOLD_PCT="100") as api:
            self.assertEqual(self.expensive(api)[2]["advisory"]["action"], "allow")

    def test_worker_failures_use_deterministic_local_fallback(self):
        for mode in ("malformed", "large", "extra", "duplicate", "nonfinite", "crash", "missing"):
            with self.subTest(mode=mode):
                self.mode(mode)
                with self.api() as api:
                    status, _, body = self.expensive(api)
                    self.assertEqual(status, 200)
                    self.assertEqual(body["advisory"], {
                        "action": "allow", "source": "rule-only", "status": "simulated",
                        "fallback": "unavailable", "score": 0.0})
                    self.assertEqual(self.metrics(api)["advisoryFallback"], 1)
        with self.api(LOCAL_EDGE_ADVISORY_PYTHON=str(self.root / "missing-python")) as api:
            self.assertEqual(self.expensive(api)[2]["advisory"]["fallback"], "unavailable")

    def test_local_fallback_matches_edgeai_heuristic(self):
        # A real HTTP 400 contributes one error to the two-request window.
        # At low RPS the EdgeAI baseline scores 0.3 * (1/2) = 0.15.
        self.mode("malformed")
        with self.api(LOCAL_EDGE_ADVISORY_BASELINE_RPS="2") as api:
            self.assertEqual(get(api.base_url + "/api/expensive?holdMs=invalid")[0], 400)
            status, _, body = self.expensive(api)
            self.assertEqual(status, 200)
            self.assertEqual(body["advisory"]["source"], "rule-only")
            self.assertEqual(body["advisory"]["score"], 0.15)
            self.assertEqual(body["advisory"]["action"], "allow")
            self.assertEqual(self.metrics(api)["advisoryFallback"], 1)

    def test_timeout_reaps_worker_and_worker_slot_does_not_queue(self):
        self.mode("timeout")
        with self.api(LOCAL_EDGE_ADVISORY_TIMEOUT_MS="800", LOCAL_EDGE_CONCURRENCY="1") as api:
            with ThreadPoolExecutor(max_workers=1) as pool:
                first = pool.submit(self.expensive, api)
                pid_file = self.root / "pid"
                self.wait_until(lambda: pid_file.exists() and pid_file.stat().st_size)
                status, _, body = self.expensive(api)
                self.assertEqual((status, body["advisory"]["fallback"]), (200, "unavailable"))
                status, _, body = first.result(timeout=2)
                self.assertEqual((status, body["advisory"]["fallback"]), (200, "timeout"))
            self.assertEqual(len(self.calls()), 1)
            if sys.platform.startswith("linux"):
                self.assertFalse(Path("/proc", pid_file.read_text()).exists())
            self.mode("observe")
            self.assertEqual(self.expensive(api)[2]["advisory"]["source"], "onnx-cpu")

    @unittest.skipUnless(sys.platform.startswith("linux"), "Uses Linux process state")
    def test_timeout_kills_worker_descendants(self):
        self.mode("tree")
        with self.api() as api:
            self.assertEqual(self.expensive(api)[2]["advisory"]["fallback"], "timeout")
            child = Path("/proc", (self.root / "child-pid").read_text(), "stat")

            def exited():
                try:
                    # An orphan may remain a zombie until it is reaped by the system.
                    return child.read_text().rsplit(")", 1)[1].split()[0] == "Z"
                except FileNotFoundError:
                    return True

            self.wait_until(exited)

    def test_client_abort_reaps_worker_and_releases_worker_slot(self):
        self.mode("timeout")
        with self.api(LOCAL_EDGE_ADVISORY_TIMEOUT_MS="3000") as api:
            with socket.create_connection(("127.0.0.1", api.port), timeout=1) as client:
                client.sendall(b"GET /api/expensive HTTP/1.1\r\nHost: localhost\r\n\r\n")
                pid_file = self.root / "pid"
                self.wait_until(lambda: pid_file.exists() and pid_file.stat().st_size)
            if sys.platform.startswith("linux"):
                worker = Path("/proc", pid_file.read_text())
                self.wait_until(lambda: not worker.exists())
            self.mode("observe")
            self.wait_until(lambda: self.expensive(api)[2]["advisory"]["source"] == "onnx-cpu")

    def test_rate_limit_and_busy_responses_do_not_invoke_worker(self):
        with self.api(LOCAL_EDGE_PERMITS="2", LOCAL_EDGE_CONCURRENCY="1") as api:
            url = api.base_url + "/api/expensive"
            with ThreadPoolExecutor(max_workers=1) as pool:
                first = pool.submit(get, url + "?holdMs=500")
                self.wait_until(lambda: self.metrics(api)["started"] == 1)
                self.assertEqual(self.expensive(api)[::2], (503, {"error": "concurrency_exhausted"}))
                self.assertEqual(self.expensive(api)[::2], (429, {"error": "rate_limited"}))
                self.assertEqual(first.result(timeout=2)[0], 200)
        self.assertEqual(self.calls(), [{"requests": 3, "seconds": 60, "errors": 2, "baseline_rps": 2}])

    def test_redis_dependency_failure_does_not_invoke_worker(self):
        with socket.socket() as unavailable:
            unavailable.bind(("127.0.0.1", 0))
            with self.api(LOCAL_EDGE_REDIS_PORT=str(unavailable.getsockname()[1])) as api:
                self.assertEqual(self.expensive(api)[::2], (503, {"error": "quota_dependency_unavailable"}))
                self.assertEqual(self.metrics(api)["advisoryScored"], 0)
        self.assertEqual(self.calls(), [])
