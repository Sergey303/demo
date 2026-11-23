# ENS-04 — Local ASP.NET Core L7 protection

**Priority P0; status PARTIAL — real API, 429 and 503, recovery and HTTP integration tests implemented.** Code: `src/LocalEdgeApi/Program.cs`; tests: `tests/test_local_edge_api.py`. Run commands in [README.md](README.md). Compose, Redis and proxy integration remain TODO.

Deliver a minimal .NET 8+ HTTP API /health and /api/expensive with rate limiting, 429 + Retry-After when valid, hard concurrency budget, graceful overload, structured sanitized metrics. Redis-backed shared limit is a second phase; explicitly mark single-node baseline.

Acceptance: no externally reachable default listener; no untrusted X-Forwarded-For without known proxy; real HTTP integration test demonstrates burst rejection, recovery and isolation; no PII in labels; README includes run/check commands and boundaries. DO NOT describe this as network L3/L4 DDoS protection.

Implemented: fixed-window single-node limiter, bounded concurrency, sanitized JSON metric counters. TODO: sliding-window/token-bucket comparison, Redis shared limits/failure policy, trusted reverse-proxy config, Docker Compose, metrics endpoint in OpenTelemetry/Prometheus, controlled fault injection.
