"""Internal adapter for the existing synthetic fixture entry points."""
from hashlib import sha256
from importlib import import_module
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run import ROOT, STAGES, strict_json, validate


def deny_external_io(event, _args):
    if event.startswith(("socket.", "subprocess.", "os.exec", "os.spawn", "os.fork", "os.posix_spawn")) or event == "os.system":
        raise PermissionError("fixture worker cannot open sockets or launch processes")


def bgp_summary(report):
    steps = report["steps"]
    outages = [step["step"] for step in steps if step["selected"] is None]
    recovered = [step["step"] for previous, step in zip(steps, steps[1:])
                 if previous["selected"] is None and step["selected"] is not None]
    return {"steps": len(steps), "no_route_steps": len(outages)}, {
        "no_route_steps": outages, "recovered_steps": recovered,
    }


def anycast_summary(report):
    stages = report["stages"]
    counters = {"stages": len(stages)}
    cases = {}
    for counter, case, field in (
        ("overload_events", "overloaded_stages", "overloaded_sites"),
        ("unassigned_client_events", "unassigned_stages", "unassigned_clients"),
        ("interrupted_session_events", "interrupted_stages", "interrupted_sessions"),
    ):
        counters[counter] = sum(len(stage[field]) for stage in stages)
        cases[case] = [stage["stage_id"] for stage in stages if stage[field]]
    return counters, cases


def anomaly_summary(report):
    return {"records": report["records"], **report["counts"]}, {}


def policy_summary(report):
    counters = {key: report[key] for key in
                ("records", "new_observations", "model_fallbacks", "hard_blocked_benign")}
    for mode in ("rule_only", "assisted"):
        counters.update({f"{mode}_{key}": n for key, n in report[mode]["confusion"].items()})
    cases = {"fallback_ids": [], "advisory_ids": []}
    for row in report["audit"]:
        before, after = row["rule_action"], row["assisted_action"]
        if ((after == "block") != (before == "block")
                or (row["source"] == "rule-fallback" and before != after)):
            raise ValueError("policy invariant violated")
        if row["source"] == "rule-fallback":
            cases["fallback_ids"].append(row["synthetic_id"])
        if before == "allow" and after == "observe":
            cases["advisory_ids"].append(row["synthetic_id"])
    return counters, cases


SUMMARIES = {"bgp": bgp_summary, "anycast": anycast_summary,
             "anomaly": anomaly_summary, "policy": policy_summary}


def evaluate(stage):
    directory, module, fixture = STAGES[stage]
    path = ROOT / directory
    sys.path.insert(0, str(path))
    source = import_module(module)
    with (path / fixture).open("rb") as file:
        data = file.read(source.MAX_BYTES + 1)
    if len(data) > source.MAX_BYTES:
        raise ValueError("fixture too large")
    text = data.decode("utf-8")
    if fixture.endswith(".jsonl"):
        for line in text.splitlines():
            strict_json(line)
        report = source.evaluate_text(text)
    else:
        strict_json(text)
        report = source.replay_text(text)
    if report["status"] != "simulated" or report["dataset_sha256"] != sha256(data).hexdigest():
        raise ValueError("invalid source provenance")
    counters, cases = SUMMARIES[stage](report)
    result = {"source_status": "simulated", "dataset_sha256": report["dataset_sha256"],
              "counters": counters, "failure_cases": cases}
    validate(stage, result)
    return result


if __name__ == "__main__":
    sys.addaudithook(deny_external_io)
    print(json.dumps(evaluate(sys.argv[1]), allow_nan=False))
