# ENS-01 — deterministic BGP best-path *simulation*

**Implemented and locally unit-tested:** `model.py` stores alternative routes, ranks by local preference (high wins), then AS_PATH length (short wins), then deterministic next-hop tie-break. `replay.py` reads a bounded, local JSON fixture, applies announcements/withdrawals, and emits a structured **`status: simulated`** record.

```bash
python3 EdgeNetworkSecurity/simulator/bgp/replay.py EdgeNetworkSecurity/simulator/bgp/withdraw-recovery.json
python3 -m unittest discover -s EdgeNetworkSecurity/simulator/bgp/tests -v
```

A demonstration prefix (`203.0.113.0/24`) comes from the TEST-NET-3 documentation range. No packets are sent; no BGP daemon, sockets or real AS policy are involved. The simplified model rejects repeated ASNs, even though real-world AS prepending may intentionally repeat ASNs. There is no MED, BGP community, route reflector, multipath or convergence-time model.

[Next Codex tasks](TASK.md): AS graph and transit constraints, MED/communities, reconvergence and path-flap modelling with documented assumptions.
