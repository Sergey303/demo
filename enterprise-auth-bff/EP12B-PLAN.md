# EP-12B implementation plan

Base: f2e2bef717aae838dd4919ec8982be78604db04e. Spec:
enterprise-demo/EP12B-IMPLEMENTATION-BRIEF.md. Execute inline, then independent
security review. Only this worktree and disposable test resources are authorized.

1. Add failing host tests for replay, logout-all, exact identity, malformed SID,
   expiry and outage. Introduce ISessionRegistry and a test-only in-memory fixture;
   register SID in OnSigningIn, validate fresh in OnValidatePrincipal, revoke
   transactionally before signout. No OnSigningOut mutation on invalid tickets.
2. Add isolated PostgreSQL schema and Npgsql registry. Test creation/revocation
   audit atomicity, expiry, exact fields, concurrency, outage and two-host replay.
   Startup checks schema read-only; no migration or cache in application.
3. Add secure Linux infrastructure configuration, RSA certificate-encrypted
   persistent DataProtection. Test permissions/symlinks/cert failures, actual XML
   encryption, restart and separate-ring rejection. Program has no fake fallback.
4. Add logout-all UI using existing identity epoch; contracts for success, error,
   identity replay denial and focus race. Preserve all demo behavior.
5. Document threat boundary, schema/retention/rotation and exact verification;
   wire disposable PostgreSQL CI. Run related suites, link validator, review and
   commit intended paths only. Do not push/merge or touch shared services.

Review focus: DB/audit failure must never authorize or acknowledge logout;
malformed and duplicate claims; exact issuer/sub/tenant/subject; cancellation at
commit; cross-instance key compatibility; filesystem trust and certificate expiry;
no sensitive logs; concurrent logout-all covers sessions committed before it
(with overlapping login documented); UI cannot restore private data after logout.

Execution record (2026-11-16): core replay tests observed RED on EP-12A
(logout replay authorized, logout-all absent), then GREEN with registry.
Plaintext-ring refusal observed RED, then GREEN. Logout-all browser contracts
were also checked with the button removed (RED), then restored (GREEN).
Independent reviewer found UID ownership unchecked and absent-cookie assertion
incorrect; both addressed. UID rules and statx enforce ownership now. The real
chown fixture cannot execute in this capability-stripped root container and
explicitly skips; CI runs it under sudo. No untested local chown PASS is claimed.
Ruling: local/loopback PostgreSQL and Linux statx only — bound the deployment
contract rather than silently assuming remote TLS or Windows ACL equivalence.
Ruling: snapshot revoke-all covers committed active sessions, not a login
committing afterward — this is session revocation, not account disabling.
Ruling: keep Keycloak/TLS acceptance separate — core actual middleware + SQL +
protected ring verified; browser/provider deployment remains unaccepted.
Python architecture pytest unavailable in shell and offline cache; no package
or model download performed. Launcher unittest and full frontend suites ran.

Final verification: 119 xUnit PASS / 1 CAP_CHOWN skip with disposable PostgreSQL
(all 7 PG tests executed); 116 full frontend PASS / 4 opt-in live skips;
application/test typechecks and Vite build PASS; 4 Node PASS; both launcher suites
5/5 PASS; review-links and whitespace checks PASS. Missing-config process exit 1
with generic error. Architecture pytest BLOCKED (not installed/cached).
Independent review fixes complete; no production/real IdP/CI acceptance claimed.
