# Cloudflare — Edge Network Security

**Local-tested:** the [request guard Worker](workers/request-guard/README.md)
implements a fixed health probe, request IDs, a deadline and bounded error
mapping. Its Node tests exercise the handler using an injected fetch function.

**Provider-configured / provider-verified:** unavailable. The Cloudflare runtime,
zone routes, origin protection, [WAF](waf/README.md) and [rate
limits](rate-limits/README.md) still require staging evidence. Managed Anycast and
network DDoS protection are separate provider capabilities. Available actions,
entitlements, pricing and the appropriate [Terraform](terraform/README.md)
configuration are unknown for the intended account. [Ruleset Engine phases](https://developers.cloudflare.com/ruleset-engine/reference/phases-list/).

See [TASK.md](TASK.md) for remaining acceptance criteria.
