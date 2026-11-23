# ENS-05 — Cloudflare provider implementation

- [x] Local Worker and Node tests for the fixed route, request ID, header isolation,
  origin restrictions, deadline and failure mapping. See the [Worker README](workers/request-guard/README.md).
- [ ] Confirm staging zone entitlements and pin supported IaC and runtime versions.
  Acceptance requires reviewed resource schemas and a staging plan.
- [ ] Define staged WAF/rate limit policies and rollback. Acceptance requires an
  approved test zone, ingress and origin access checks, safe HTTP checks,
  false-positive review and observed rollback. Check where blocks and 429s
  originate and whether the chosen plan supports observation mode.

The local handler emits no logs. Health, WAF enforcement, alternate ingress,
origin shielding and rollback require separate provider evidence. Status
`provider-configured` and `provider-verified` is unavailable.
