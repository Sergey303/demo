"""Opt-in Redis 7 tests with disposable Docker. No production Redis is touched.

RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
"""
import concurrent.futures
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import unittest
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_local_edge_api import RunningApi, choose_port, get


def docker(*args, timeout=30):
    result = subprocess.run(["docker", *args], text=True, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"docker {' '.join(args[:2])} failed: {result.stderr[-500:]}")
    return result.stdout.strip()


@unittest.skipUnless(os.getenv("RUN_REDIS_TESTS") == "1",
                     "Set RUN_REDIS_TESTS=1 to opt in to disposable Docker Redis tests")
class RedisSharedQuotaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which("docker"):
            raise RuntimeError("RUN_REDIS_TESTS=1 requires Docker")
        cls.redis_port = choose_port()
        cls.name = "demo-edge-redis-" + uuid4().hex[:10]
        cls.container_started = False
        try:
            cls.start_redis()
        except BaseException:
            cls.stop_redis()
            raise

    @classmethod
    def start_redis(cls):
        network_container = os.getenv("EDGE_REDIS_NETWORK_CONTAINER")
        if network_container is not None:
            # In nested rdc-project, both processes access the same 127.0.0.1.
            # Redis binds ONLY to that loopback interface.
            if network_container != "rdc-project":
                raise ValueError("Only the authorized rdc-project namespace is supported")
            network_args = ["--network", f"container:{network_container}"]
            server_args = ["redis-server", "--bind", "127.0.0.1",
                           "--port", str(cls.redis_port), "--save", "", "--appendonly", "no"]
        else:
            # Ordinary CI runner with a local Docker engine.
            network_args = ["-p", f"127.0.0.1:{cls.redis_port}:6379"]
            server_args = ["redis-server", "--save", "", "--appendonly", "no"]
        docker("run", "-d", "--rm", "--name", cls.name,
               *network_args, "--memory", "96m", "--cpus", "0.5",
               "redis:7-alpine", *server_args, timeout=45)
        cls.container_started = True
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            try:
                with socket.create_connection(("127.0.0.1", cls.redis_port), timeout=0.3) as conn:
                    conn.sendall(b"*1\r\n$4\r\nPING\r\n")
                    if b"PONG" in conn.recv(128):
                        return
            except OSError:
                pass
            time.sleep(0.1)
        raise RuntimeError("isolated Redis not ready")

    @classmethod
    def stop_redis(cls):
        if getattr(cls, "container_started", False):
            try:
                docker("stop", "--time", "1", cls.name, timeout=20)
            except RuntimeError:
                pass
            cls.container_started = False

    @classmethod
    def tearDownClass(cls):
        cls.stop_redis()

    def options(self, namespace=None):
        return dict(
            LOCAL_EDGE_REDIS_PORT=str(self.redis_port),
            LOCAL_EDGE_REDIS_NAMESPACE=namespace or ("test-" + uuid4().hex[:20]),
            LOCAL_EDGE_PERMITS="4",
            LOCAL_EDGE_WINDOW_SECONDS="5",
            LOCAL_EDGE_CONCURRENCY="20",
        )

    def ensure_window_budget(self, window_seconds=5):
        """Do not span the Redis fixed-window boundary during an atomicity assertion."""
        with socket.create_connection(("127.0.0.1", self.redis_port), timeout=2) as conn:
            conn.sendall(b"*1\r\n$4\r\nTIME\r\n")
            conn.settimeout(2)
            raw = b""
            while raw.count(b"\r\n") < 5:
                raw += conn.recv(128)
        fields = raw.split(b"\r\n")
        now = int(fields[2]) + int(fields[4]) / 1_000_000
        remaining = window_seconds - (now % window_seconds)
        if remaining < 2.5:
            time.sleep(remaining + 0.15)

    def test_two_instances_share_exact_atomic_quota(self):
        options = self.options()
        self.ensure_window_budget()
        with RunningApi(**options) as first, RunningApi(**options) as second:
            # Starting processes might cross a window; align again before issuing traffic.
            self.ensure_window_budget()
            destinations = [first, second] * 6
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                futures = [
                    pool.submit(get, api.base_url + "/api/expensive",
                                {"X-Forwarded-For": f"10.0.0.{index + 1}"})
                    for index, api in enumerate(destinations)
                ]
                replies = [f.result(timeout=5) for f in futures]
            codes = [status for status, _, _ in replies]
            self.assertEqual(codes.count(200), 4, codes)
            self.assertEqual(codes.count(429), 8, codes)
            self.assertTrue(all(status != 503 for status in codes), codes)
            self.assertTrue(all(int(headers["Retry-After"]) >= 1
                                for status, headers, _ in replies if status == 429))
            _, _, a = get(first.base_url + "/metrics")
            _, _, b = get(second.base_url + "/metrics")
            self.assertEqual(a["scope"], "redis_shared")
            self.assertEqual(b["scope"], "redis_shared")
            self.assertEqual(a["completed"] + b["completed"], 4)
            self.assertEqual(a["rateRejected"] + b["rateRejected"], 8)

    def test_namespace_isolation(self):
        options_a = self.options(namespace="isolated-a-" + uuid4().hex[:8])
        options_b = self.options(namespace="isolated-b-" + uuid4().hex[:8])
        with RunningApi(**options_a) as first, RunningApi(**options_b) as second:
            for _ in range(4):
                self.assertEqual(get(first.base_url + "/api/expensive")[0], 200)
            self.assertEqual(get(first.base_url + "/api/expensive")[0], 429)
            self.assertEqual(get(second.base_url + "/api/expensive")[0], 200)

    def test_cold_start_without_redis_fails_closed_then_recovers(self):
        options = self.options()
        self.stop_redis()
        try:
            with RunningApi(**options) as api:
                self.assertEqual(get(api.base_url + "/health")[0], 200)
                status, _, payload = get(api.base_url + "/api/expensive")
                self.assertEqual(status, 503)
                self.assertEqual(payload["error"], "quota_dependency_unavailable")
                self.start_redis()
                deadline = time.monotonic() + 10
                while time.monotonic() < deadline:
                    status, _, _ = get(api.base_url + "/api/expensive")
                    if status == 200:
                        break
                    time.sleep(0.8)
                else:
                    self.fail("cold-start Redis reconnection failed")
        finally:
            if not self.container_started:
                self.start_redis()

    def test_unavailable_redis_fails_closed_then_recovers(self):
        options = self.options()
        with RunningApi(**options) as api:
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)
            self.stop_redis()
            try:
                deadline = time.monotonic() + 6
                while True:
                    status, _, body = get(api.base_url + "/api/expensive")
                    if status == 503:
                        break
                    if time.monotonic() >= deadline:
                        self.fail(f"Redis outage did not close: {status} {body}")
                    time.sleep(0.2)
                self.assertEqual(body["error"], "quota_dependency_unavailable")
                self.assertEqual(get(api.base_url + "/health")[0], 200)
                _, _, counters = get(api.base_url + "/metrics")
                self.assertGreater(counters["redisUnavailable"], 0)

                self.start_redis()
                deadline = time.monotonic() + 12
                while time.monotonic() < deadline:
                    status, _, _ = get(api.base_url + "/api/expensive")
                    if status == 200:
                        break
                    time.sleep(0.8)
                else:
                    self.fail("redis quota did not recover")
            finally:
                if not self.container_started:
                    self.start_redis()


if __name__ == "__main__":
    unittest.main()
