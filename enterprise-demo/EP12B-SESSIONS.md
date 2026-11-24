# EP-12B: revocable sessions and protected persistent keys

Implementation base: `f2e2bef717aae838dd4919ec8982be78604db04e`, isolated branch
`feature/ep12b-revocable-sessions`. This extends [EP-12A](EP12-OIDC-BFF.md).
It is a bounded Linux, direct HTTPS, fixed-loopback BFF security slice, **not
production IAM or a model-quality acceptance**. No production OIDC/deployment
acceptance is implied by TestHost protocol tests.

## Trust boundary and invariants

`enterprise-auth-bff/src/BffApplication.cs` uses the genuine framework OIDC
code/PKCE/state/nonce flow. `OnTokenValidated` maps exactly the validated issuer
and subject through the trusted startup directory. `OnSigningIn` rejects extra
claims, creates a fresh random 256-bit base64url SID and commits its registry row
and `created` audit event **before** emitting a session cookie. Browser/query/IdP
claims cannot select SID, tenant or internal subject. The cookie contains the
original four mapped claims and one internal SID, never IdP tokens. SID is a
bearer secret inside the encrypted/authenticated HttpOnly cookie; never log it.
Only SHA-256(SID) is stored in PostgreSQL. No SID is returned in JSON. BFF/database clocks must be synchronized; a future
issue time fails closed.

`OnValidatePrincipal` requires exactly one canonical SID and the five claims,
rechecks the directory, and runs a **fresh** SQL query matching SID hash AND
issuer AND OIDC sub AND tenant AND subject AND issue/expiry/revocation on every
new protected request. No session cache or sliding renewal exists. A missing,
expired, mismatched or revoked row gets 401 and expires the cookie. DB errors
get generic 503 before upstream access; errors do not silently become anonymous
fallback/demo identities. Source access still requires existing backend SQL grants.

`POST /auth/logout` revokes that session; `POST /auth/logout-all` revokes currently
active sessions for exactly the verified four-field account. Both require the
exact configured Origin and acceptable Fetch Metadata, prohibit query strings,
and expire the cookie **after** the revocation SQL succeeds. There is no account
selector, admin revocation API, remote signout or automatic IdP logout. A new
OIDC login may immediately create another session at an already logged-in IdP.

`SessionRegistry.cs` uses parameterized SQL and one data-modifying CTE per
mutation: state and audit commit together. Audit insert failure rolls back state;
no successful logout is reported. Repeated/concurrent revocations create only one
transition/event per row. Audit contains only session hashes, event IDs, event
kind and database time; it has no email, address, IP, tokens or full cookie.
The trigger rejects UPDATE/DELETE/TRUNCATE. DB/schema owners can bypass it;
this is append-only application audit, not tamper-proof forensic storage.

Revocation takes effect for requests whose authorization query starts after the
revocation commit. Requests already authorized/in flight can finish, including
side effects; BFF revocation cannot retract upstream tokens already issued
(five-minute internal bearer) or data already disclosed. Revoke-all operates on
its SQL statement snapshot: overlapping/new logins committed afterward are new
sessions. It does not permanently disable an account. PostgreSQL must be the
single writable authority; read replicas, stale snapshots and session caches
are unsupported. SQL command/connect timeouts are five seconds. Cancellation or
connection loss around commit can leave the outcome unknown; the UI clears all
private state and reports a generic unknown logout status instead of success.

React's identity epoch and logout latch block stale/focus identity restoration
for both logout buttons. A later fresh identity 401 removes the workspace.
Already loaded data cannot be erased from a malicious client or another tab's
memory instantly; another tab learns revocation on its next request/focus.

## Mandatory infrastructure and administration

All EP-12A settings remain mandatory. Add these **server-only environment values**:

| Variable | Contract |
| --- | --- |
| `EP12_SESSION_DSN` | Npgsql connection string for a **separate dedicated session database** with explicit host, database, user and password (at least 16 characters); host limited to `127.0.0.1`, `localhost` or `::1` |
| `EP12_DP_KEYS_DIR` | Existing absolute canonical local directory, mode exactly 0700 |
| `EP12_DP_CERT_PFX` | Existing absolute canonical PFX file, mode exactly 0600, with RSA private key at least 2048 bits, currently valid with more than one day remaining at startup |
| `EP12_DP_CERT_PASSWORD` | PFX password of at least 16 characters, provisioned outside source/command logs |

Provision a dedicated, restricted Linux service account and trusted filesystem.
Secret files/directories must be owned by the service effective UID, and ancestors
by that UID or root (checked with Linux statx; unavailable support fails closed).
No symlinks (including ancestors), group/world-readable key/config files, relative
paths, non-sticky writable ancestors, remote/session DSN discovery, error-detail
logging, implicit credentials or custom search_path are supported. Sticky `/tmp`
can be used for disposable tests; production paths should be service-owned under
a protected local directory. Protect environment injection, parent ownership,
mounts and file replacement using OS administration; permission checks cannot
make a hostile OS/root account safe. Windows is deliberately rejected until an
explicit tested ACL implementation exists. Remote DB/TLS deployments are outside
this loopback-only slice. Never put passwords into example commands or git.

An administrator creates the dedicated database and applies
[`001_sessions.sql`](../enterprise-auth-bff/sql/001_sessions.sql) there once,
using psql with `ON_ERROR_STOP=1`. Do **not** run job migrations or use shared
jobs data. Reapplying this migration fails rather than silently accepting an
unknown schema. `Program.cs` does only a read-only schema probe; it never creates
tables, changes grants or migrates. Use a separate migration/owner role; revoke
CREATE on public from PUBLIC. Runtime permissions should be only CONNECT,
USAGE on the isolated schema, SELECT/INSERT/UPDATE on `ep12_bff_sessions`,
SELECT/INSERT on `ep12_bff_session_audit` and USAGE/SELECT on its identity sequence.
Do not grant DELETE, TRUNCATE, DDL, owner or superuser to the application.

Keep the key directory and wrapping certificate outside the SPA/build tree.
ASP.NET DataProtection uses stable application name `EnterpriseAuthBff.EP12B.v1`,
a shared persisted key ring and `ProtectKeysWithCertificate`. Generated key XML
contains an encrypted secret/RSA-wrapped key, not plaintext master key material.
Startup rejects pre-existing plaintext key files and probes protection/unprotection
before serving. Startup failures return a generic value-free error and nonzero
exit; no ephemeral fallback exists in Program. File trust, certificate lifetime
and PFX fingerprint are checked on every request, so missing/replaced/insecure
files fail closed even if framework keys are cached. The framework may hold
decrypted key material in process memory; at-rest encryption is not protection
against process compromise. Kernel filesystem races by the trusted OS/operator
remain outside this boundary. Back up and restrict **both** the registry and ring;
restoring an old DB snapshot can resurrect revoked sessions, so disaster recovery
must invalidate the ring/sessions together rather than replaying stale state.

Multiple instances must share the same directory, certificate and principal
snapshot, public origin and application name, and use the same primary registry.
Different rings cannot decrypt cookies. Never expose Vite or either backend
listener alongside BFF TLS; that remains a demo authentication bypass.

### Rotation and retention

Automatic DataProtection key rotation continues under the same wrapping
certificate. Retain old encrypted keys while tickets/protocol state can exist.
Hot certificate rotation/multiple decrypt certificates are **not implemented**:
replacing/removing the configured PFX while running fails closed. For a wrapping
certificate change, stop all BFF instances, revoke active sessions under controlled
administration, archive the old ring/cert securely, provision a fresh empty 0700
ring and new 0600 PFX, then restart all instances consistently. Existing cookies
and pending OIDC state become invalid. Do not overwrite a cert and assume old
keys can still decrypt. An unavailable/corrupt ring never falls back to plaintext.

There is no HTTP cleanup/admin endpoint. Administrators may delete only session
rows with `expires_at < statement_timestamp() - interval '1 day'` in bounded batches
(e.g. 1,000 hashes selected by expiry), after considering audit requirements.
Revoked-but-unexpired rows must remain; deletion would still deny them, but it
would discard useful incident metadata. Retain the minimal audit separately for
the locally approved retention period. If retention requires audit deletion, an
offline privileged maintenance transaction may explicitly disable only the
`ep12_audit_immutable` trigger, delete only rows older than the approved cutoff in
bounded batches, and reenable it before commit; never grant this capability to
the BFF. Archive/backup retention must use the same policy. No automatic pruning
or broad table truncation is performed by the service or tests.

## Verification

Tests create genuine temporary RSA PFX files and 0700 directories; no secret/PFX
is tracked. The narrow `ISessionRegistry` overload is an explicit test-host
composition seam; no public flag, route or startup environment enables the fake.

```sh
dotnet test enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release
```

Without `EP12_TEST_SESSION_CONNECTION`, database tests explicitly SKIP.
Set it only to an explicitly disposable/dedicated database; tests create a unique
schema, apply the real migration and drop only that schema in fixture cleanup.
With opt-in they cover actual PostgreSQL transitions, exact identity fields,
expiry, concurrent revoke-all, append-only audit, transaction rollback on audit
failure, missing migration and unavailable registry. The cross-instance test
obtains a cookie through actual OIDC middleware and a deterministic isolated HTTPS
backchannel provider, disposes that host, then uses two independent hosts reading
the real encrypted ring and PostgreSQL before logout/replay denial. This is
protocol/TestHost acceptance, not a real external IdP/TLS browser deployment.

CI also executes the real foreign-owner fixture with CAP_CHOWN via sudo,
using only generated temporary files. Restricted root containers without that
capability explicitly skip this fixture; ownership-policy tests still run.

CI creates a separate `ep12_sessions` database in its disposable PostgreSQL
service, explicitly applies the migration, and opts into the database tests.
Frontend contracts mock HTTP and test logout-all success/error, identity 401 and
focus races. Existing demo signer/proxy and model/source authorization are unchanged.

Local verification results and outstanding acceptance are recorded below after
running checks. No real Keycloak/TLS browser login, remote deployment, real-model
inference under OIDC, load/soak or production operational acceptance is claimed.

### Local run, 2026-11-16

Environment: Linux x64, .NET SDK 10.0.112, Node 24.20.0, cached NuGet/NPM and
Playwright Chromium. New `postgres:16` container only, random generated password,
random mapped port, dedicated `ep12_sessions` database; unique test schemas dropped
by fixture. This environment's Docker endpoint required `host.docker.internal`
in the opt-in **test** DSN (not supported by production startup configuration).
No shared database/services, other worktree, real model or real IdP was used.

| Command / evidence | Observed result |
| --- | --- |
| `dotnet build enterprise-auth-bff/src/EnterpriseAuthBff.csproj -c Release --no-restore` | PASS, zero warnings/errors |
| `dotnet test enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release --no-restore` with opt-in disposable session DSN | 119 passed, 1 explicit CAP_CHOWN fixture skip, zero failures; all 7 PostgreSQL tests executed |
| Same xUnit command without opt-in DB environment | 112 passed, 8 explicit skips (7 DB + CAP_CHOWN), no DB dependency/fallback |
| Program process with missing mandatory configuration | Generic error, exit 1, no listener/fallback |
| `npm run build`, `npm run check:e2e` in bootstrap5 | PASS |
| `node --test tests/enterprise-auth.test.mjs` | 4 passed, including both actual Vite proxies |
| `npx playwright test --workers=2` | 116 passed, 4 opt-in live-service tests skipped; no service launcher started |
| `python3 -m unittest discover -s enterprise-demo/tests -v` | 5 passed |
| `python3 -m unittest discover -s hiring-demo/tests -v` | 5 passed |
| `python3 scripts/check_hiring_review_links.py` | PASS |
| `python3 -m pytest -q architecture/tests` | BLOCKED: pytest not installed; offline cached dependency resolution also failed. No Python regression PASS claimed |
| Independent source/security review | UID ownership gap fixed with statx + policy tests and CI chown fixture; absent Set-Cookie assertion corrected |

The real foreign-owner filesystem fixture is explicitly skipped locally because
`CAP_CHOWN` is absent even though UID is 0. The seven owner-policy cases run, and
all other key-path checks use real files/statx. CI's sudo step is wired but has
not been executed from this worktree. Real Keycloak/TLS browser login was deferred:
its separate certificate/provider/browser trust setup was not part of the tested
core path. Do not infer that acceptance from the cached image's availability.
No push, merge, remote CI result or production acceptance is claimed.
