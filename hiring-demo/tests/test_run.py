"""Static launcher contract tests; never start .NET or mutate a database."""
import importlib.util
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "run.py"
spec = importlib.util.spec_from_file_location("hiring_demo_run", MODULE)
assert spec and spec.loader
demo = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = demo
spec.loader.exec_module(demo)


class LauncherTests(unittest.TestCase):
    def test_bindings_are_loopback_only(self):
        self.assertEqual(demo.API_URL, "http://127.0.0.1:5077")
        self.assertEqual(demo.FRONTEND_URL, "http://127.0.0.1:4173/dashboard/hiring-demo")
        self.assertEqual(demo.api_command()[-2:], ["--urls", demo.API_URL])
        self.assertIn("127.0.0.1", demo.web_command())
        self.assertIn("--strictPort", demo.web_command())

    def test_never_run_without_explicit_demo_db(self):
        with patch.dict(os.environ, {"ConnectionStrings__Jobs": ""}):
            with self.assertRaisesRegex(RuntimeError, "ConnectionStrings__Jobs"):
                demo.check_prerequisites()

    def test_readiness_uses_actual_http_response(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *_): return False

        with patch.object(demo, "urlopen", return_value=Response()) as urlopen:
            self.assertTrue(demo.is_ready())
            self.assertEqual(urlopen.call_args.kwargs["timeout"], 2)
        with patch.object(demo, "urlopen", side_effect=OSError("API down")):
            self.assertFalse(demo.is_ready())

    def test_failed_process_aborts_without_claim_of_success(self):
        class Failed:
            def poll(self): return 12

        with self.assertRaisesRegex(RuntimeError, "exited"):
            demo.wait_ready(Failed(), timeout=1)

    def test_stop_is_idempotent(self):
        class Stopped:
            def poll(self): return 0
        demo.stop(None)
        demo.stop(Stopped())


if __name__ == "__main__":
    unittest.main()
