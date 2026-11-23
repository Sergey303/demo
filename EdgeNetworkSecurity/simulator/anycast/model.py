"""Deterministic Anycast routing toy model, not geo-routing or L7 load balancing."""
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Mapping, Sequence

SAFE_ID = re.compile(r"^[a-z0-9_-]{1,64}$")


def _id(value: str) -> bool:
    return isinstance(value, str) and SAFE_ID.fullmatch(value) is not None


@dataclass(frozen=True)
class Site:
    id: str
    capacity_rps: int
    healthy: bool = True

    def __post_init__(self):
        if not _id(self.id):
            raise ValueError("invalid site id")
        if type(self.capacity_rps) is not int or not 1 <= self.capacity_rps <= 10**7:
            raise ValueError("invalid site capacity")
        if type(self.healthy) is not bool:
            raise ValueError("site healthy must be boolean")


@dataclass(frozen=True)
class Client:
    id: str
    demand_rps: int
    costs: Mapping[str, int]

    def __post_init__(self):
        if not _id(self.id):
            raise ValueError("invalid client id")
        if type(self.demand_rps) is not int or not 0 <= self.demand_rps <= 10**7:
            raise ValueError("invalid client demand")
        if not isinstance(self.costs, dict) or not 1 <= len(self.costs) <= 50:
            raise ValueError("client must have 1..50 route costs")
        if any(not _id(s) or type(cost) is not int or not 0 <= cost <= 10**6
               for s, cost in self.costs.items()):
            raise ValueError("invalid route costs")


def route(
    sites: Sequence[Site],
    clients: Sequence[Client],
    disabled: set[str] | None = None,
    previous: Mapping[str, str | None] | None = None,
) -> dict:
    """Lowest routing cost wins; capacity is *observed*, not used to balance routes."""
    if not 1 <= len(sites) <= 50 or not 1 <= len(clients) <= 500:
        raise ValueError("1..50 sites and 1..500 clients required")
    site_by_id = {s.id: s for s in sites}
    client_by_id = {c.id: c for c in clients}
    if len(site_by_id) != len(sites) or len(client_by_id) != len(clients):
        raise ValueError("duplicate IDs")
    disabled = set() if disabled is None else disabled
    if not isinstance(disabled, set) or not disabled <= site_by_id.keys():
        raise ValueError("invalid disabled sites")
    if previous is not None and any(key not in client_by_id or (value is not None and value not in site_by_id)
                                    for key, value in previous.items()):
        raise ValueError("invalid session mapping")

    load = {name: 0 for name in sorted(site_by_id)}
    assignments: dict[str, str | None] = {}
    for client in sorted(clients, key=lambda x: x.id):
        if not set(client.costs) <= set(site_by_id):
            raise ValueError("unknown site in route cost map")
        candidates = sorted(
            (cost, name) for name, cost in client.costs.items()
            if site_by_id[name].healthy and name not in disabled
        )
        destination = candidates[0][1] if candidates else None
        assignments[client.id] = destination
        if destination is not None:
            load[destination] += client.demand_rps

    interrupted = [] if previous is None else sorted(
        client for client, destination in assignments.items()
        if client in previous and previous[client] != destination
    )
    unassigned = sorted(k for k, v in assignments.items() if v is None)
    site_summary = {
        name: {
            "load_rps": load[name],
            "capacity_rps": site.capacity_rps,
            "healthy": site.healthy and name not in disabled,
            "overloaded": load[name] > site.capacity_rps,
        }
        for name, site in sorted(site_by_id.items())
    }
    return {
        "status": "simulated",
        "assignments": assignments,
        "site_load": site_summary,
        "overloaded_sites": sorted(name for name, s in site_summary.items() if s["overloaded"]),
        "unassigned_clients": unassigned,
        "interrupted_sessions": interrupted,
        "note": "routing cost is a synthetic BGP-policy proxy; not physical nearest or TCP-state migration",
    }
