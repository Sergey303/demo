"""Bounded, deterministic toy BGP best-path selection (not a BGP stack)."""
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class Route:
    prefix: str
    next_hop: str
    as_path: tuple[int, ...]
    local_pref: int = 100

    def __post_init__(self):
        if not self.prefix or not self.next_hop:
            raise ValueError("prefix and next_hop are required")
        if not 1 <= len(self.as_path) <= 32:
            raise ValueError("AS path length must be between 1 and 32")
        if any(type(n) is not int or n < 1 or n > 4294967295 for n in self.as_path):
            raise ValueError("invalid ASN")
        if len(set(self.as_path)) != len(self.as_path):
            raise ValueError("AS loop")
        if type(self.local_pref) is not int or not 0 <= self.local_pref <= 2**31 - 1:
            raise ValueError("invalid local preference")


def best_route(routes: Iterable[Route], prefix: str) -> Route | None:
    """Higher local preference, shorter AS_PATH, then stable next_hop/AS_PATH."""
    eligible = [r for r in routes if r.prefix == prefix]
    return min(eligible, key=lambda r: (-r.local_pref, len(r.as_path), r.next_hop, r.as_path), default=None)


class RouteTable:
    def __init__(self):
        self._routes: dict[tuple[str, str], Route] = {}

    def announce(self, route: Route):
        if len(self._routes) >= 10000 and (route.prefix, route.next_hop) not in self._routes:
            raise ValueError("route table full")
        self._routes[(route.prefix, route.next_hop)] = route

    def withdraw(self, prefix: str, next_hop: str):
        self._routes.pop((prefix, next_hop), None)

    def select(self, prefix: str) -> Route | None:
        return best_route(self._routes.values(), prefix)
