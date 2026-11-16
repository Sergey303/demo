# EP-12 OIDC BFF (EP-12A protocol + EP-12B sessions)

EP-12A historical base: `c3a27e01bc30de5ccf4fe07f037762d328ffc3e1`, branch
`feature/ep12-oidc-bff`. This is an opt-in, independently started .NET 10
BFF. The existing EP-11 startup-fixed demo proxy and `enterprise-demo/run.py`
are unchanged. This branch does not establish production IAM or AI quality.

EP-12B supersedes the process-ephemeral/stateless-cookie limitations below with
mandatory PostgreSQL revocation and an encrypted persistent key ring. Read
[EP-12B setup, threat model and evidence](EP12B-SESSIONS.md) before starting:
`EP12_SESSION_DSN`, `EP12_DP_KEYS_DIR`, `EP12_DP_CERT_PFX` and
`EP12_DP_CERT_PASSWORD` are mandatory, Linux-only, with no fallback. Program
performs a read-only schema probe; apply the session migration separately.

## Deployment and setup

**Stop the demo Vite servers before using BFF mode.** Never publish Vite, its
preview server, port 5077 or port 5088 alongside the BFF. Vite can issue a demo
principal without a human login and would be an authentication bypass if exposed.
The BFF does not launch or supervise those processes and cannot secure another
listener. Bind the APIs to loopback, isolate local processes/users, and expose only
BFF TLS. There is no `/demo-api` proxy in the BFF. A hostile local OS user or
DB owner is outside this boundary.

1. Install .NET 10 and build the existing UI: `cd bootstrap5 && npm ci && npm run build`.
2. Register a confidential web client at **one trusted HTTPS OIDC provider**.
   Register the exact callback `https://localhost:7443/signin-oidc` (replace the
   origin consistently if needed). Enable authorization code, S256 PKCE and the
   `openid` scope. Obtain its issuer identifier and client credentials out of band.
   The configured authority must equal the provider's exact issuer (no trailing
   slash in this first slice). Providers with other issuer URL shapes are unsupported.
3. Set environment variables in the BFF process only. Example values below are
   placeholders; obtain secrets from your environment/secret manager, not source,
   command history, browser configuration or committed files:

   | Variable | Required value |
   | --- | --- |
   | `EP12_AUTHORITY` | Exact HTTPS issuer, e.g. `https://identity.example.test/realms/demo` |
   | `EP12_CLIENT_ID` | Registered confidential client ID |
   | `EP12_CLIENT_SECRET` | Its server-side secret |
   | `EP12_PUBLIC_ORIGIN` | Exact HTTPS origin, e.g. `https://localhost:7443`, no slash/path/query |
   | `DEMO_AUTH_SECRET` | At least 32 UTF-8 bytes, same server-only HMAC key as both backends |
   | `EP12_PRINCIPALS` | JSON directory described below |
   | `ASPNETCORE_URLS` | Explicit TLS loopback binding, e.g. `https://127.0.0.1:7443` |
   | `ASPNETCORE_Kestrel__Certificates__Default__Path` | Locally protected TLS certificate PFX |
   | `ASPNETCORE_Kestrel__Certificates__Default__Password` | Certificate password, if needed |

   Use a locally trusted certificate valid for the public origin. Do not disable
   certificate validation. For TLS termination use only the explicit
   [EP-12D protected UDS mode](EP12D-PROXY.md); direct mode never trusts forwarded
   metadata. `ASPNETCORE_FORWARDEDHEADERS_ENABLED` must be absent.
   HTTP or a mismatched Host receives 400. Do not log request headers, callback
   queries, token responses, cookie values or configuration dumps in surrounding
   infrastructure. Framework request/authentication logs are suppressed by the entrypoint.

4. Supply a server-managed directory, for example:

   ```json
   [{"issuer":"https://identity.example.test/realms/demo","sub":"stable-provider-sub","tenant":"review-team","subject":"alice"}]
   ```

   `sub` is the provider's stable case-sensitive OIDC subject, not email. `tenant`
   and `subject` are existing internal grant identifiers (`[A-Za-z0-9._-]{1,128}`).
   The directory is a trusted startup snapshot, at most 1,000 entries. Empty,
   malformed, duplicate issuer/sub, unknown fields, mismatched issuer, missing
   credentials or weak signing secret fail startup with a value-free error.
   Unknown users fail login; there is no fallback principal or self-registration.
   Provision source grants separately using existing trusted mechanisms.
5. Start only the required existing APIs/workers separately on loopback 5077/5088,
   with their normal configuration; EP-12B requires its separate session database. This slice
   does not automatically start anything or run migrations. Use disposable data.
6. From the repository root run:

   ```sh
   dotnet run --project enterprise-auth-bff/src/EnterpriseAuthBff.csproj
   ```

   Start with `/auth/login` on the configured TLS origin. The SPA is protected,
   so an unauthenticated root receives 401 rather than automatically starting a
   login. Successful login returns to a data-free `/auth/complete` page; click
   **Continue to workspace** to open `/dashboard/enterprise-ai`. Build outputs
   are resolved from `enterprise-auth-bff/src/../../bootstrap5/dist`; launch via
   the project command above (a standalone publish requires the same layout).
   Missing `dist/index.html` returns 503 with build instructions after authentication.

## Request and identity contract

`BffApplication.AddServices` uses framework AddCookie and OpenIdConnect **10.0.10**:
code flow, S256 PKCE, signed issuer/audience/lifetime checks and framework
nonce/state/correlation validation. HTTPS metadata is mandatory, claim mapping and
userinfo are off, only `openid` is requested, and `SaveTokens=false`. Discovery,
JWKS and token endpoint URLs come from the one explicitly trusted provider's TLS
metadata; the browser cannot supply them. Trust in that provider includes its
metadata/endpoints. No custom JWT/OAuth implementation is used in production code.
See [Microsoft's .NET 10 OIDC guidance](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0).

Only an exact validated `(issuer, sub)` lookup creates a session. `OnTokenValidated`
replaces every raw IdP claim with four internal `bff_*` claims; cookie signing adds one server-created SID. Tenant/email/name
claims supplied by the IdP have no authorization effect. Every cookie validation
rechecks all four against the directory and freshly validates the internal SID against PostgreSQL; inconsistent or removed identities are
rejected and the cookie is expired. Directory changes take effect by restarting
with a new snapshot; there is no hot reload/admin directory API.

The `__Host-Http-EP12` session cookie is Secure, HttpOnly, SameSite=Strict, Path=/,
no Domain. Its protected authentication ticket expires after 30 minutes, without
sliding renewal; no access/refresh/ID token is stored. Temporary framework nonce
and correlation cookies intentionally use SameSite=None + Secure + HttpOnly to
support the cross-site OIDC return. They are protocol cookies, not sessions.
A data-free completion document and explicit same-origin Continue link break the
cross-site redirect chain before the protected SPA. This avoids relying on a Strict
cookie being sent immediately after an external redirect (see the
[ASP.NET Core external-login discussion](https://github.com/dotnet/aspnetcore/issues/52253)).
The completion document has a restrictive CSP, renders no caller input and makes no
authentication assertion. Opening it directly grants nothing.
The query callback must remain an exception to application POST CSRF rules;
its authority is framework protected state + correlation + nonce, not Origin.
The new sign-in ticket replaces the prior session identity (no browser session ID
or tenant is accepted). Callback failures return a generic 401.

| Route | Behavior |
| --- | --- |
| `GET /auth/login` | Framework challenge, fixed callback and fixed post-login return, no returnUrl/query; cross-site Fetch Metadata rejected |
| `GET /auth/complete` | Public data-free HTML with a fixed workspace link; no identity, query parameters or redirect target |
| `GET /auth/session` | Authenticated JSON `{tenant,sub}`; `sub` is the verified internal subject, never raw IdP sub/token |
| `POST /auth/logout` | Authenticated same-origin request, server-side per-session revocation then cookie signout, 204; GET is 405 |
| `POST /auth/logout-all` | Exact-account server-side revocation, same CSRF boundary, then cookie signout, 204 |
| `GET /enterprise-search/agent/identity` | BFF-local JSON `{tenant,subject,identity_kind:"oidc"}` |
| `/enterprise-api/*` | Authenticated fixed `http://127.0.0.1:5077/*` |
| `/enterprise-search/*` | Authenticated fixed `http://127.0.0.1:5088/*` |
| SPA root, dashboard routes and `/assets/*` | Authenticated compiled build files only |

All responses have `Cache-Control: no-store` and `X-EP12-BFF: 1`. React retains the
EP-11 identity epoch clearing behavior, accepts only `local_demo`/`oidc`, labels OIDC
explicitly, and offers Sign in after identity 401 **only** with the BFF header.
OIDC Sign out clears the workspace before the POST. The normal demo label and
failure behavior remain available in demo mode. No tenant selector is added.

## Proxy and security review

The proxy constructs each outbound request from scratch: no caller Cookie,
Authorization, Forwarded/X-Forwarded headers, Host, tenant headers or other headers
are copied. Only validated Idempotency-Key, JSON content and server-issued internal
bearer are sent. The bearer is the existing HMAC-SHA256 base64url two-part format
from `architecture/audio_access.py` and `dotnet-outbox/src/AudioIdentity.cs`, with
only mapped tenant/sub and a five-minute expiry. It is neither an IdP token nor
returned to the browser. Existing SQL grants remain the source authorization;
login never grants source access by itself.

Only GET/POST proxy operations and exact segmented prefixes are supported. Query
strings are rejected for proxies; safe ASCII path segments reject percent encoding,
backslashes, leading-dot segments, duplicate slashes and traversal. There are no
browser-selected targets. Caller headers cannot choose a backend, and the transport
disables redirects, cookies and system HTTP proxies. Upstream 3xx is 502 without
Location; response headers, including Set-Cookie, are never copied. Only application/json
responses are accepted. Request bodies are capped at 400,000 bytes including chunked
requests; response bodies are capped at 2,000,000 bytes before disclosure, and a 120-second
proxy deadline covers body transfer.
A failure/denial does not issue an upstream request when input validation has not passed.

Every application mutation, including logout, requires exactly the configured
Origin, rejects missing Origin, and checks Sec-Fetch-Site when present. No CORS is
enabled. SameSite is additional protection. GET login rejects cross-site Fetch
Metadata and arbitrary return parameters; state/correlation/nonce prevent a
callback from another browser/login transaction. Like all cookie apps, XSS or a
compromised same-origin script can act as the user; this slice is not an XSS defense
or an upstream content sanitizer. Deploy only the trusted compiled UI, never
untrusted dist files or symlinks. No repository directory is served.

The boundary requires direct TLS and the exact public Host; it ignores caller
forwarding headers. Metadata still depends on provider integrity and standard TLS.
Startup origin/authority validation prohibits URL userinfo, query and fragments.
The BFF does not expose OIDC metadata, tokens, secrets, arbitrary URLs or remote
signout. Generic exception handling avoids developer error-page disclosure.

## Evidence and limitations

Run from repository root:

```sh
dotnet build enterprise-auth-bff/src/EnterpriseAuthBff.csproj -c Release
dotnet test enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release
python3 scripts/check_hiring_review_links.py
cd bootstrap5
npm run build
npm run check:e2e
node --test tests/enterprise-auth.test.mjs
npx playwright test tests/enterprise-oidc.spec.ts tests/enterprise-identity.spec.ts tests/enterprise-ai.spec.ts tests/enterprise-documents.spec.ts tests/enterprise-search.spec.ts tests/enterprise-answer.spec.ts tests/enterprise-generated.spec.ts tests/mcp-agent.spec.ts
```

The xUnit TestHost fixture drives the **actual OIDC middleware** through HTTPS
metadata/JWKS, an ephemeral RSA-signed ID token and code/S256 PKCE redemption, then
reads a protected mapped cookie session. It covers wrong issuer/audience/signature,
nonce, expired ID token, unknown sub, state and missing correlation; raw IdP tenant
claims cannot change the mapped identity. The fixture substitutes only the HTTP
backchannel, not authentication or token validation. Other tests use protected
fixture tickets to isolate host/CSRF/proxy boundaries. These are in-process tests,
not evidence of a real provider, real TLS, a browser's cookie enforcement or SQL.
Browser tests mock HTTP and verify UI identity/clearing only.

**Real IdP + browser login: NOT TESTED.** No real provider credentials were used.
No model or shared DB was run. Existing model-backed evidence remains separate.
EP-12A historical checks are below; CI now also runs the EP-12B isolated session-database tests.

EP-12B now requires protected persistent keys, a fresh PostgreSQL session check
on each request, transactional per-session/logout-all revocation and minimal
audit. The former EP-12A stolen-cookie-until-expiry limitation is superseded; see
[EP-12B](EP12B-SESSIONS.md) for the exact commit/in-flight/concurrent-login boundary,
mandatory setup and current evidence. IdP backchannel logout, rate controls,
managed secrets and real-provider/deployment acceptance remain outside this slice.
Deprovisioning at the provider alone does not revoke existing BFF sessions;
use local logout-all or remove the directory entry and restart all instances.

Local verification on 2026-11-15 (Linux x64, .NET SDK 10.0.112, Node 24.20.0,
Playwright 1.63.0 Chromium), against the implementation based on the SHA above:

| Check | Observed result |
| --- | --- |
| Release application build | PASS, zero warnings/errors |
| Release xUnit suite | 56 passed, zero failed/skipped |
| TypeScript application check + Vite build | PASS |
| TypeScript browser-test check | PASS |
| Existing Node signer and real Vite proxy contracts | 4 passed |
| Hiring/Enterprise browser contracts in the command above, plus `hiring-demo.spec.ts` | 40 passed; mocked HTTP, not live OIDC/SQL/model evidence |
| Hiring review link/status validator | PASS |
| Independent source/security review | Findings on response bounds, sanitized errors and forwarded-header mode fixed; re-review found no unresolved important issue |

The final Release commands used `--no-restore` after restoring cached test packages.
The HMAC wire-vector test matches a fixed-clock token independently accepted by
`architecture.audio_access.verify_token`; the live-clock test uses the actual
`AudioIdentity.FromAuthorization` C# source. An isolated process-start smoke check
confirmed the documented project command resolves the expected content root;
it used synthetic configuration and an ephemeral HTTP loopback listener, and
establishes no TLS or login acceptance. No push, deployment or CI run is claimed.
