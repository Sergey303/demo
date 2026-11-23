# ENS-01 — BGP route selection simulator

**Priority P0; status PARTIAL — model.py exists, CLI and dedicated tests TODO.** Implement here: `model.py`, `tests/test_model.py`; no network sockets or routing daemon.

Input: declarative toy AS graph, prefixes, candidate paths, AS path length, local preference, withdrawal events. Output: stable deterministic selected path and clear no-route state.

Acceptance:
- local-preference dominates AS_PATH length; tie-break deterministic and documented (no claim to emulate all BGP policy).
- withdrawal removes path; route recomputed without restarting process.
- reject loops, malformed ASNs/paths and negative metrics.
- tests include unequal local-pref, AS_PATH tie, total withdrawal, route restoration, two origins.
- CLI can replay a local JSON scenario; JSON evidence includes `status: simulated`.
- no outbound network; input bounds to avoid resource exhaustion.

TODO later: MED, communities, route reflector, convergence and flap-damping simulation. Never claim real BGP convergence metrics.
