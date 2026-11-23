# ENS-01 — BGP route selection simulator

**Priority P0; core DONE (local simulation) — `model.py`, `replay.py`, `withdraw-recovery.json`, `tests/test_replay.py`.** No network sockets or routing daemon. Run `python3 -m unittest discover -s EdgeNetworkSecurity/simulator/bgp/tests -v`.

Implemented input: single canonical CIDR prefix with announce/withdraw events, candidate AS paths and local preference. Output: stable deterministic selected path and explicit no-route state. **TODO**: general AS graph/transit topology and multi-prefix scenarios.

Acceptance:
- local-preference dominates AS_PATH length; tie-break deterministic and documented (no claim to emulate all BGP policy).
- withdrawal removes path; route recomputed without restarting process.
- reject loops, malformed ASNs/paths and negative metrics.
- tests include unequal local-pref, AS_PATH tie, total withdrawal, route restoration, two origins.
- CLI can replay a local JSON scenario; JSON evidence includes `status: simulated`.
- no outbound network; input bounds to avoid resource exhaustion.

TODO later: MED, communities, route reflector, convergence and flap-damping simulation. Never claim real BGP convergence metrics.
