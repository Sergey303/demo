"""Real Redis TIME jumps via a process-local shim, without changing host time."""
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import time
import unittest
from uuid import uuid4

from test_local_edge_api import RunningApi, choose_port, get
from test_redis_shared_quota import docker, manifest


@unittest.skipUnless(os.getenv("RUN_REDIS_CLOCK_TESTS") == "1",
                     "Opt-in Redis process-local clock fault injection")
class RedisWallClockTests(unittest.TestCase):
    def test_forward_backward_and_restore_do_not_reopen_quota(self):
        self.assertEqual(platform.machine(), "x86_64")
        self.assertTrue(shutil.which("gcc"))
        self.assertEqual(platform.system(), "Linux")
        window = 30
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shim = root / "clock.so"
            source = Path(__file__).parent / "fixtures" / "redis_wall_clock.c"
            subprocess.run(["gcc", "-shared", "-fPIC", "-nostdlib", "-fno-stack-protector",
                            "-fno-builtin", "-o", str(shim), str(source)], check=True)
            name = "demo-edge-clock-" + uuid4().hex[:10]
            port = choose_port()
            nested = os.getenv("EDGE_REDIS_NETWORK_CONTAINER")
            self.assertIn(nested, (None, "rdc-project"))
            if nested:
                network = ["--network", "container:rdc-project"]
                server = f"--bind 127.0.0.1 --port {port}"
                redis_port = port
            else:
                network = ["-p", f"127.0.0.1:{port}:6379"]
                server = ""
                redis_port = 6379
            docker("run", "-d", "--pull", "never", "--name", name, *network,
                   "--memory", "96m", "--cpus", "0.5", "--entrypoint", "sh",
                   "redis:7-alpine", "-c",
                   'while [ ! -f /tmp/edge-clock-ready ]; do sleep .1; done; '
                   'LD_PRELOAD=/tmp/edge-clock.so exec redis-server --save "" --appendonly no ' + server)
            try:
                docker("cp", str(shim), name + ":/tmp/edge-clock.so")
                docker("exec", name, "sh", "-c", "echo 0 >/tmp/edge-clock-offset; touch /tmp/edge-clock-ready")
                def cli(*args):
                    return docker("exec", name, "redis-cli", "-p", str(redis_port), "--raw", *args)
                deadline = time.monotonic() + 10
                while True:
                    try:
                        if cli("PING") == "PONG":
                            break
                    except RuntimeError:
                        pass
                    self.assertLess(time.monotonic(), deadline)
                    time.sleep(.1)
                run_id = next(line.split(":", 1)[1] for line in cli("INFO", "server").splitlines()
                              if line.startswith("run_id:"))
                pin = root / "primary"
                pin.write_text(manifest(window, run_id))
                namespace = "clock-" + uuid4().hex[:20]
                key = "demo:edge:quota:v2:" + namespace
                options = dict(LOCAL_EDGE_REDIS_PORT=str(port), LOCAL_EDGE_REDIS_NAMESPACE=namespace,
                               LOCAL_EDGE_PERMITS="4", LOCAL_EDGE_WINDOW_SECONDS=str(window),
                               LOCAL_EDGE_REDIS_PRIMARY_GATE=str(pin))
                with RunningApi(**options) as first, RunningApi(**options) as second:
                    for api in (first, second):
                        self.assertEqual(get(api.base_url + "/ready")[0], 200)
                    remaining = window - time.monotonic() % window
                    if remaining < 15:
                        time.sleep(remaining + .15)
                    bucket = int(time.monotonic() // window)
                    def request(api):
                        return get(api.base_url + "/api/expensive")[0]
                    self.assertEqual([request(a) for a in (first, second, first, second)], [200] * 4)
                    state = f"{bucket}:4"
                    self.assertEqual(cli("GET", key), state)
                    for shift in (3600, -3600, 0):
                        docker("exec", name, "sh", "-c",
                               f"echo {shift} >/tmp/edge-clock-next; mv /tmp/edge-clock-next /tmp/edge-clock-offset")
                        actual = int(cli("TIME").splitlines()[0])
                        self.assertLess(abs(actual - time.time() - shift), 3)
                        self.assertEqual([request(first), request(second)], [429, 429])
                        self.assertEqual(cli("GET", key), state)
                        self.assertEqual(cli("PTTL", key), "-1")
                        self.assertEqual(int(time.monotonic() // window), bucket)
                        print(f"WALL_CLOCK shift={shift} Redis_TIME={actual} state={state} codes=429,429",
                              flush=True)
                    with RunningApi(**options) as restarted:
                        self.assertEqual(get(restarted.base_url + "/ready")[0], 200)
                        self.assertEqual(request(restarted), 429)
                        self.assertEqual(get(restarted.base_url + "/metrics")[2]["started"], 0)
                    self.assertEqual(sum(get(a.base_url + "/metrics")[2]["started"] for a in (first, second)), 4)
                    self.assertEqual(int(time.monotonic() // window), bucket)
                    time.sleep(window - time.monotonic() % window + .15)
                    self.assertEqual(request(first), 200)
                    self.assertEqual(cli("GET", key), f"{bucket + 1}:1")
                    # A delayed command from the old monotonic bucket may not rewind state.
                    script = (Path(__file__).resolve().parents[1] / "src/LocalEdgeApi/quota-v2.lua").read_text()
                    reply = cli("EVAL", script, "1", key, "4", str(window * 1000),
                                run_id, "admit", str(bucket * window * 1000))
                    self.assertIn("ERR stale monotonic sample", reply)
                    self.assertEqual(cli("GET", key), f"{bucket + 1}:1")
            finally:
                docker("rm", "-f", name)
