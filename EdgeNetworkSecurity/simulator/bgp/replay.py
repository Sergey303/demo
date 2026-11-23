"""Offline toy BGP replay CLI. Does not announce routes or open sockets."""
from __future__ import annotations

import argparse
from hashlib import sha256
import ipaddress
import json
from pathlib import Path
import re
from model import Route, RouteTable

MAX_BYTES = 100_000
MAX_EVENTS = 1000
ID = re.compile(r"^[a-z0-9_-]{1,64}$")


def replay_text(text: str) -> dict:
    if len(text.encode("utf-8")) > MAX_BYTES:
        raise ValueError("scenario too large")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError("invalid JSON") from e
    if not isinstance(data, dict) or set(data) != {"id", "prefix", "events"}:
        raise ValueError("expected id, prefix, events")
    if not isinstance(data["id"], str) or not ID.fullmatch(data["id"]):
        raise ValueError("invalid scenario ID")
    prefix = data["prefix"]
    if not isinstance(prefix, str):
        raise ValueError("prefix must be CIDR string")
    try:
        network = ipaddress.ip_network(prefix, strict=True)
    except ValueError as e:
        raise ValueError("invalid CIDR network prefix") from e
    if prefix != str(network):
        raise ValueError("non-canonical prefix")
    events = data["events"]
    if not isinstance(events, list) or not 1 <= len(events) <= MAX_EVENTS:
        raise ValueError("events must be 1..1000 entries")
    table = RouteTable()
    output = []
    for idx, event in enumerate(events):
        if not isinstance(event, dict) or event.get("type") not in ("announce", "withdraw"):
            raise ValueError(f"invalid event {idx}")
        event_type = event["type"]
        expected_keys = ({"type", "next_hop", "as_path", "local_pref"} if event_type == "announce"
                         else {"type", "next_hop"})
        if set(event) != expected_keys:
            raise ValueError(f"invalid event fields at {idx}")
        hop = event["next_hop"]
        if not isinstance(hop, str) or not ID.fullmatch(hop):
            raise ValueError(f"invalid next hop at {idx}")
        if event_type == "announce":
            path = event["as_path"]
            if not isinstance(path, list):
                raise ValueError(f"AS path must be a list at {idx}")
            route = Route(prefix, hop, tuple(path), event["local_pref"])
            table.announce(route)
        else:
            table.withdraw(prefix, hop)
        selected = table.select(prefix)
        output.append({
            "step": idx,
            "event": event_type,
            "selected": None if selected is None else {
                "next_hop": selected.next_hop,
                "local_pref": selected.local_pref,
                "as_path": list(selected.as_path),
            },
        })
    return {
        "scenario_id": data["id"],
        "prefix": prefix,
        "status": "simulated",
        "dataset_sha256": sha256(text.encode("utf-8")).hexdigest(),
        "steps": output,
        "limits": "toy local-preference/AS_PATH best-path model; no BGP sessions, MED, or convergence timing",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Deterministic toy BGP route replay (offline)")
    parser.add_argument("scenario", type=Path, help="local JSON scenario")
    args = parser.parse_args()
    try:
        if args.scenario.stat().st_size > MAX_BYTES:
            raise ValueError("scenario too large")
        report = replay_text(args.scenario.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as e:
        parser.error(str(e))
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
