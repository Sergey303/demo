# EP-12C — real Keycloak OIDC over verified HTTPS

**Status:** CI-only acceptance experiment; not production IAM. This is a stacked
draft on EP-12B ([session security design](EP12B-SESSIONS.md)).

## Acceptance scope

A real, ephemeral Keycloak 26.7.2 container serves standard OpenID Connect
discovery, authorization, token and JWKS endpoints. The existing .NET 10 BFF
runs over HTTPS with a temporary trusted CA. Chromium and the ASP.NET OIDC
backchannel both validate server certificates. Certificate verification is
never disabled.

The live browser verifies authorization-code + S256 PKCE login, nonce/state
validation, mapped Alice's issuer/sub, failure of a fully authenticated but
unmapped Bob **followed by a positive control using the same Keycloak account
with only the server-side issuer/sub mapping enabled**, a Secure HttpOnly
SameSite=Strict host cookie, cross-origin CSRF
denial, and rejection of a retained cookie copy after logout-all.

These are integration checks with a real provider, not the deterministic fake
HTTP provider or mocked browser requests of EP-12A/B. The suite must have
a successful oidc-real-https GitHub Actions job before the stage can be
considered accepted; its mere presence in a workflow is not evidence.

## Isolation and cleanup

The fixture is enterprise-auth-bff/tests/live_oidc_acceptance.py. It requires
EP12C_DISPOSABLE_POSTGRES=1, a disposable PostgreSQL admin password,
and GITHUB_ACTIONS=true. A separate ephemeral database/role is created with
a generated long password and restricted permissions; only the existing
EP-12B sessions migration is applied. No shared jobs or customer database
is read or modified.

Local Keycloak is published exclusively on loopback port 18443 at
idp.ep12c-idp.test; the BFF runs at bff.ep12c-app.test:18444 on loopback.
The disposable GitHub runner resolves these different registrable domains
through temporary /etc/hosts entries. This ensures the IdP-to-BFF callback
is genuinely **cross-site**, so the Strict session cookie and data-free
/auth/complete interstitial are exercised under the real browser policy. Synthetic realm users and the confidential OIDC
client are generated for this run. Client passwords, bearer material and private
keys are not committed. Short-lived ephemeral TLS certificates are trusted
through the CI runner's OpenSSL and Chromium NSS stores. The DataProtection
wrapping PFX remains restricted to mode 0600 and the key directory to 0700.
The container, database, role and certificates are removed at completion.

The Playwright development server is disabled only for the opt-in EP-12C
test. Normal demo tests keep their existing Vite launcher. A workflow failure
may retain browser traces as short-lived artifacts for debugging.

## Deliberate limitations

This uses Keycloak in development mode with synthetic accounts and a temporary
CA: it is **not** acceptance of an enterprise IdP, production TLS, reverse
proxies, fleet-wide rotation or an external SSO logout lifecycle. Upstream AI
and user data are not accessed. In-flight requests authorized before a
revocation may still finish; the BFF cannot erase information already copied
by a client. No external secrets, real customer users or production endpoints
are configured in this fixture.

Operational hardening, certificate rotation, session incident handling,
provider-specific federation and real-provider deployment review remain later
acceptance gates. EP-12C is test infrastructure, not a claim of production
security certification.

Partial provisioning failures are also cleaned up: database and role names
are recorded before the first PostgreSQL mutation rather than after the
migration succeeds. The exact identifiers are scoped to this CI run.
