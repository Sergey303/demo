"""Offline Anycast outage scenario replay CLI (no sockets/BGP)."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
from model import Client, Site, SAFE_ID, route

MAX_BYTES = 100_000
MAX_STAGES = 32


def replay_text(text: str) -> dict:
    if len(text.encode("utf-8")) > MAX_BYTES:
        raise ValueError("scenario too large")
    try:
        config = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("invalid JSON") from exc
    if not isinstance(config, dict) or set(config) != {"id", "sites", "clients", "stages"}:
        raise ValueError("expected id, sites, clients and stages")
    if not isinstance(config["id"], str) or not SAFE_ID.fullmatch(config["id"]):
        raise ValueError("invalid scenario id")
    if not isinstance(config["sites"], list) or not isinstance(config["clients"], list):
        raise ValueError("sites and clients must be arrays")
    sites, clients = [], []
    for data in config["sites"]:
        if not isinstance(data, dict) or set(data) != {"id", "capacity_rps", "healthy"}:
            raise ValueError("invalid site fields")
        sites.append(Site(**data))
    for data in config["clients"]:
        if not isinstance(data, dict) or set(data) != {"id", "demand_rps", "costs"}:
            raise ValueError("invalid client fields")
        clients.append(Client(**data))
    stages = config["stages"]
    if not isinstance(stages, list) or not 1 <= len(stages) <= MAX_STAGES:
        raise ValueError("stages must have 1..32 entries")
    past = None
    output = []
    seen = set()
    for stage in stages:
        if not isinstance(stage, dict) or set(stage) != {"id", "disabled"}:
            raise ValueError("invalid stage fields")
        if not isinstance(stage["id"], str) or not SAFE_ID.fullmatch(stage["id"]) or stage["id"] in seen:
            raise ValueError("invalid/duplicate stage id")
        seen.add(stage["id"])
        disabled = stage["disabled"]
        if not isinstance(disabled, list) or any(not isinstance(name, str) for name in disabled):
            raise ValueError("invalid disabled sites")
        if len(set(disabled)) != len(disabled):
            raise ValueError("duplicate disabled site")
        result = route(sites, clients, set(disabled), past)
        output.append({"stage_id": stage["id"], **result})
        past = result["assignments"]
    return {
        "status": "simulated",
        "scenario_id": config["id"],
        "dataset_sha256": sha256(text.encode("utf-8")).hexdigest(),
        "stages": output,
        "model_scope": "static client-to-site cost; capacity is telemetry, not balancing",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay local synthetic Anycast site outages")
    parser.add_argument("scenario", type=Path)
    args = parser.parse_args()
    try:
        if args.scenario.stat().st_size > MAX_BYTES:
            raise ValueError("scenario too large")
        result = replay_text(args.scenario.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError, TypeError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
