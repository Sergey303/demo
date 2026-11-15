# EP-12-A implementation plan

Base: c3a27e01bc30de5ccf4fe07f037762d328ffc3e1 on feature/ep12-oidc-bff.
Scope: enterprise-demo/EP12-A-IMPLEMENTATION-BRIEF.md (provided task input).

Use the existing isolated worktree. Implement the specified independent .NET 10
BFF with AddCookie and OpenIdConnect 10.0.10; do not change the demo proxy or
launcher. Use a strict startup directory, fixed upstreams, bounded allowlisted
proxy headers and paths, authenticated static SPA, and exact public-origin checks.

1. Write failing configuration/directory/token and host-boundary tests; implement
   configuration, trusted principal mapping and the existing internal HMAC format.
2. Implement OIDC/cookie authentication and fixed proxy/static boundaries; verify
   unauthenticated, forged, cross-site, traversal, stale-mapping and outbound denial.
   Exercise the genuine middleware with an isolated signed-token fake IdP if feasible.
3. Add failing browser contracts for OIDC identity and BFF-only sign-in, then minimally
   extend the existing identity controller; retain EP-11 identity epoch behavior.
4. Document setup, deployment isolation, threat model and exact evidence levels.
   Run build, .NET tests, TypeScript build, Node signer and browser contracts; obtain
   independent security review, resolve findings, inspect staged diff and commit only
   intended changes. No push, merge, database, real credentials or model downloads.

Review focus: login CSRF/state/nonce, wrong issuer/audience, cookies and raw token
leaks, stale mappings, encoded path traversal/prefix confusion, Host/Origin spoofing,
SSRF/redirects, missing Origin, and Python/C# HMAC compatibility. Real-provider login,
TLS operation, protected persistent key ring and production revocation remain distinct
from in-process test evidence.
