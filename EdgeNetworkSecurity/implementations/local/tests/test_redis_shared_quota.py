"""Opt-in Redis 7 tests with disposable Docker. No production Redis is touched.

RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
"""
import concurrent.futures
import json
import math
import os
from pathlib import Path
import shutil
import select
import socket
import socketserver
import struct
import subprocess
import sys
import threading
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


class ReplyResetRelay(socketserver.ThreadingTCPServer):
    """Loopback Redis relay that resets one connection after an EVAL reply arrives."""

    daemon_threads = True

    def __init__(self, redis_port):
        self.redis_port = redis_port
        self.armed = threading.Event()
        self.reset = threading.Event()
        super().__init__(("127.0.0.1", 0), self.Handler)

    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            try:
                with socket.create_connection(("127.0.0.1", self.server.redis_port),
                                              timeout=2) as upstream:
                    self.forward(upstream)
            except OSError:
                # Connection shutdown can race the relay or an API process exiting.
                return

        def forward(self, upstream):
            discard_reply = False
            tail = b""
            while readable := select.select([self.request, upstream], [], [], 30)[0]:
                for source in readable:
                    data = source.recv(65536)
                    if not data:
                        return
                    if source is self.request:
                        command = (tail + data).upper()
                        if self.server.armed.is_set() and b"\r\nEVAL\r\n" in command:
                            discard_reply = True
                            self.server.armed.clear()
                        tail = command[-7:]
                        upstream.sendall(data)
                    elif discard_reply:
                        self.request.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER,
                                                struct.pack("ii", 1, 0))
                        self.request.close()
                        self.server.reset.set()
                        return
                    else:
                        self.request.sendall(data)

    def __enter__(self):
        self.thread = threading.Thread(target=self.serve_forever, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.shutdown()
        self.server_close()
        self.thread.join()


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
        docker("run", "--pull", "never", "-d", "--rm", "--name", cls.name,
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

    def redis(self, *args):
        parts = [str(arg).encode() for arg in args]
        command = f"*{len(parts)}\r\n".encode() + b"".join(
            f"${len(part)}\r\n".encode() + part + b"\r\n" for part in parts
        )
        with socket.create_connection(("127.0.0.1", self.redis_port), timeout=2) as conn:
            conn.sendall(command)
            with conn.makefile("rb") as stream:
                def read_reply():
                    header = stream.readline()
                    kind, value = header[:1], header[1:-2]
                    if kind == b"*":
                        return [read_reply() for _ in range(int(value))]
                    if kind == b"$":
                        length = int(value)
                        return None if length == -1 else stream.read(length + 2)[:-2]
                    if kind == b":":
                        return int(value)
                    if kind == b"+":
                        return value
                    raise AssertionError(f"Unexpected Redis reply: {header!r}")

                return read_reply()

    def redis_time(self):
        seconds, micros = self.redis("TIME")
        return int(seconds) + int(micros) / 1_000_000

    def ensure_window_budget(self, window_seconds=5):
        remaining = window_seconds - (self.redis_time() % window_seconds)
        if remaining < window_seconds / 2:
            time.sleep(remaining + 0.15)

    @staticmethod
    def quota_key(options):
        return "demo:edge:quota:v1:" + options["LOCAL_EDGE_REDIS_NAMESPACE"]

    def test_readiness_does_not_create_or_extend_quota(self):
        options = self.options()
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            for _ in range(5):
                self.assertEqual(get(api.base_url + "/ready")[0], 200)
            self.assertIsNone(self.redis("GET", key))
            self.ensure_window_budget()
            for _ in range(4):
                self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)
            state, ttl = self.redis("GET", key), self.redis("PTTL", key)
            time.sleep(0.05)
            self.assertEqual(get(api.base_url + "/ready")[0], 200)
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 429)
            self.assertEqual(self.redis("GET", key), state)
            self.assertLess(self.redis("PTTL", key), ttl)

    def test_window_rolls_over_with_old_key_still_present(self):
        options = self.options()
        options.update(LOCAL_EDGE_PERMITS="1", LOCAL_EDGE_WINDOW_SECONDS="3")
        key = self.quota_key(options)
        with RunningApi(**options) as first, RunningApi(**options) as second:
            self.assertEqual(get(first.base_url + "/ready")[0], 200)
            self.assertEqual(get(second.base_url + "/ready")[0], 200)
            self.ensure_window_budget(3)
            self.assertEqual(get(first.base_url + "/api/expensive")[0], 200)
            old_state = self.redis("GET", key)
            old_bucket = int(old_state.split(b":")[0])
            status, headers, body = get(second.base_url + "/api/expensive")
            self.assertEqual((status, body), (429, {"error": "rate_limited"}))
            self.assertIn(int(headers["Retry-After"]), range(1, 4))
            boundary = (old_bucket + 1) * 3
            time.sleep(max(0, boundary - self.redis_time()) + 0.05)
            self.assertEqual(self.redis("GET", key), old_state)
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                codes = list(pool.map(lambda api: get(api.base_url + "/api/expensive")[0],
                                      (first, second)))
            self.assertEqual(sorted(codes), [200, 429])
            self.assertEqual(self.redis("GET", key), f"{old_bucket + 1}:1".encode())
            self.assertGreater(self.redis("PTTL", key), 0)

    def test_idle_quota_key_expires(self):
        options = self.options()
        options["LOCAL_EDGE_WINDOW_SECONDS"] = "1"
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)
            ttl = self.redis("PTTL", key)
            self.assertIn(ttl, range(1, 2001))
            deadline = time.monotonic() + ttl / 1000 + 1
            while self.redis("GET", key) is not None:
                if time.monotonic() >= deadline:
                    self.fail("idle quota key did not expire")
                time.sleep(0.1)
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)

    def test_retained_bad_state_fails_closed_without_overwriting_it(self):
        options = self.options()
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            future_bucket = int(self.redis_time() // 5) + 2
            for value in ("bad-state", f"{future_bucket}:1"):
                with self.subTest(value=value):
                    self.assertEqual(self.redis("SET", key, value, "PX", 10000), b"OK")
                    status, _, body = get(api.base_url + "/api/expensive")
                    self.assertEqual((status, body), (503, {"error": "quota_dependency_unavailable"}))
                    self.assertEqual(self.redis("GET", key), value.encode())
            self.assertEqual(get(api.base_url + "/metrics")[2]["started"], 0)
            self.redis("DEL", key)
            self.wait_ready(api)
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)

    def wait_for_single_charge(self, key):
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            value = self.redis("GET", key)
            if value is not None:
                self.assertTrue(value.endswith(b":1"), value)
                return
            time.sleep(0.05)
        self.fail("Redis did not record the dispatched quota command")

    def test_paused_redis_times_out_without_running_protected_work(self):
        options = self.options()
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            self.assertEqual(get(api.base_url + "/ready")[0], 200)
            self.assertEqual(self.redis("CLIENT", "PAUSE", 1600, "ALL"), b"OK")
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                ready = pool.submit(get, api.base_url + "/ready")
                quota = pool.submit(get, api.base_url + "/api/expensive")
                self.assertEqual(ready.result()[0], 503)
                status, _, body = quota.result()
                self.assertEqual((status, body), (503, {"error": "quota_dependency_unavailable"}))
            self.assertEqual(get(api.base_url + "/health")[0], 200)
            metrics = get(api.base_url + "/metrics")[2]
            self.assertEqual((metrics["started"], metrics["redisUnavailable"]), (0, 1))
            # Redis can still execute the dispatched command after the HTTP wait times out.
            self.wait_for_single_charge(key)
            self.wait_ready(api)
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)

    def test_disconnected_http_client_does_not_run_protected_work(self):
        options = self.options()
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            self.assertEqual(get(api.base_url + "/ready")[0], 200)
            self.assertEqual(self.redis("CLIENT", "PAUSE", 650, "WRITE"), b"OK")
            with socket.create_connection(("127.0.0.1", api.port), timeout=2) as client:
                client.sendall(b"GET /api/expensive HTTP/1.1\r\nHost: localhost\r\n\r\n")
                time.sleep(0.15)
                client.shutdown(socket.SHUT_RDWR)

            # Confirm the API dispatched the command even though the caller disconnected.
            self.wait_for_single_charge(key)
            metrics = get(api.base_url + "/metrics")[2]
            self.assertEqual((metrics["started"], metrics["redisUnavailable"]), (0, 0))
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)

    def test_two_instances_share_exact_atomic_quota(self):
        options = self.options()
        self.ensure_window_budget()
        with RunningApi(**options) as first, RunningApi(**options) as second:
            # Each cold replica must finish its initial read-only probe before the burst.
            for api in (first, second):
                self.wait_ready(api)
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
            self.ensure_window_budget()
            for _ in range(4):
                self.assertEqual(get(first.base_url + "/api/expensive")[0], 200)
            self.assertEqual(get(first.base_url + "/api/expensive")[0], 429)
            self.assertEqual(get(second.base_url + "/api/expensive")[0], 200)

    def assert_dependency_unavailable(self, api):
        status, _, body = get(api.base_url + "/api/expensive")
        self.assertEqual((status, body), (503, {"error": "quota_dependency_unavailable"}))

    def wait_ready(self, api):
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            status, _, body = get(api.base_url + "/ready")
            if status == 200:
                return
            self.assertEqual((status, body), (503, {"status": "not_ready",
                                                   "error": "quota_dependency_unavailable"}))
            time.sleep(0.1)
        self.fail("Redis quota did not recover")

    def test_redis_reply_lost_after_quota_dispatch(self):
        options = self.options()
        options.update(LOCAL_EDGE_PERMITS="1", LOCAL_EDGE_WINDOW_SECONDS="20")
        key = self.quota_key(options)
        with ReplyResetRelay(self.redis_port) as relay:
            options["LOCAL_EDGE_REDIS_PORT"] = str(relay.server_address[1])
            with RunningApi(**options) as api:
                self.wait_ready(api)
                self.ensure_window_budget(20)
                relay.armed.set()
                self.assert_dependency_unavailable(api)
                self.assertTrue(relay.reset.wait(1), "relay did not drop the EVAL reply")
                self.wait_for_single_charge(key)
                self.assertEqual(get(api.base_url + "/metrics")[2]["started"], 0)
                self.wait_ready(api)
                self.assertEqual(get(api.base_url + "/api/expensive")[0], 429)
                self.assertEqual(get(api.base_url + "/metrics")[2]["started"], 0)

    def test_client_abort_during_recovery_keeps_probe_slot(self):
        options = self.options()
        key = self.quota_key(options)
        with RunningApi(**options) as api:
            self.wait_ready(api)
            self.assertEqual(self.redis("SET", key, "bad-state"), b"OK")
            self.assert_dependency_unavailable(api)
            self.redis("DEL", key)
            time.sleep(0.8)
            self.assertEqual(self.redis("CLIENT", "PAUSE", 1500, "ALL"), b"OK")
            with socket.create_connection(("127.0.0.1", api.port), timeout=2) as client:
                client.sendall(b"GET /api/expensive HTTP/1.1\r\nHost: localhost\r\n\r\n")
                time.sleep(0.2)
                client.shutdown(socket.SHUT_RDWR)

            start = time.monotonic()
            self.assert_dependency_unavailable(api)
            self.assertLess(time.monotonic() - start, 0.5)
            self.wait_ready(api)
            self.assertIsNone(self.redis("GET", key))
            metrics = get(api.base_url + "/metrics")[2]
            self.assertEqual((metrics["started"], metrics["redisUnavailable"]), (0, 2))
            self.assertEqual(get(api.base_url + "/api/expensive")[0], 200)

    def test_two_replica_outage_report(self):
        options = self.options()
        options.update(LOCAL_EDGE_WINDOW_SECONDS="20")
        key = self.quota_key(options)
        report = {}

        def request(api):
            start = time.perf_counter()
            status, _, body = get(api.base_url + "/api/expensive")
            if status == 503:
                self.assertEqual(body, {"error": "quota_dependency_unavailable"})
            return status, (time.perf_counter() - start) * 1000

        def sample(phase, destinations, expected):
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                results = list(pool.map(request, destinations))
            codes, latencies = zip(*results)
            self.assertEqual(sorted(codes), sorted(expected))
            ordered = sorted(latencies)
            if phase in ("cold_open", "warm_open"):
                self.assertLess(ordered[-1], 500, (phase, ordered))
            if phase == "warm_half_open":
                self.assertLessEqual(sum(ms >= 500 for ms in ordered), 2, ordered)
            report[phase] = {
                "n": len(codes), **{str(code): codes.count(code) for code in (200, 429, 503)},
                **{f"p{p}_ms": round(ordered[math.ceil(p / 100 * len(codes)) - 1], 2)
                   for p in (50, 95)},
            }

        def assert_outage(apis, started, unavailable):
            for api in apis:
                self.assertEqual(get(api.base_url + "/health")[0], 200)
                self.assertEqual(get(api.base_url + "/ready")[0], 503)
            metrics = [get(api.base_url + "/metrics")[2] for api in apis]
            self.assertEqual(sum(m["started"] for m in metrics), started)
            self.assertEqual(sum(m["redisUnavailable"] for m in metrics), unavailable)

        self.stop_redis()
        try:
            with RunningApi(**options) as first, RunningApi(**options) as second:
                apis = (first, second)
                sample("cold_initial", apis, [503] * 2)
                sample("cold_open", apis * 6, [503] * 12)
                assert_outage(apis, started=0, unavailable=14)
                self.start_redis()
                redis_available = time.perf_counter()
                for api in apis:
                    self.wait_ready(api)
                report["cold_redis_ping_to_both_ready_ms"] = round(
                    (time.perf_counter() - redis_available) * 1000, 2)
                self.assertIsNone(self.redis("GET", key))
                self.ensure_window_budget(20)
                sample("cold_recovered", apis * 6, [200] * 4 + [429] * 8)

                # Stall established TCP connections; Redis retains the exhausted quota.
                state = self.redis("GET", key)
                self.assertEqual(self.redis("CLIENT", "PAUSE", 3500, "ALL"), b"OK")
                pause_started = time.perf_counter()
                sample("warm_initial", apis, [503] * 2)
                sample("warm_open", apis * 6, [503] * 12)
                assert_outage(apis, started=4, unavailable=28)

                # A retry cooldown has passed, but Redis is still paused. Parallel
                # callers fail closed while one read-only recovery probe owns each slot.
                time.sleep(0.8)
                sample("warm_half_open", apis * 6, [503] * 12)
                assert_outage(apis, started=4, unavailable=40)
                for api in apis:
                    self.wait_ready(api)
                report["warm_pause_to_both_ready_ms"] = round(
                    (time.perf_counter() - pause_started) * 1000, 2)
                self.assertEqual(self.redis("GET", key), state)
                sample("warm_recovered", apis * 6, [429] * 12)
                self.assertEqual(sum(get(api.base_url + "/metrics")[2]["started"]
                                     for api in apis), 4)
                print("REDIS_OUTAGE_REPORT " + json.dumps(report), flush=True)
        finally:
            if not self.container_started:
                self.start_redis()


if __name__ == "__main__":
    unittest.main()
