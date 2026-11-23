# BGP and Anycast offline simulator labs

The first two local labs are now executable:
- [BGP best-path selection](bgp/README.md) — stable tie-break, announcement/withdrawal, no-route state.
- [Anycast routing](anycast/README.md) — network-cost selection, edge overload, failover and broken sessions.
- [Failures](failures/README.md) — further TODO: control-plane delay, origin outage, stale policy and recovery.

These are mathematical/synthetic abstractions, **not** a BGP implementation, provider-backed Anycast service or L3/L4 protection. All generated reports are marked `status=simulated`. They use Python standard library, run without cloud credentials and make no network requests.
