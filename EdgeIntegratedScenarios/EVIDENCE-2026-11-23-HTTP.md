# Local HTTP acceptance — ENS-03 / ENS-04

**Date:** 2026-11-23. **Scope:** Sergey303/demo, isolated worktree, no cloud account/real DDoS tests.

## Implemented

- `EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/`: ASP.NET Core / .NET 10 API, fixed-window limiter on `/api/expensive`, **real HTTP 429** and optional valid `Retry-After`, concurrency overload **503**, `/health`, no-PII `/metrics`.
- Kestrel binds only `127.0.0.1`. The test deliberately sets `ASPNETCORE_URLS=http://0.0.0.0:1` while configuring another loopback port and verifies the latter responds; it does not independently probe all network interfaces. No client-supplied forwarded header is used to reset quota.
- `EdgeNetworkSecurity/shared/traffic-generator/probe.py`: stdlib single-client baseline HTTP probe, 127.0.0.1/::1 literal only, no redirects, proxies or DNS names, at most 10 RPS, 60 seconds and 600 attempts; actual response counters, SHA256 and measured p50/p95.

## Commands and observed acceptance

From repository root, with .NET 10 SDK and Python 3.12:

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/shared/traffic-generator/tests -v
```

**Local observation:** build succeeded with 0 warnings/0 errors. All **4 HTTP integration tests passed**, along with all **6 generator tests**.

The HTTP suite starts a real ASP.NET Core process on a disposable loopback port and verifies: 4 allowed requests then 429, recovery after 2 seconds, spoofed X-Forwarded-For cannot bypass the quota, saturation returns 503, invalid holdMs returns 400, health remains responsive, metrics counters agree, and **the bounded generator produces both 200 and 429 from the actual API**.

The generator tests use only an in-process local Python HTTP server, verify redirect is not followed, invalid external URLs/credentials/DNS are rejected, and connection failure is not reported as verified.

**Manual demonstration (opt-in, same local machine):**
```bash
dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
# separate shell
python3 EdgeNetworkSecurity/shared/traffic-generator/probe.py \
  --scenario EdgeNetworkSecurity/shared/traffic-generator/example-429.json \
  --url http://127.0.0.1:5088/api/expensive
```

## Important non-claims

This is an intentionally **single-process L7 teaching demo**, not a public internet anti-DDoS service, not distributed enforcement, not a real BGP/Anycast router, not a Cloudflare/EdgeCenter/Yandex configuration, and not production-ready. Probe p95 on this synthetic localhost fixture cannot predict internet latency. Provider verification and security/price claims are not inferred from these tests.

**Next Codex tasks:** Redis shared quotas and fail-closed/degraded behavior; trusted reverse-proxy boundary; additional load profiles with strict limits; observability exporters and fault handling.
