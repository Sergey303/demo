"""Run the fixed offline EIS fixture suite and emit one JSON evidence document."""
import argparse
import json
from math import isfinite
from pathlib import Path
import re
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TIMEOUT_SECONDS = 5
MAX_OUTPUT = 64 * 1024
STAGES = {
    "bgp": ("EdgeNetworkSecurity/simulator/bgp", "replay", "withdraw-recovery.json"),
    "anycast": ("EdgeNetworkSecurity/simulator/anycast", "replay", "two-sites-failover.json"),
    "anomaly": ("EdgeAI/scenarios/traffic-anomaly-detection", "evaluate", "fixtures.jsonl"),
    "policy": ("EdgeIntegratedScenarios/ai-assisted-ddos-defense", "replay", "fixtures.jsonl"),
}
CONFUSION = "tp tn fp fn"
COUNTERS = {
    "bgp": "steps no_route_steps",
    "anycast": "stages overload_events unassigned_client_events interrupted_session_events",
    "anomaly": "records " + CONFUSION,
    "policy": ("records new_observations model_fallbacks hard_blocked_benign "
               + " ".join(f"{mode}_{key}" for mode in ("rule_only", "assisted")
                          for key in CONFUSION.split())),
}
CASES = {
    "bgp": "no_route_steps recovered_steps",
    "anycast": "overloaded_stages unassigned_stages interrupted_stages",
    "anomaly": "",
    "policy": "fallback_ids advisory_ids",
}
IDENTIFIER = re.compile(r"[a-z0-9_-]{1,64}")
PROVIDERS = {
    "Cloudflare": "Verify Worker/API capabilities, zone entitlements and approved staging.",
    "Yandex Cloud": "Verify SWS/CDN and inference entitlements, test domain and approved staging.",
    "EdgeCenter": "Verify available CDN/WAF/anti-DDoS APIs, service plan and approved staging.",
}


def strict_json(data):
    def object_from_pairs(pairs):
        result = dict(pairs)
        if len(result) != len(pairs):
            raise ValueError("duplicate JSON field")
        return result

    def invalid_constant(_):
        raise ValueError("nonfinite JSON constant")

    def finite_float(token):
        number = float(token)
        if not isfinite(number):
            invalid_constant(token)
        return number

    return json.loads(data, object_pairs_hook=object_from_pairs,
                      parse_constant=invalid_constant, parse_float=finite_float)


def check_fields(value, fields):
    if type(value) is not dict or value.keys() != set(fields.split()):
        raise ValueError("unexpected evidence fields")


def validate(stage, result):
    check_fields(result, "source_status dataset_sha256 counters failure_cases")
    if result["source_status"] != "simulated":
        raise ValueError("invalid source status")
    digest = result["dataset_sha256"]
    if type(digest) is not str or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("invalid fixture hash")
    counters, cases = result["counters"], result["failure_cases"]
    check_fields(counters, COUNTERS[stage])
    check_fields(cases, CASES[stage])
    if any(type(n) is not int or not 0 <= n <= 32000 for n in counters.values()):
        raise ValueError("invalid counter")
    for entries in cases.values():
        if (type(entries) is not list or len(entries) > 1000
                or any(not (type(item) is int and 0 <= item < counters["steps"]
                            if stage == "bgp" else
                            type(item) is str and IDENTIFIER.fullmatch(item))
                       for item in entries)
                or len(set(entries)) != len(entries)):
            raise ValueError("invalid failure cases")
    if stage == "bgp" and counters["no_route_steps"] != len(cases["no_route_steps"]):
        raise ValueError("inconsistent route count")
    if stage == "anomaly" and sum(counters[k] for k in CONFUSION.split()) != counters["records"]:
        raise ValueError("inconsistent anomaly count")
    if stage == "policy":
        for mode in ("rule_only", "assisted"):
            if sum(counters[f"{mode}_{k}"] for k in CONFUSION.split()) != counters["records"]:
                raise ValueError("inconsistent policy count")
        if (len(cases["fallback_ids"]) != counters["model_fallbacks"]
                or len(cases["advisory_ids"]) != counters["new_observations"]):
            raise ValueError("inconsistent policy cases")


def run_stage(stage):
    directory, module, fixture = STAGES[stage]
    source = {"entrypoint": f"{directory}/{module}.py", "fixture": f"{directory}/{fixture}"}
    command = [sys.executable, "-I", "-B", "-S", str(HERE / "scenario_worker.py"), stage]
    # Use a file so pipe buffering cannot consume unbounded parent memory.
    try:
        with tempfile.TemporaryFile(dir=HERE) as output:
            process = subprocess.run(command, cwd=HERE, env={}, stdin=subprocess.DEVNULL,
                                     stdout=output, stderr=subprocess.DEVNULL,
                                     timeout=TIMEOUT_SECONDS, check=False)
            if process.returncode:
                return {**source, "source_status": "error",
                        "error": "worker_failed", "exit_code": process.returncode}
            output.seek(0)
            data = output.read(MAX_OUTPUT + 1)
        if len(data) > MAX_OUTPUT:
            raise ValueError("evidence too large")
        report = strict_json(data.decode("utf-8"))
        validate(stage, report)
        return {**source, **report}
    except subprocess.TimeoutExpired:
        error = "timeout"
    except OSError:
        error = "worker_io"
    except (ValueError, RecursionError):
        error = "invalid_evidence"
    return {**source, "source_status": "error", "error": error}


def run():
    stages = {stage: run_stage(stage) for stage in STAGES}
    return {
        "schema_version": 1,
        "scenario": "offline-edge-fixtures",
        "status": "ok" if all(row["source_status"] == "simulated" for row in stages.values()) else "failed",
        "stage_timeout_seconds": TIMEOUT_SECONDS,
        "stages": stages,
        "providers": {name: {"source_status": "blocked", "prerequisite": reason}
                      for name, reason in PROVIDERS.items()},
    }


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    evidence = run()
    print(json.dumps(evidence, indent=2, allow_nan=False))
    return int(evidence["status"] != "ok")


if __name__ == "__main__":
    sys.exit(main())
