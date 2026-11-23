# ENS-02 — Anycast simulator

**Priority P0; status TODO.** Implement under this folder: `model.py`, `tests/`, optional deterministic CLI.

A shared virtual IP is advertised by multiple abstract edge sites. Given client-to-site routing scores and capacity/health, select routing outcome. Model actual routing policy as a simplified configurable rule, not geolocation nearest server.

Acceptance: deterministic fixture; site shutdown/withdrawal remaps affected clients; high load may overload a site despite another idle; sticky TCP session can break on remap; tests for tie, no healthy site, uneven load and recovery. Emit `status=simulated`; never announce a real prefix. Document why Anycast does not imply L7 balancing.
