# ENS-04 — local ASP.NET Core L7 rate limit demonstration

**Status: implemented / local-tested**, .NET 10 minimal API with framework-provided fixed-window limiter, **no NuGet dependencies**, no external provider.

## Run (two local terminals)

```bash
dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
# Separately:
python3 EdgeNetworkSecurity/shared/traffic-generator/probe.py \
  --scenario EdgeNetworkSecurity/shared/traffic-generator/example-429.json \
  --url http://127.0.0.1:5088/api/expensive
```

Kestrel is hard-bound to `127.0.0.1`, port 5088 by default. `ASPNETCORE_URLS` cannot expose it publicly. A configured `LOCAL_EDGE_PORT` must be between 1024 and 65535.

## Endpoints and limits

| Route | Behavior |
| --- | --- |
| `GET /health` | 200 and loopback-only readiness, independent from the limiter |
| `GET /api/expensive` | Default **4 requests / 2 seconds**, fixed-window, no queue; 429 when exceeded |
| `GET /api/expensive?holdMs=450` | Bounded simulated work, max 500ms |
| `GET /metrics` | Four process-local counters without user/IP/path labels |

`LOCAL_EDGE_PERMITS` (1..100), `LOCAL_EDGE_WINDOW_SECONDS` (1..60), `LOCAL_EDGE_CONCURRENCY` (1..32) are bounded startup settings. Independently from 429, a `SemaphoreSlim` guards *at most 2 concurrent expensive operations* by default; saturation returns **503**, without queueing. `Retry-After` is set for rate rejection **only when .NET supplies a valid estimate**.

Do **not** read `X-Forwarded-For` as a trusted client identity; the limiter is per single process, not by request IP. The `/metrics` snapshot is demo-only and does not contain tokens, IPs, user IDs or unbounded dynamic labels.

## Reproduce

```bash
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

Integration tests build and start the real API on a randomly assigned loopback port and check actual HTTP 429, recovery, X-Forwarded-For spoofing, concurrency 503, health and invalid payloads. The real generator-to-API roundtrip is also tested. Requires .NET 10 SDK and Python 3.12+.

**Not covered:** L3/L4 DDoS, distributed rate limiting, reverse-proxy trust configuration, CDN, external WAF, Anycast, Redis, costs or production authentication. Never run volumetric traffic against third-party infrastructure. See [TASK.md](TASK.md) for remaining Codex work.
