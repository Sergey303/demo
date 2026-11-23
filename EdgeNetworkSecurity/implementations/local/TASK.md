# ENS-04 — Local ASP.NET Core L7 protection

**Priority P0; status TODO.** Implementation path: this folder (e.g. `src/LocalEdgeApi/`, `tests/`, compose after direct host tests).

Deliver a minimal .NET 8+ HTTP API /health and /api/expensive with rate limiting, 429 + Retry-After when valid, hard concurrency budget, graceful overload, structured sanitized metrics. Redis-backed shared limit is a second phase; explicitly mark single-node baseline.

Acceptance: no externally reachable default listener; no untrusted X-Forwarded-For without known proxy; real HTTP integration test demonstrates burst rejection, recovery and isolation; no PII in labels; README includes run/check commands and boundaries. DO NOT describe this as network L3/L4 DDoS protection.

TODO: per-route sliding-window/token bucket comparison, Redis failover policy, reverse-proxy config, Docker compose and metrics.
