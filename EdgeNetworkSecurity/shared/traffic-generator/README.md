# ENS-03 — bounded loopback-only HTTP probe

**Status: implemented / locally tested.** Python standard library, strict URL allowlist and hard limits. This is an educational request probe, **not** a DDoS generator.

```bash
python3 EdgeNetworkSecurity/shared/traffic-generator/probe.py \
  --scenario EdgeNetworkSecurity/shared/traffic-generator/example-429.json \
  --url http://127.0.0.1:5088/api/expensive

python3 -B -m unittest discover -s EdgeNetworkSecurity/shared/traffic-generator/tests -v
```

The probe accepts only `http://127.0.0.1:PORT/health`, `http://127.0.0.1:PORT/api/expensive` and corresponding literal `[::1]` URLs, with ports 1024..65535. DNS names, HTTPS, credentials, query strings, fragments and other paths are rejected; HTTP proxies are disabled; **HTTP 3xx is never followed**. Duration max 60 s, rate max 10 RPS, at most 600 attempts, serial GETs with a monotonically spaced schedule. No per-IP impersonation. A cancelled run returns an interrupted status.

The JSON report includes counts by actual HTTP status, transport errors, p50/p95 request latency and SHA256 of the scenario. `status=local-tested` requires responses and no transport errors; unreachable origin is `incomplete`. Header/body content and user data are never recorded. Only the `baseline` traffic profile is implemented; `burst` and `distributed-simulated` are TODO and currently rejected.

## TODO

Integration with metrics exporter, capped concurrent synthetic clients, automatic comparison against rule-only baseline, more failure tests and measurement of latency distribution under load. Any new workload must remain on loopback and obey the same hard ceilings.
