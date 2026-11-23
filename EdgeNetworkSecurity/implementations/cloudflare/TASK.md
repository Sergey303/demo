# ENS-05 — Cloudflare provider implementation

**Priority P1; status TODO.** Implement only under cloudflare/{workers,waf,rate-limits,terraform}. Prefer config-as-code staged plans, not blind apply.

1. Verify the current official Cloudflare API/Terraform schema, product entitlements and supported Workers runtime.
2. Worker: request ID, fixed test route, no bypass of WAF; bounded timeout and upstream error mapping.
3. WAF and rate limits: use staged/observe mode if available, document plan + safe rollback and API 429 behavior.
4. Lock zone/account to test environment, pin versions, parameterize IDs, no secrets in repo.
5. Separate Cloudflare-managed Anycast/L3-L4 from features this code configures.

Acceptance: static validation and Worker tests in CI; IaC validate/plan with no apply; provider acceptance requires separate manual evidence including false positives, logs, health and rollback. No live attack generation. Mark resource availability and pricing uncertain until verified.
