# ENS-07 — Yandex Cloud provider implementation

**Priority P1; status TODO.** Work in yandex-cloud/{smart-web-security,waf,rate-limits,anti-ddos,cdn,terraform}. Use official documentation to verify concrete resources, service interactions and tariff constraints.

Acceptance:
- separation of SWS Smart Protection, WAF, Advanced Rate Limiter, DDoS Protection L3/L4 and Cloud CDN;
- staged security profile with explicit rollback and logging;
- 429 behavior tested only where enabled; never assert SWS equals all-network DDoS protection;
- dedicated-IP CDN Anycast only claimed if configured/verified;
- Terraform version-pinned validate/plan, manual apply only, never commit state/secrets;
- contract tests and documented price/region limits with sources.

TODO: eligible Yandex account, test domain, provider acceptance and evidence. No inference code in this project.
