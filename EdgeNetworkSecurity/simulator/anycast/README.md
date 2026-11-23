# ENS-02 — deterministic Anycast *simulation*

**Implemented and locally unit-tested:** `model.py` distributes synthetic client demand among virtual edge sites based on per-client route cost; `replay.py` runs controlled site outage/recovery scenarios. Capacity is telemetry, **not a load-balancing input**, so a routing preference can overload one edge while another has spare capacity.

```bash
python3 EdgeNetworkSecurity/simulator/anycast/replay.py EdgeNetworkSecurity/simulator/anycast/two-sites-failover.json
python3 -m unittest discover -s EdgeNetworkSecurity/simulator/anycast/tests -v
```

The four-stage fixture illustrates overload, failover, recovery, total outage and disrupted long-lived sessions. Route costs are **synthetic policy preferences** and do not imply geographical proximity. The simulator never announces a real IP prefix or measures any Cloudflare/Yandex/EdgeCenter deployment.

[Next Codex tasks](TASK.md): model ECMP, nonuniform route changes, session pinning, variable capacity, real BGP policy and convergence (as explicitly separate abstractions).
