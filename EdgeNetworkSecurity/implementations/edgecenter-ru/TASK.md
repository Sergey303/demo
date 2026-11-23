# ENS-06 — EdgeCenter provider implementation

- [x] Record published capabilities and unknowns in the [README](README.md).
- [x] Add a credential-free JSON Schema, validator and offline fixture tests.
  See the [contract README](contract/README.md).
- [ ] Confirm account, product plan, costs, region, API/IaC schemas and feature
  availability before writing an authenticated adapter.
- [ ] In approved staging, prove origin TLS and direct-access policy. Use a
  public test asset and benign requests to compare documented `Cache` HIT/MISS,
  `Cache-Control` and origin logs. Verify observe and enforce behavior only where
  supported. Capture false positives and the effect of restoring the previous
  revision. Check DNS and HTTP routing independently. Use provider evidence to
  establish L3/L4 coverage.

Status `provider-configured` and `provider-verified` is unavailable.
