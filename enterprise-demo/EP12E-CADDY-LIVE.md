# EP-12E — real Caddy/Unix-socket/Keycloak browser acceptance

**Scope:** isolated GitHub Actions integration acceptance only; based on
[EP-12D protected transport](EP12D-PROXY.md), with the prior [real OIDC
provider test](EP12C-LIVE-OIDC.md) as the control. No production login,
enterprise IdP, secret or customer account is involved.

## Hypothesis

The complete ingress path

**Chromium → Caddy (verified HTTPS, bff.ep12c-app.test) → owner-only Unix
Domain Socket → ASP.NET Core 10 BFF → real Keycloak (verified HTTPS,
idp.ep12c-idp.test) + dedicated PostgreSQL session registry**

works without forwarding-header ambiguity or a second BFF TCP listener.
The test *must fail* if Caddy forwards a caller-controlled
`X-Forwarded-For`, `X-Forwarded-Prefix`, `Forwarded`,
`X-Original-Host`, `X-Forwarded-Proto` or `X-Forwarded-Host`
to the secured UDS BFF.

## Reproducible evidence

The separate `oidc-caddy-uds` GitHub Actions job provisions:

1. Disposable PostgreSQL service, separate database/limited role and
   EP-12B migration; no shared or production database.
2. A synthetic realm and clients in Keycloak 26.7.2 (Alice and Bob). All
   secrets and the CA are generated per run. This is a real authorization
   code / S256 PKCE provider, not a simulated IdP.
3. A private Linux directory under the CI runner's home, owned by BFF's
   effective UID, mode 0700; BFF binds **only** to its Unix socket with
   `EP12_TRANSPORT=trusted-uds-proxy`. No `ASPNETCORE_URLS`, TCP listener
   or systemd socket activation is supplied.
4. The actual repository [Caddy example](Caddyfile.ep12d.example), adapted
   for synthetic hostnames, ephemeral certificate and test port. Caddy
   validates this file and runs in a disposable container under the *same
   Linux UID* as the BFF, using the private socket mount. The public TLS
   port is bound **only to 127.0.0.1**; Caddy's admin API is disabled.
5. A short-lived CA trusted by the operating system/.NET and Chromium NSS;
   TLS validation is **never** switched off.
6. Real Chromium/HTTP verification of Alice login and Strict cookie, Bob
   denied until explicitly mapped (then successful with identical provider
   credentials), logout-all and stolen-cookie replay denial. Additional
   HTTP probes verify Caddy's sanitation of malicious forwarding metadata
   and reject a nonmatching public Host at the Caddy edge with an
   explicit expected-host allow route and unconditional 421 fallback.
7. Kernel socket mode/UID/type check, direct unproxied socket request
   returning 400, and `ss -ltnp` process check proving that **the BFF
   itself does not listen on any TCP port**.

This test deliberately runs on the GitHub-hosted ephemeral runner, not RDC.
The execution requires all of `GITHUB_ACTIONS=true`,
`EP12E_DISPOSABLE_POSTGRES=1` and a separate disposable PostgreSQL admin
password. It refuses execution outside that context.

Test driver:
`enterprise-auth-bff/tests/live_caddy_acceptance.py`.
It reuses EP-12C's proven certificate generation, Keycloak fixture and
browser specs. Keycloak and Caddy containers use names unique to this run,
then are removed. The socket directory, generated keys, database, role,
certificates and temporary local CA are removed after the run. Any leftover
unrecognized socket is **not** blindly unlinked.

## Known limits

- This job proves the configured synthetic Caddy edge, not a production
  public DNS/TLS chain, Internet-facing CDN, load balancer, group-access
  socket or multi-hop reverse proxy. Same-UID processes and root remain
  within the trusted operating-system boundary.
- Keycloak runs in development mode with synthetic identities. Enterprise
  IdP federation, SSO logout, production observability, rate limiting and
  incident response still require separate acceptance.
- An upstream request authorized before its session was revoked can finish.
  The edge cannot retract already disclosed data.
- The disposable test uses the official patched Caddy **2.11.9-alpine** image (rather than 2.10.2), pinned to a specific version tag for repeatability,
  but image-digest pinning and container supply-chain policy remain an
  operational deployment concern.
- Success must be verified from the `oidc-caddy-uds` CI job. Code review
  or local compilation of the test harness alone is **not** acceptance.

### Additional acceptance safeguards

The Caddyfile now uses one hostless HTTPS listener with two exclusive
`handle` routes: only the exact expected hostname is proxied to BFF;
all other HTTP Host values receive **421 Misdirected Request**.
This is necessary because a matcher inside a hostname-specific Caddy
site cannot handle requests discarded by that site's outer host filter.
Valid TLS SNI alone must not authorize an unexpected HTTP Host.

The fixture refuses UID 0 and runs Caddy under the same nonroot Linux
effective UID as BFF. Both Chromium and Node's Playwright HTTP client
verify the ephemeral CA; `NODE_EXTRA_CA_CERTS` is supplied explicitly,
without turning off TLS validation.

The browser driver checks Playwright JSON counters: its initial phase
requires exactly two passed tests (Alice and unmapped Bob) with one
intentionally skipped control; the second phase requires exactly one
passed test (mapped Bob) with two skips. An all-skipped suite cannot
produce a successful acceptance result.

The synthetic CA location is computed before installation to support
cleanup after partial setup failure. Temporary `/etc/hosts` and NSS
trust entries exist only for the life of the **disposable hosted runner**,
not on RDC or a user-owned device. File, container and database
cleanup attempts are made on all normal exit paths; any abnormal runner
termination requires the hosted runner to be discarded.

The expected-host matcher receives only the hostname (Caddy strips
the port before comparing). The test Caddy listener is hostless and
bound to `127.0.0.1:18444`, whereas upstream `Host` and
`X-Forwarded-Host` contain the public port. The generator substitutes
these values separately and verifies the 421 fallback is preserved.
