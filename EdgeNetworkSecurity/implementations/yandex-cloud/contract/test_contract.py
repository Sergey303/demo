import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from validate import load_json, validate

HERE = Path(__file__).resolve().parent


class PolicyContractTest(unittest.TestCase):
    def fixture(self, name="observe"):
        return load_json(HERE / "fixtures" / f"{name}.json")

    def test_observe_and_enforce_fixtures(self):
        for name in ("observe", "enforce"):
            with self.subTest(name=name):
                self.assertEqual(validate(self.fixture(name)), [])

    def test_closed_staging_policy_and_nested_objects(self):
        for field, value in (("environment", "production"), ("schema_version", 2),
                             ("provider_resource", "fixture"), ("logging", {"mode": "full"})):
            with self.subTest(field=field):
                policy = self.fixture()
                policy[field] = value
                self.assertTrue(validate(policy))
        policy = self.fixture()
        policy["origin"]["credential"] = "fixture"
        self.assertIn("additionalProperties", validate(policy))

    def test_origin_is_a_reserved_hostname_and_requires_tls_and_shielding(self):
        for host in ("origin.example", "192.0.2.1", "https://origin.invalid",
                     "a.invalid/path", "a.invalid\n", "_a.invalid"):
            with self.subTest(host=host):
                policy = self.fixture()
                policy["origin"]["hostname"] = host
                self.assertIn("pattern", validate(policy))
        for field in ("tls", "direct_access"):
            with self.subTest(field=field):
                policy = self.fixture()
                del policy["origin"][field]
                self.assertIn("required", validate(policy))

    def test_429_requires_enforcement_and_enforcement_requires_429(self):
        policy = self.fixture()
        policy["rate_limit"]["expected_status"] = 429
        self.assertTrue(validate(policy))
        policy = self.fixture("enforce")
        del policy["rate_limit"]["expected_status"]
        self.assertTrue(validate(policy))
        policy["rate_limit"]["expected_status"] = 403
        self.assertTrue(validate(policy))

    def test_limits_and_rollback_order(self):
        for requests in (True, 0, 10001, "20"):
            with self.subTest(requests=requests):
                policy = self.fixture()
                policy["rate_limit"]["requests"] = requests
                self.assertTrue(validate(policy))
        for revision in (2, 3):
            policy = self.fixture()
            policy["rollback_revision"] = revision
            self.assertTrue(validate(policy))

    def test_cli_exit_codes_and_no_input_echo(self):
        def run(path):
            return subprocess.run(
                [sys.executable, "-B", str(HERE / "validate.py"), str(path)],
                capture_output=True, text=True, check=False,
            )

        self.assertEqual(run(HERE / "fixtures" / "observe.json").returncode, 0)
        with tempfile.TemporaryDirectory(dir=HERE) as directory:
            path = Path(directory) / "malformed.json"
            for raw, code in (
                ('{"schema_version": 1, "schema_version": 2}', 2),
                ('{"revision": NaN}', 2),
                ('{"fixture-sensitive-marker": "fixture-sensitive-marker"}', 1),
            ):
                with self.subTest(raw=raw):
                    path.write_text(raw, encoding="utf-8")
                    result = run(path)
                    self.assertEqual(result.returncode, code)
                    self.assertNotIn("fixture-sensitive-marker", result.stdout + result.stderr)
