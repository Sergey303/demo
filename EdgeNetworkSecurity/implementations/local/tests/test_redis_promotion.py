"""Bounded, opt-in real Redis promotion tests; not a Sentinel or load test."""
import contextlib
import os
import select
import socket
import socketserver
import threading
import tempfile
from pathlib import Path
import subprocess
import sys
import time
import unittest
from uuid import uuid4

from test_local_edge_api import RunningApi, choose_port, get
from test_redis_shared_quota import docker


class Endpoint(socketserver.ThreadingTCPServer):
    """Stable loopback endpoint; an operator switches it after fencing old primary."""
    daemon_threads = True

    def __init__(self, port):
        self.port = port
        self.generation = 0
        self.lock = threading.Lock()
        super().__init__(("127.0.0.1", 0), self.Handler)

    def switch(self, port):
        with self.lock:
            self.port = port
            self.generation += 1

    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            with self.server.lock:
                port, generation = self.server.port, self.server.generation
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=2) as upstream:
                    while True:
                        with self.server.lock:
                            if self.server.generation != generation:
                                return
                        for source in select.select([self.request, upstream], [], [], .1)[0]:
                            data = source.recv(65536)
                            if not data:
                                return
                            (upstream if source is self.request else self.request).sendall(data)
            except OSError:
                return

    def __enter__(self):
        self.thread = threading.Thread(target=self.serve_forever, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.shutdown()
        self.server_close()
        self.thread.join()


@unittest.skipUnless(os.getenv("RUN_REDIS_TESTS") == "1", "Opt-in disposable Redis")
class RedisPromotionTests(unittest.TestCase):
    WINDOW = 30
    def poll(self, fn, predicate, timeout=15):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            value = fn()
            if predicate(value):
                return value
            time.sleep(.15)
        self.fail(f"Condition not reached; last observation: {value!r}")

    def run_promotion(self, retained):
        tag = "demo-edge-promotion-" + uuid4().hex[:10]
        primary, replica = tag + "-p", tag + "-r"
        pport, rport = choose_port(), choose_port()
        while rport == pport:
            rport = choose_port()
        nested = os.getenv("EDGE_REDIS_NETWORK_CONTAINER")
        self.assertIn(nested, (None, "rdc-project"))

        with contextlib.ExitStack() as stack:
            if not nested:
                docker("network", "create", tag)
                stack.callback(docker, "network", "rm", tag)

            def start(name, port, extra):
                if nested:
                    net = ["--network", "container:rdc-project"]
                    bind = ["--bind", "127.0.0.1", "--port", str(port)]
                else:
                    net = ["--network", tag, "-p", f"127.0.0.1:{port}:6379"]
                    bind = ["--protected-mode", "no"]
                docker("run", "--pull", "never", "-d", "--name", name, *net,
                       "--memory", "96m", "--cpus", "0.5", "redis:7-alpine",
                       "redis-server", *bind, "--save", "", "--appendonly", "no",
                       "--repl-diskless-sync-delay", "0", *extra)
                stack.callback(docker, "rm", "-f", name)

            def cli(name, *args):
                port = (pport if name == primary else rport) if nested else 6379
                return docker("exec", name, "redis-cli", "-p", str(port), "--raw", *args)

            start(primary, pport, [])
            start(replica, rport, ["--replicaof", "127.0.0.1" if nested else primary,
                                  str(pport if nested else 6379)])
            self.poll(lambda: cli(replica, "INFO", "replication"),
                      lambda info: "master_link_status:up" in info)
            with Endpoint(pport) as endpoint, tempfile.TemporaryDirectory() as gates:
                gate = Path(gates) / "primary"
                def run_id(name):
                    return next(line.split(":", 1)[1] for line in cli(name, "INFO", "server").splitlines()
                                if line.startswith("run_id:"))
                # Fresh isolated namespace; initial pin has no predecessor.
                gate.write_text(f"{self.WINDOW * 1000}:{run_id(primary)}\n")
                namespace = "promotion-" + uuid4().hex[:20]
                key = "demo:edge:quota:v1:" + namespace
                options = dict(LOCAL_EDGE_REDIS_PORT=str(endpoint.server_address[1]),
                               LOCAL_EDGE_REDIS_NAMESPACE=namespace,
                               LOCAL_EDGE_PERMITS="4", LOCAL_EDGE_WINDOW_SECONDS=str(self.WINDOW),
                               LOCAL_EDGE_REDIS_PRIMARY_GATE=str(gate))
                with RunningApi(**options) as first, RunningApi(**options) as second:
                    apis = (first, second)
                    for api in apis:
                        self.poll(lambda: get(api.base_url + "/ready")[0], lambda s: s == 200)
                    # All assertions must hold within one Redis-time bucket.
                    now = lambda name: int(cli(name, "TIME").splitlines()[0])
                    remaining = self.WINDOW - now(primary) % self.WINDOW
                    if remaining < 15:
                        time.sleep(remaining + .2)
                    bucket = now(primary) // self.WINDOW
                    def request(api):
                        return get(api.base_url + "/api/expensive")[0]
                    # Replicate exactly the chosen number of permits, then sever replication.
                    for i in range(retained):
                        self.assertEqual(request(apis[i % 2]), 200)
                    expected = f"{bucket}:{retained}" if retained else ""
                    self.poll(lambda: cli(replica, "GET", key),
                              lambda state: state == expected)
                    if retained < 4:
                        # Reparent to an unreachable endpoint; no full sync occurs.
                        self.assertEqual(cli(replica, "REPLICAOF", "127.0.0.1", "1"), "OK")
                        self.poll(lambda: cli(replica, "INFO", "replication"),
                                  lambda info: "master_link_status:down" in info
                                  and "master_port:1" in info)
                    for i in range(retained, 4):
                        self.assertEqual(request(apis[i % 2]), 200)
                    self.assertEqual(request(first), 429)
                    self.assertEqual(cli(primary, "GET", key), f"{bucket}:4")
                    self.poll(lambda: cli(replica, "GET", key), lambda state: state == expected)
                    docker("stop", "--time", "1", primary)
                    # No fallback work during loss of the old primary.
                    for api in apis:
                        self.assertEqual(request(api), 503)
                    self.assertEqual(cli(replica, "REPLICAOF", "NO", "ONE"), "OK")
                    self.assertEqual(cli(replica, "ROLE").splitlines()[0], "master")
                    self.assertEqual(cli(replica, "GET", key), expected)
                    endpoint.switch(rport)
                    # A stale but valid old pin must not authorize the new primary.
                    for api in apis:
                        self.assertEqual(get(api.base_url + "/ready")[0], 503)
                    self.assertEqual(now(replica) // self.WINDOW, bucket, "window crossed")
                    after = [request(apis[i % 2]) for i in range(5)]
                    self.assertEqual(after, [503] * 5)
                    self.assertEqual(cli(replica, "GET", key), expected)
                    self.assertEqual(sum(get(a.base_url + "/metrics")[2]["started"] for a in apis), 4)
                    # Restart cannot self-enroll on the promoted primary.
                    with RunningApi(**options) as restarted:
                        self.assertEqual(get(restarted.base_url + "/ready")[0], 503)
                        self.assertEqual(request(restarted), 503)
                        self.assertEqual(get(restarted.base_url + "/metrics")[2]["started"], 0)
                    self.assertEqual(now(replica) // self.WINDOW, bucket)
                    if retained == 0:
                        controller = Path(__file__).resolve().parents[1] / "tools" / "primary_gate.py"
                        begun = time.monotonic()
                        with subprocess.Popen([sys.executable, str(controller), str(gate),
                                               "--run-id", run_id(replica), "--window", str(self.WINDOW),
                                               "--old-primary-fenced"]) as rotation:
                            try:
                                self.poll(gate.read_text, lambda value: value == "closed\n")
                                for api in apis:
                                    self.assertEqual(request(api), 503)
                                self.assertEqual(rotation.wait(timeout=self.WINDOW + 5), 0)
                            finally:
                                if rotation.poll() is None:
                                    rotation.kill()
                                    rotation.wait()
                        self.assertGreaterEqual(time.monotonic() - begun, self.WINDOW)
                        for api in apis:
                            self.poll(lambda: get(api.base_url + "/ready")[0], lambda s: s == 200)
                        self.assertGreater(now(replica) // self.WINDOW, bucket)
                        reopened = [request(apis[i % 2]) for i in range(5)]
                        self.assertEqual(reopened, [200, 200, 200, 200, 429])
                        # A previously fenced server returning at the old endpoint
                        # must not re-enroll or open an independent quota.
                        docker("start", primary)
                        def old_ping():
                            try:
                                return cli(primary, "PING")
                            except RuntimeError:
                                return ""
                        self.poll(old_ping, lambda reply: reply == "PONG")
                        endpoint.switch(pport)
                        time.sleep(.3)
                        for api in apis:
                            self.assertEqual(get(api.base_url + "/ready")[0], 503)
                            self.assertEqual(request(api), 503)
                        self.assertEqual(cli(primary, "GET", key), "")
                        self.assertEqual(sum(get(a.base_url + "/metrics")[2]["started"] for a in apis), 8)
                    print(f"SAFE_PROMOTION retained={retained} state={expected!r} after={after} "
                          f"old_window_started=4", flush=True)

    def test_retained_state(self):
        self.run_promotion(4)

    def test_lost_two_charges(self):
        self.run_promotion(2)


    def test_lost_all_charges(self):
        self.run_promotion(0)
