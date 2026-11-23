"""Real loopback HTTP and a synthetic persistent Python wire-protocol fixture."""

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest

from test_local_edge_api import DLL, PROJECT, ROOT, RunningApi, get


FIXTURE = r"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).parent
assert sys.flags.isolated and sys.dont_write_bytecode
assert "TEST_HOST_SECRET" not in os.environ
assert os.environ["OMP_NUM_THREADS"] == os.environ["OPENBLAS_NUM_THREADS"] == "1"
assert sys.argv[1:] == ["--artifact-dir", str(root / "artifacts"), "--threshold", "0.8"]

def mode():
    return (root / "mode").read_text()

with (root / "starts").open("a") as log:
    log.write(str(os.getpid()) + "\n")
ready = '{"schema_version":1,"kind":"ready","model":"onnx-cpu"}'
if mode() == "bad-ready":
    ready = ready[:-1] + ',"kind":"ready"}'
if mode() == "missing-ready":
    sys.exit(2)
if mode() == "gated-ready":
    while not (root / "release").exists():
        time.sleep(0.01)
if mode() == "slow-ready":
    time.sleep(10)
if mode() == "cold":
    time.sleep(0.4)
sys.stderr.write("discard" * 100_000)
print(ready, flush=True)
for line in sys.stdin.buffer:
    assert len(line) <= 4096 and line.endswith(b"\n")
    sample = json.loads(line)
    assert set(sample) == {"requests", "seconds", "errors", "baseline_rps"}
    assert all(type(value) is int for value in sample.values())
    with (root / "calls").open("a") as log:
        log.write(json.dumps({"pid": os.getpid(), "sample": sample}) + "\n")
    result = dict(schema_version=1, action="observe", source="onnx-cpu", score=0.99,
                  fallback="none", status="simulated", policy_id="demo-policy-v1")
    current = mode()
    if current == "tree":
        child = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import time; time.sleep(10)"])
        (root / "child").write_text(str(child.pid))
        time.sleep(10)
    if current == "hang":
        time.sleep(10)
    if current == "closed":
        sys.exit(2)
    if current == "partial":
        print(json.dumps(result), end="", flush=True)
        sys.exit(2)
    if current == "large":
        print(" " * 2049, end="", flush=True)
        time.sleep(10)
    if current == "malformed":
        print("{", flush=True)
        continue
    if current == "duplicate":
        print(json.dumps(result)[:-1] + ', "score":0}', flush=True)
        continue
    if current == "nonfinite":
        print(json.dumps(result).replace("0.99", "1e999"), flush=True)
        continue
    if current == "bad-source":
        result["source"] = "rule-only"
    if current == "bad-action":
        result["action"] = "block"
    if current == "extra":
        result["extra"] = 1
    print(json.dumps(result), flush=True)
"""


@unittest.skipUnless(sys.platform.startswith("linux") and shutil.which("dotnet"),
                     "Requires Linux and .NET SDK")
class PersistentAdvisoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["dotnet", "build", str(PROJECT), "--nologo", "-v:q",
                        "--ignore-failed-sources"], check=True, timeout=90)

    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        script = self.root / "persistent_worker.py"
        script.write_text(FIXTURE)
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        self.mode("ready")
        self.settings = dict(
            LOCAL_EDGE_ADVISORY_ENABLED="1", LOCAL_EDGE_ADVISORY_MODE="persistent",
            LOCAL_EDGE_ADVISORY_PYTHON=sys.executable, LOCAL_EDGE_ADVISORY_WORKER_SCRIPT=str(script),
            LOCAL_EDGE_ADVISORY_ARTIFACTS=str(artifacts), LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS="1500",
            LOCAL_EDGE_ADVISORY_TIMEOUT_MS="300", LOCAL_EDGE_WINDOW_SECONDS="60",
            LOCAL_EDGE_PERMITS="20", TEST_HOST_SECRET="synthetic",
        )

    def api(self, **overrides):
        return RunningApi(**(self.settings | overrides))

    def mode(self, name):
        (self.root / "mode").write_text(name)

    def lines(self, name):
        path = self.root / name
        return path.read_text().splitlines() if path.exists() else []

    def score(self, api):
        status, _, body = get(api.base_url + "/api/expensive")
        self.assertEqual(status, 200)
        return body["advisory"]

    def metrics(self, api):
        return get(api.base_url + "/metrics")[2]

    def wait_until(self, predicate):
        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(0.01)
        self.fail("Timed out waiting for test condition")

    def test_prewarm_reuses_pid_without_scoring_or_charging_quota(self):
        with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1", LOCAL_EDGE_PERMITS="3",
                      LOCAL_EDGE_CONCURRENCY="1") as api:
            self.wait_until(lambda: self.metrics(api).get("advisoryWorkerReady"))
            metrics = self.metrics(api)
            self.assertEqual(metrics["advisoryPrewarmAttempts"], 1)
            self.assertEqual(metrics["advisoryPrewarmFailures"], 0)
            self.assertEqual(metrics["started"], 0)
            self.assertEqual(self.lines("calls"), [])
            pid, = self.lines("starts")
            self.assertEqual(self.score(api)["source"], "onnx-cpu")
            url = api.base_url + "/api/expensive"
            with ThreadPoolExecutor(max_workers=1) as pool:
                first = pool.submit(get, url + "?holdMs=500")
                self.wait_until(lambda: self.metrics(api)["started"] == 2)
                self.assertEqual(get(url)[::2], (503, {"error": "concurrency_exhausted"}))
                self.assertEqual(get(url)[::2], (429, {"error": "rate_limited"}))
                status, _, body = first.result(timeout=2)
                self.assertEqual(status, 200)
                self.assertEqual(body["advisory"]["source"], "onnx-cpu")
            calls = [json.loads(call) for call in self.lines("calls")]
            self.assertEqual([call["pid"] for call in calls], [int(pid)] * 2)
            self.assertEqual(calls[0]["sample"]["requests"], 1)
            self.assertEqual(self.lines("starts"), [pid])
            self.assertEqual(self.metrics(api)["advisoryPrewarmAttempts"], 1)
        self.assertEqual(api.process.returncode, 0)
        self.assertFalse(Path("/proc", pid).exists())

    def test_in_progress_prewarm_does_not_delay_http(self):
        self.mode("gated-ready")
        with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1",
                      LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS="10000") as api:
            self.wait_until(lambda: self.lines("starts"))
            self.assertFalse(self.metrics(api)["advisoryWorkerReady"])
            self.assertEqual(get(api.base_url + "/ready")[0], 200)
            self.assertEqual(self.score(api), {
                "action": "allow", "source": "rule-only", "status": "simulated",
                "fallback": "unavailable", "score": 0.0})
            self.assertEqual(self.lines("calls"), [])
            (self.root / "release").touch()
            self.wait_until(lambda: self.metrics(api)["advisoryWorkerReady"])
            self.assertEqual(self.score(api)["source"], "onnx-cpu")
            self.assertEqual(len(self.lines("starts")), 1)

    def test_prewarm_failures_cool_down_and_allow_on_demand_recovery(self):
        for mode in ("bad-ready", "missing-ready", "slow-ready"):
            with self.subTest(mode=mode):
                self.mode(mode)
                starts = len(self.lines("starts"))
                calls = len(self.lines("calls"))
                with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1",
                              LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS="400") as api:
                    self.wait_until(lambda: self.metrics(api)["advisoryPrewarmFailures"] == 1)
                    self.assertFalse(self.metrics(api)["advisoryWorkerReady"])
                    self.assertEqual(self.score(api)["fallback"], "unavailable")
                    self.assertEqual(len(self.lines("starts")), starts + 1)
                    self.assertEqual(len(self.lines("calls")), calls)
                    self.assertFalse(Path("/proc", self.lines("starts")[-1]).exists())
                    self.mode("ready")
                    time.sleep(0.8)
                    self.assertEqual(self.score(api)["source"], "onnx-cpu")
                    self.assertTrue(self.metrics(api)["advisoryWorkerReady"])
                    self.assertEqual(self.metrics(api)["advisoryPrewarmAttempts"], 1)

    def test_ready_tracks_worker_exit_and_recovers_on_demand(self):
        with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1") as api:
            self.wait_until(lambda: self.metrics(api)["advisoryWorkerReady"])
            os.kill(int(self.lines("starts")[0]), signal.SIGKILL)
            self.wait_until(lambda: not self.metrics(api)["advisoryWorkerReady"])
            self.assertEqual(self.score(api)["fallback"], "unavailable")
            self.assertEqual(self.lines("calls"), [])
            time.sleep(0.8)
            self.assertEqual(self.score(api)["source"], "onnx-cpu")
            self.assertEqual(len(self.lines("starts")), 2)
            self.assertEqual(self.metrics(api)["advisoryPrewarmAttempts"], 1)

    def test_prewarm_does_not_bypass_redis_outage(self):
        with socket.socket() as unavailable:
            unavailable.bind(("127.0.0.1", 0))
            with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1",
                          LOCAL_EDGE_REDIS_PORT=str(unavailable.getsockname()[1])) as api:
                self.wait_until(lambda: self.metrics(api)["advisoryWorkerReady"])
                self.assertEqual(get(api.base_url + "/ready")[0], 503)
                self.assertEqual(get(api.base_url + "/api/expensive")[::2],
                                 (503, {"error": "quota_dependency_unavailable"}))
                self.assertEqual(self.metrics(api)["started"], 0)
                self.assertEqual(self.lines("calls"), [])
                self.assertEqual(len(self.lines("starts")), 1)

    def test_prewarm_missing_artifact_directory(self):
        with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1",
                      LOCAL_EDGE_ADVISORY_ARTIFACTS=str(self.root / "missing")) as api:
            self.wait_until(lambda: self.metrics(api)["advisoryPrewarmFailures"] == 1)
            self.assertFalse(self.metrics(api)["advisoryWorkerReady"])
            self.assertEqual(self.score(api)["fallback"], "unavailable")
            self.assertEqual(self.lines("starts"), [])

    def test_shutdown_cancels_prewarm_and_reaps_worker(self):
        self.mode("gated-ready")
        with self.api(LOCAL_EDGE_ADVISORY_PREWARM="1",
                      LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS="12000") as api:
            self.wait_until(lambda: self.lines("starts"))
            pid, = self.lines("starts")
            api.close()
            self.assertEqual(api.process.returncode, 0)
            self.assertFalse(Path("/proc", pid).exists())
            self.assertEqual(self.lines("calls"), [])

    def test_rejects_invalid_prewarm_configuration(self):
        for enabled, mode, prewarm in (("0", "persistent", "1"), ("1", "oneshot", "1"),
                                       ("1", "persistent", "yes")):
            with self.subTest(enabled=enabled, mode=mode, prewarm=prewarm):
                env = os.environ | self.settings | dict(
                    LOCAL_EDGE_ADVISORY_ENABLED=enabled, LOCAL_EDGE_ADVISORY_MODE=mode,
                    LOCAL_EDGE_ADVISORY_PREWARM=prewarm, COMPlus_DbgEnableMiniDump="0")
                result = subprocess.run(["dotnet", str(DLL)], cwd=ROOT, env=env,
                                        capture_output=True, text=True, timeout=3)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Invalid LOCAL_EDGE_ADVISORY_PREWARM", result.stderr)
        self.assertEqual(self.lines("starts"), [])

    def test_reuses_pid_after_idle_and_reaps_at_shutdown(self):
        self.mode("cold")
        with self.api() as api:
            self.assertEqual(self.lines("starts"), [])
            metrics = self.metrics(api)
            self.assertFalse(metrics["advisoryWorkerReady"])
            self.assertEqual(metrics["advisoryPrewarmAttempts"], 0)
            self.assertEqual(metrics["advisoryPrewarmFailures"], 0)
            elapsed = []
            for _ in range(2):
                start = time.monotonic()
                self.assertEqual(self.score(api), {
                    "action": "observe", "source": "onnx-cpu", "status": "simulated",
                    "fallback": "none", "score": 0.99})
                elapsed.append(time.monotonic() - start)
                time.sleep(0.35)  # Idle longer than the scoring deadline.
            self.assertEqual(self.metrics(api)["advisoryWorkerRestarts"], 0)
            self.assertEqual(len(self.lines("starts")), 1)
            pid = self.lines("starts")[0]
            self.assertEqual([json.loads(call)["pid"] for call in self.lines("calls")], [int(pid)] * 2)
        self.assertEqual(api.process.returncode, 0)
        self.assertFalse(Path("/proc", pid).exists())
        print(f"Persistent synthetic HTTP timing: cold={elapsed[0]*1000:.1f} ms, warm={elapsed[1]*1000:.1f} ms",
              flush=True)

    def test_invalid_handshake_never_sends_sample_and_matches_rules(self):
        self.mode("bad-ready")
        with self.api() as api:
            self.assertEqual(get(api.base_url + "/api/expensive?holdMs=invalid")[0], 400)
            self.assertEqual(self.score(api), {
                "action": "allow", "source": "rule-only", "status": "simulated",
                "fallback": "unavailable", "score": 0.15})
            self.assertEqual(self.lines("calls"), [])
            self.assertFalse(Path("/proc", self.lines("starts")[0]).exists())

    def test_startup_deadline_is_independent(self):
        self.mode("slow-ready")
        with self.api(LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS="400") as api:
            self.assertEqual(self.score(api)["fallback"], "timeout")
            self.assertEqual(self.lines("calls"), [])
            self.assertFalse(Path("/proc", self.lines("starts")[0]).exists())

    def test_invalid_response_kills_worker_and_never_retries(self):
        for mode in ("closed", "partial", "large", "malformed", "duplicate",
                     "nonfinite", "bad-source", "bad-action", "extra"):
            with self.subTest(mode=mode):
                self.mode(mode)
                with self.api() as api:
                    prior_calls = len(self.lines("calls"))
                    self.assertEqual(self.score(api)["fallback"], "unavailable")
                    self.assertEqual(len(self.lines("calls")), prior_calls + 1)
                    self.assertFalse(Path("/proc", self.lines("starts")[-1]).exists())

    def test_timeout_kills_tree_and_restarts_after_cooldown(self):
        self.mode("tree")
        with self.api(LOCAL_EDGE_ADVISORY_TIMEOUT_MS="700") as api:
            with ThreadPoolExecutor(max_workers=1) as pool:
                first = pool.submit(self.score, api)
                self.wait_until(lambda: self.lines("child"))
                self.assertFalse(first.done())
                self.assertEqual(self.score(api)["fallback"], "unavailable")
                self.assertEqual(first.result(timeout=2)["fallback"], "timeout")
            first_pid = self.lines("starts")[0]
            self.assertFalse(Path("/proc", first_pid).exists())
            child = Path("/proc", self.lines("child")[0], "stat")

            def exited():
                try:
                    return child.read_text().rsplit(")", 1)[1].split()[0] == "Z"
                except FileNotFoundError:
                    return True

            self.wait_until(exited)
            self.mode("ready")
            self.assertEqual(self.score(api)["fallback"], "unavailable")
            self.assertEqual(self.lines("starts"), [first_pid])
            time.sleep(0.8)
            self.assertEqual(self.score(api)["source"], "onnx-cpu")
            self.assertEqual(len(self.lines("starts")), 2)
            self.assertEqual(len(self.lines("calls")), 2)
            self.assertEqual(self.metrics(api)["advisoryWorkerRestarts"], 1)

    def test_client_abort_kills_worker_before_deadline(self):
        self.mode("hang")
        with self.api(LOCAL_EDGE_ADVISORY_TIMEOUT_MS="3000") as api:
            with socket.create_connection(("127.0.0.1", api.port), timeout=1) as client:
                client.sendall(b"GET /api/expensive HTTP/1.1\r\nHost: localhost\r\n\r\n")
                self.wait_until(lambda: self.lines("calls"))
            pid = self.lines("starts")[0]
            self.wait_until(lambda: not Path("/proc", pid).exists())
            self.assertEqual(self.metrics(api)["advisoryFallback"], 0)

    def test_shutdown_cancels_inflight_score_and_reaps_worker(self):
        self.mode("hang")
        with self.api(LOCAL_EDGE_ADVISORY_TIMEOUT_MS="3000") as api:
            with socket.create_connection(("127.0.0.1", api.port), timeout=1) as client:
                client.sendall(b"GET /api/expensive HTTP/1.1\r\nHost: localhost\r\n\r\n")
                self.wait_until(lambda: self.lines("calls"))
                pid = self.lines("starts")[0]
                api.close()
                self.assertEqual(api.process.returncode, 0)
                self.assertFalse(Path("/proc", pid).exists())

    def test_quota_and_concurrency_rejections_never_score(self):
        with self.api(LOCAL_EDGE_PERMITS="2", LOCAL_EDGE_CONCURRENCY="1") as api:
            url = api.base_url + "/api/expensive"
            with ThreadPoolExecutor(max_workers=1) as pool:
                first = pool.submit(get, url + "?holdMs=500")
                self.wait_until(lambda: self.metrics(api)["started"] == 1)
                self.assertEqual(get(url)[::2], (503, {"error": "concurrency_exhausted"}))
                self.assertEqual(get(url)[::2], (429, {"error": "rate_limited"}))
                self.assertEqual(self.lines("starts"), [])
                self.assertEqual(first.result(timeout=2)[0], 200)
        self.assertEqual(len(self.lines("calls")), 1)

    def test_redis_unavailable_does_not_start_worker(self):
        with socket.socket() as unavailable:
            unavailable.bind(("127.0.0.1", 0))
            with self.api(LOCAL_EDGE_REDIS_PORT=str(unavailable.getsockname()[1])) as api:
                self.assertEqual(get(api.base_url + "/api/expensive")[::2],
                                 (503, {"error": "quota_dependency_unavailable"}))
        self.assertEqual(self.lines("starts"), [])

    def test_invalid_worker_configuration_falls_back_without_starting(self):
        wrong = self.root / "wrong.py"
        wrong.write_text(FIXTURE)
        for overrides in ({"LOCAL_EDGE_ADVISORY_WORKER_SCRIPT": str(wrong)},
                          {"LOCAL_EDGE_ADVISORY_WORKER_SCRIPT": "persistent_worker.py"},
                          {"LOCAL_EDGE_ADVISORY_ARTIFACTS": str(self.root / "missing")}):
            with self.subTest(overrides=overrides), self.api(**overrides) as api:
                self.assertEqual(self.score(api)["fallback"], "unavailable")
        self.assertEqual(self.lines("starts"), [])
