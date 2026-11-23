# Yandex Cloud — Edge Network Security

**Local-tested:** the [offline staging policy contract](contract/README.md)
validates CDN, WAF, rate limit, origin protection, logging and rollback intent.

**Provider-configured / provider-verified:** unavailable. Published product
features are listed below. Account eligibility, region, prices, rights and current
Terraform resource coverage for the proposed staging environment are unknown.

| Area | Public documentation | Deployment evidence still needed |
| --- | --- | --- |
| [Smart Web Security](smart-web-security/README.md) / [WAF](waf/README.md) | SWS profiles include Smart Protection (L7) and WAF rules. [SWS overview](https://yandex.cloud/en/docs/smartwebsecurity/concepts/) | Attachment to the intended frontend, staged policy, monitoring, false positives and rollback |
| [Advanced Rate Limiter](rate-limits/README.md) | Blocking over quota returns 429. CAPTCHA is a separate action. [SWS rules](https://yandex.cloud/en/docs/smartwebsecurity/concepts/rules) | Confirm the chosen action, scope and quota behavior |
| [DDoS Protection](anti-ddos/README.md) | VPC DDoS Protection covers the network and transport layers. [VPC DDoS documentation](https://yandex.cloud/en/docs/vpc/ddos-protection/) | Confirm coverage of the target IP separately from SWS |
| [Cloud CDN](cdn/README.md) | Dedicated IP addressing has documented Anycast/GSLB behavior. [CDN dedicated IP documentation](https://yandex.cloud/en/docs/cdn/concepts/dedicated-ip-addressing) | Confirm assignment and routing before claiming Anycast for an instance. Verify caching and origin controls separately |
| [Terraform](terraform/README.md) | Staging resource mapping and version pin remain open | Review actual resource schema and a plan before any configuration |

See [TASK.md](TASK.md) for provider acceptance criteria.
