# EP-12D protected local reverse proxy transport

Base: `b42bd5b323ba59b0cb25107b3e9ed3e9d162e632`, implemented on
`feature/ep12d-proxy-operational-security`. Opt-in Linux-only operational slice,
not a production deployment. See the
[implementation plan](../enterprise-auth-bff/EP12D-PLAN.md).

Direct HTTPS remains the default (`EP12_TRANSPORT` absent or `direct-https`).
It still requires actual TLS and exact origin; forwarding headers never affect
scheme, host, identity or backend headers. This preserves existing direct-mode
tests which intentionally send forwarding metadata to verify outbound stripping.
`ASPNETCORE_FORWARDEDHEADERS_ENABLED` is forbidden even when set to `false`;
do not install generic forwarded-header middleware.

For one TLS-terminating local proxy, set in the BFF service environment:

```text
EP12_TRANSPORT=trusted-uds-proxy
EP12_PROXY_SOCKET_PATH=/run/ep12-bff/bff.sock
EP12_PUBLIC_ORIGIN=https://bff.example.test
```

Keep every [EP-12B session/key-ring requirement](EP12B-SESSIONS.md) and
[OIDC registration requirement](EP12-OIDC-BFF.md). Only TLS termination moves to
the edge; the data-protection certificate is still required. Do not put secrets
in this file, shell history, repository or logs. Start the compiled BFF without a
launch profile (`dotnet run --no-launch-profile --project enterprise-auth-bff/src`).

Provision `/run/ep12-bff` before startup, owned by the BFF effective UID, mode
0700. Ancestors must be root/service-owned real directories without group/other
write, including sticky writable directories (unsupported). No symlinks, shared
`/tmp`, `/var/tmp`, `/dev/shm`, repository, application content/web roots or relative
paths. Socket basename must match `[A-Za-z0-9][A-Za-z0-9_-]{0,47}.sock`; full
UTF-8 path at most 100 bytes. The socket must not exist at bootstrap.

Unset `ASPNETCORE_URLS`, `URLS`, `HTTP_PORTS`, `HTTPS_PORTS`, their hosting-prefix
aliases, `PreferHostingUrls`, `Kestrel:Endpoints` (including JSON/environment
`__` forms), forwarding auto-enable and systemd `LISTEN_*` activation settings.
These are rejected rather than creating an extra TCP listener. No systemd socket
activation, inherited descriptor, HTTP port fallback, TLS-on-UDS, multi-hop proxy,
group access or multiple service UIDs are supported. Kestrel binds one plaintext
HTTP/1 Unix socket; process umask 0077 is set before bind and deliberately stays
in effect. Post-start statx verifies service ownership, socket type and mode
0700 (0600 also allowed). Requests remain denied until that succeeds. Each
request rechecks parent safety and the socket's device/inode/type/mode identity.

Use the [Caddy example](Caddyfile.ep12d.example) with a trusted certificate for the
explicit hostname. The Caddyfile deliberately uses one hostless HTTPS listener
with an expected-host `handle` route and an unconditional **421 Misdirected
Request** fallback. This is necessary because a named matcher inside a
hostname-specific site cannot process requests rejected by that site's outer
hostname filter. Change the expected-host matcher and both upstream Host
headers, plus PublicOrigin; if using a non-default public port, include that
port in the listener and both upstream Host fields, but **not** in the host
matcher, which compares hostnames without the port.
The original HTTP Host must be the exact public authority. Never replace it with
`localhost`, the socket path, or an inherited client forwarding header. The BFF
requires exactly one `https` Proto and one exact Host, rejects all other
`X-Forwarded-*`, `Forwarded` and `X-Original-*`, then sets Request.Scheme before
OIDC/cookie handling. Existing CSRF, query callback, fixed return URI, principal
mapping and fresh session revocation checks remain unchanged.

Caddy supports Unix upstreams and header deletion/overwrites; it normally adds
X-Forwarded-For, which this example explicitly removes. See the
[official reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers).
Do not add another proxy hop, trusted-proxy IP settings or path rewriting.
Disable edge access/debug logs that could capture callback query codes, cookies
or tokens. Supply edge private keys separately; no certificate/key is committed.

Only a dedicated same-EUID Caddy process should access the socket. Any process
with that UID (and root) can impersonate the proxy and is trusted; UDS is not
human authentication. Root/UID compromise, malicious startup extensions, ACLs,
mount namespace manipulation and hostile same-UID processes are outside this
slice. Do not grant additional users ACLs/capabilities or share the UID with
untrusted applications. Modes/statx do not provide isolation from those actors.
Stop old Vite servers; never publish direct APIs 5077/5088 or a second BFF
listener. Those listeners can bypass identity regardless of this socket policy.

Graceful shutdown removes only the recorded owned socket identity, when it still
exists. A crash may leave a stale socket: startup refuses it. Stop both services,
inspect owner/type and active processes, then have the operator remove the stale
socket. Never blindly unlink on startup. Start failures remain closed and use
value-free Program errors; no database fallback or ephemeral production keys.

## Verification boundaries

`dotnet test enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj` includes
real kernel AF_UNIX + Kestrel tests with an in-memory session registry and fake
HTTPS IdP backchannel. It proves actual owner-only socket permissions, sole Unix
server address, startup gating, malformed/duplicate/raw headers, unauthenticated
401, and real framework PKCE challenge with the public HTTPS callback. It does
not constitute real Caddy TLS/OIDC browser deployment or production IAM evidence.
Existing EP-12C live Keycloak CI is unchanged; it is not new UDS live acceptance.
DB tests remain opt-in and must use disposable data; no shared DB is needed here.


### Local verification — 2026-11-16

- `dotnet test enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release --no-restore -- RunConfiguration.MaxCpuCount=1`: **125 PASS, 8 SKIP, 0 FAIL**. The skips require opt-in disposable PostgreSQL (7 cases) or Linux CAP_CHOWN (1 case); the kernel Unix socket and OIDC challenge tests were executed and passed.
- React/Vite `npm run check`, `npm run check:e2e` and `npm run build`: **PASS**.
- Playwright EP-11/EP-12 targeted regression with `--workers=1 --retries=0`: **32 PASS, 0 FAIL**.
- `python3 scripts/check_hiring_review_links.py` and `git diff --check`: **PASS**.
- One earlier concurrent all-browser/.NET attempt was interrupted by an RDC **out-of-memory** condition and must **not** be counted as a failing code test or as a passing full suite. The above checks were rerun sequentially.
- Independent source review: **no actionable P0/P1/P2** found, but no live Caddy edge deployment, real production TLS termination or UDS+Keycloak full-browser acceptance was run.

The published branch's GitHub Actions will be the separate post-commit regression evidence.
