# EdgeЦентр — Edge Network Security

**Local-tested:** the [offline staging policy contract](contract/README.md)
validates CDN, WAF, rate limit, origin protection, logging and rollback intent.

**Provider-configured / provider-verified:** unavailable. The matrix describes
public documentation and open questions for the intended account.

| Area | Public documentation | Account or deployment evidence still needed |
| --- | --- | --- |
| [CDN](cdn/README.md) | Cache controls and diagnostic headers are documented. [CDN cache guide](https://edgecenter.ru/knowledge-base/cdn/set-up-cdn-caching) | Cache-key behavior, origin TLS, purge, access controls and region coverage |
| [WAF](waf/README.md) | CDN basic WAF is documented separately from paid application protection. [Basic WAF](https://edgecenter.ru/knowledge-base/cdn/basic-waf) | Observe mode, exclusions, logs and exact rule support are unknown |
| HTTP rate limits | Capability unknown for this target product and plan | Confirm quota keys, observation capability and whether enforcement emits 429 |
| [DNS](dns/README.md) | Provider advertises DNS Anycast and documents DNS zone management. [DNS product](https://edgecenter.ru/dns), [DNS documentation](https://edgecenter.ru/knowledge-base/dns/getting-started) | HTTP/CDN Anycast and actual DNS routing are unverified |
| [Anti-DDoS](anti-ddos/README.md) | DDoS protection is offered in hosting. [Hosting protection](https://edgecenter.ru/hosting/ddos-protection) | L3/L4 versus L7 scope, enablement, coverage and telemetry for the intended plan are unknown |
| [Terraform](terraform/README.md) | DNS product lists Terraform tooling. [DNS product](https://edgecenter.ru/dns) | Exact resource schemas, account access, prices and regional constraints remain unknown |

See [TASK.md](TASK.md) for provider acceptance criteria.
