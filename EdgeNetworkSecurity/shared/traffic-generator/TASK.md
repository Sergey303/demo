# ENS-03 — Bounded synthetic HTTP generator

**Priority P0; status TODO.** Write a stdlib/Python or .NET harness here; target only loopback (127.0.0.1 or ::1), with an exact URL allowlist, max 10 RPS and 60 seconds per scenario (see contracts/scenario.schema.json). No redirect following to non-loopback targets.

Acceptance: validate schema-like bounds before network I/O; reject remote host, DNS names even if resolving to loopback, redirects, credentials and excessive concurrency; stop on cancellation. Emit per-status counts, latency distribution, input SHA256, `local-tested` only after real loopback requests. Tests must include SSRF/redirect denial and limits. Default test suite should use an in-process local HTTP server.

TODO: traffic patterns baseline/burst/simulated distributed clients; never run real volumetric DDoS tests.
