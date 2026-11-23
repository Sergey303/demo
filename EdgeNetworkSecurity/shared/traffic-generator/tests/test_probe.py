"""Network-bound tests use only an in-process HTTPServer on 127.0.0.1."""
import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import threading
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "probe.py"
spec = importlib.util.spec_from_file_location("edge_loopback_probe", SOURCE)
probe = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = probe
spec.loader.exec_module(probe)


def scenario(**overrides):
    data = {"id": "local-only", "target": "local", "durationSeconds": 1,
            "maxRequestsPerSecond": 2, "trafficProfile": "baseline"}
    data.update(overrides)
    return json.dumps(data)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/expensive":
            self.send_response(429)
            self.send_header("Content-Length", "0")
        else:
            self.send_response(302)
            self.send_header("Location", "http://example.com/must-not-follow")
            self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *args):
        pass


class ProbeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def test_reject_non_loopback_and_injected_urls(self):
        for url in (
            "https://127.0.0.1:5000/health", "http://localhost:5000/health",
            "http://127.1:5000/health", "http://0.0.0.0:5000/health",
            "http://example.com:5000/health", "http://127.0.0.1:80/health",
            "http://127.0.0.1:5000/private", "http://127.0.0.1:5000/health?x=1",
            "http://user:secret@127.0.0.1:5000/health",
            "http://127.0.0.1:5000/health#x",
            "http://127.0.0.1:5000/health/../health",
            "http://127.0.0.1:bad/health",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                probe.validate_url(url)

    def test_bounds_and_schema(self):
        for content in (
            "", "[]", scenario(target="remote"), scenario(durationSeconds=61),
            scenario(durationSeconds=True), scenario(maxRequestsPerSecond=11),
            scenario(maxRequestsPerSecond=0), scenario(trafficProfile="burst"),
            scenario(trafficProfile="distributed-simulated"),
            scenario(extra="no"), scenario(id="../bad"),
        ):
            with self.subTest(content=content), self.assertRaises(ValueError):
                probe.parse_scenario(content)

    def test_loopback_probe_counts_real_http_429(self):
        report = probe.run_probe(scenario(), self.origin + "/api/expensive")
        self.assertEqual(report["status"], "local-tested")
        self.assertEqual(report["responses_by_status"], {"429": 2})
        self.assertEqual(report["requests_attempted"], 2)
        self.assertEqual(report["transport_errors"], 0)
        self.assertGreaterEqual(report["latency_p95_ms"], 0)
        self.assertEqual(len(report["scenario_sha256"]), 64)

    def test_redirect_is_not_followed(self):
        # If the client followed 302 it would attempt an external request.
        report = probe.run_probe(scenario(maxRequestsPerSecond=1), self.origin + "/health")
        self.assertEqual(report["responses_by_status"], {"302": 1})
        self.assertEqual(report["requests_attempted"], 1)

    def test_connection_failure_is_not_success(self):
        # Bind then release a local port, with a small chance of unrelated reuse.
        import socket
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]
        report = probe.run_probe(scenario(maxRequestsPerSecond=1), f"http://127.0.0.1:{port}/health")
        self.assertEqual(report["status"], "incomplete")
        self.assertGreater(report["transport_errors"], 0)

    def test_ipv6_syntax_without_network(self):
        self.assertEqual(probe.validate_url("http://[::1]:5088/health"),
                         "http://[::1]:5088/health")


if __name__ == "__main__":
    unittest.main()
