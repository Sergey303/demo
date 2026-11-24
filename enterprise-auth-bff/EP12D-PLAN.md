# EP-12D implementation plan

Base: b42bd5b323ba59b0cb25107b3e9ed3e9d162e632. Design: ../enterprise-demo/EP12D-PROXY.md.

Implement inline in the existing isolated checkout; no DB, models, main edits or publication.

1. Add failing configuration and real Kestrel UDS tests. Cover owner/mode/link/path checks, endpoint injection, forwarding ambiguity, and valid unauthenticated requests.
2. Add BffTransport with Linux statx identity, restrictive process umask, sole Unix listener, startup readiness gate and inode-bound cleanup. Integrate before infrastructure/auth and keep direct HTTPS behavior.
3. Extend negatives and real framework OIDC challenge over UDS. Verify runtime permission changes fail closed.
4. Add sanitized Caddy example and operational limits. Run .NET suite, TS/build/browser contracts and link validation; independent critical review; inspect scoped staged diff and commit locally.

Review focus: environment configuration aliases; stale socket replacement; group/other access; malformed/multiple forwarding headers; readiness race before post-bind verification. Same-EUID processes and root are trusted; no isolation from them is claimed.
