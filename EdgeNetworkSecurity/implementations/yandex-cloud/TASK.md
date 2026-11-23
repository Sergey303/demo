# ENS-07 — Yandex Cloud provider implementation

- [x] Document separate SWS, WAF, ARL, VPC DDoS and Cloud CDN capabilities in
  the [README](README.md).
- [x] Add a credential-free JSON Schema, validator and offline fixture tests.
  See the [contract README](contract/README.md).
- [ ] Confirm account, rights, regions, pricing and supported IaC schemas.
  Acceptance requires a version-pinned configuration and reviewed staging plan.
- [ ] In approved staging, verify benign traffic, SWS observation logs, WAF false
  positives, origin access restrictions, and rollback to the previous revision.
  Verify 429 only with ARL blocking enabled. Require separate evidence for CDN
  cache behavior, dedicated-IP routing and VPC L3/L4 coverage.

Status `provider-configured` and `provider-verified` is unavailable.
