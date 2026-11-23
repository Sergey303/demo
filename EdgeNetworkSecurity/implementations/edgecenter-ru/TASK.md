# ENS-06 — EdgeCenter (RU) provider implementation

**Priority P1; status TODO.** Work in edgecenter-ru/{cdn,anti-ddos,waf,dns,terraform}. Verify publicly documented APIs and exact service plan before code generation; do not invent Terraform resources.

Acceptance: provider capability matrix with sourced links, CDN cache/headers test protocol, WAF staged policy, rate-limit equivalent if available, monitoring/rollback, DNS Anycast separated from HTTP Anycast. Config validator must not need credentials. Any live provider verification is opt-in and never produces attack traffic to public endpoints.

TODO: authenticated adapter only after account/capability confirmed, declarative schemas, mocked contract tests, cost and regional constraints.
