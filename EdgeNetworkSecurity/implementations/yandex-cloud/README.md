# Yandex Cloud implementation (RU)

**Status: scaffold / TODO — no resources deployed.** Third independent implementation alongside Cloudflare and EdgeCenter.

## Components

| Folder | Yandex Cloud service | Responsibility |
|---|---|---|
| [smart-web-security](smart-web-security/README.md) | Smart Web Security | L7 DDoS / bot mitigation; security profile |
| [waf](waf/README.md) | Cloud WAF (Smart Web Security) | Application attack rules |
| [rate-limits](rate-limits/README.md) | Advanced Rate Limiter | Per-window HTTP request limits and 429 |
| [anti-ddos](anti-ddos/README.md) | Yandex DDoS Protection | L3/L4, provider-side |
| [cdn](cdn/README.md) | Cloud CDN | Caching and edge delivery, optional dedicated-IP BGP Anycast / GSLB |
| [terraform](terraform/README.md) | Yandex Cloud Terraform provider | Infrastructure-as-code only after review |

Infrastructure may use an L7 Application Load Balancer, protected domain, or API Gateway according to currently supported SWS integrations.

## Boundaries
- BGP Anycast is a **provider network feature**, not a router or BGP daemon running in this demo. CDN dedicated-IP mode must be enabled and verified before claiming BGP Anycast.
- L3/L4 DDoS protection and L7 protection are distinct. The local test does **not** reproduce provider-wide network mitigation.
- SWS Smart Protection uses ML internally; it is **not** arbitrary Edge AI inference. See [EdgeAI](../../../EdgeAI/README.md).
- Do not send test attacks to third-party infrastructure. Staging only; explicitly approved accounts and domains; no automatic Terraform apply.
- Protect the origin from direct bypass, and configure secret storage, TLS, logging retention, drift and rollback.

## Acceptance TODO
- [ ] Verify current billing, quotas, regions, and service availability on chosen account.
- [ ] Provision least-privilege staging resources and record a reviewed Terraform plan.
- [ ] Connect security profile and safe baseline rules in observe/dry-run where supported.
- [ ] Verify WAF, Smart Protection, ARL 429 behaviour and legitimate-client false positives.
- [ ] Verify provider L3/L4 protection scope separately.
- [ ] Measure CDN cache ratio and latency; check dedicated-IP routing only if activated.
- [ ] Record provider-backed evidence and distinguish it from simulations.

## Official documentation
- https://yandex.cloud/ru/docs/smartwebsecurity/
- https://yandex.cloud/ru/docs/smartwebsecurity/concepts/rules
- https://yandex.cloud/ru/docs/cdn/concepts/dedicated-ip-addressing
- https://yandex.cloud/ru/docs/smartwebsecurity/quickstart
