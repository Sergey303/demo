# ENS-03 — Bounded synthetic HTTP generator

**Priority P0; status PARTIAL — `probe.py`, strict loopback allowlist, capped baseline profile, real response accounting and unit tests implemented.** See [README.md](README.md). `burst` and `distributed-simulated` profiles remain TODO; external destinations stay forbidden.

Acceptance: validate schema-like bounds before network I/O; reject remote host, DNS names even if resolving to loopback, redirects, credentials and excessive concurrency; stop on cancellation. Emit per-status counts, latency distribution, input SHA256, `local-tested` only after real loopback requests. Tests must include SSRF/redirect denial and limits. Default test suite should use an in-process local HTTP server.

Implemented: baseline, monotonic spacing and localhost redirect/SSRF rejection. TODO: bounded burst and multi-client simulations (never spoof IPs), cancellation/partial evidence on SIGTERM, richer latency/throughput plots. Never run real volumetric DDoS tests.
