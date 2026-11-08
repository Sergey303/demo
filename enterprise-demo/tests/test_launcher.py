"""Static launcher tests; never connect to a database or start child processes."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
from unittest.mock import patch

PATH = Path(__file__).resolve().parents[1] / "run.py"
spec = importlib.util.spec_from_file_location("enterprise_launcher", PATH)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def test_rejects_missing_or_unsafe_database(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "ConnectionStrings__Jobs"):
                launcher.check_environment()
        with patch.dict(os.environ, {"ConnectionStrings__Jobs": "Host=localhost;Database=chatpilot"},
                        clear=True):
            with self.assertRaisesRegex(RuntimeError, "ConnectionStrings__Jobs"):
                launcher.check_environment()

    def test_preflight_requires_exact_db_and_matching_host(self):
        self.assertEqual(launcher.parse_npgsql("Host=host;Database=reliable_jobs_bad").get("database"),
                         "reliable_jobs_bad")
        with patch.dict(os.environ, {
            "ConnectionStrings__Jobs": "Host=127.0.0.1;Database=reliable_jobs_bad",
            "JOBS_TEST_CONNECTION": "host=127.0.0.1 dbname=reliable_jobs",
        }, clear=True):
            with self.assertRaisesRegex(RuntimeError, "ConnectionStrings__Jobs"):
                launcher.check_environment()
        with patch.dict(os.environ, {
            "ConnectionStrings__Jobs": "Host=host-a;Database=reliable_jobs",
            "JOBS_TEST_CONNECTION": "host=host-b dbname=reliable_jobs",
        }, clear=True):
            with self.assertRaisesRegex(RuntimeError, "same PostgreSQL host"):
                launcher.check_environment()

    def test_rejects_missing_secret_before_launch(self):
        with patch.dict(os.environ, {
            "ConnectionStrings__Jobs": "Host=localhost;Database=reliable_jobs",
            "JOBS_TEST_CONNECTION": "host=localhost dbname=reliable_jobs",
            "DEMO_AUTH_SECRET": "short",
        }, clear=True):
            with self.assertRaisesRegex(RuntimeError, "DEMO_AUTH_SECRET"):
                launcher.check_environment()

    @unittest.skipUnless(shutil.which("node"), "Node.js not installed")
    def test_node_identity_is_verified_by_python_boundary(self):
        secret = "local-test-secret-abcdefghijklmnopqrstuvwxyz-123456789"
        script = (
            "import { issueDemoToken } from './enterpriseDemoAuth.mjs';"
            "process.stdout.write(issueDemoToken(process.env.DEMO_AUTH_SECRET));"
        )
        with patch.dict(os.environ, {"DEMO_AUTH_SECRET": secret}):
            token = subprocess.check_output(
                ["node", "--input-type=module", "-e", script],
                cwd=launcher.FRONTEND,
                env=os.environ.copy(), timeout=10,
            ).decode()
            sys.path.insert(0, str(launcher.ROOT / "architecture"))
            from audio_access import verify_token
            self.assertEqual(verify_token(token), ("demo-team", "interviewer"))

    def test_commands_are_scoped_to_existing_components(self):
        cmds = launcher.process_commands()
        self.assertEqual([item[0] for item in cmds], ["API", "Audio worker", "React"])
        self.assertIn("audio_worker.py", " ".join(cmds[1][1]))
        self.assertIn("127.0.0.1", " ".join(cmds[2][1]))
        self.assertEqual(cmds[0][2], launcher.ROOT)


if __name__ == "__main__":
    unittest.main()
