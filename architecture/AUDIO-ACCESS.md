# Tenant isolation and revocation in audio retrieval

This is an implemented narrow security boundary for the portfolio audio pipeline, not a production identity provider.

## Trust boundary and guarantees

The authenticated identity is a signed HMAC-SHA256 token containing tenant, subject and expiration. A trusted offline issuer holds the signing secret; neither the API nor the search service lets the HTTP client choose its own principal.

- Audio upload requires a valid token. Tenant, job, WAV, outbox event, and owner read grant commit together.
- Audio result GET and semantic search both enforce tenant membership and a current explicit read grant in PostgreSQL. The same non-disclosing denial is returned for missing, cross-tenant and revoked audio.
- Python retrieval verifies identity and checks the grant in SQL before loading transcript, JSONB or embeddings. No per-user application cache is maintained, so revocation applies on the next read.
- Operator-only grant_read and revoke_read functions are not exposed by HTTP; migrated audio defaults to the unassigned tenant with no grants. assign_tenant allows one-time assignment for those legacy records.
- Unauthorized reuse of an idempotency key cannot return a job ID.

## Reproduce

Apply the new SQL migration at dotnet-outbox/sql/004_audio_acl.sql to the disposable reliable_jobs database, after migrations 001–003. Generate a new random secret locally and share DEMO_AUTH_SECRET between the .NET API and the trusted Python issuer/search worker. Never commit the secret.

Start the .NET API with ConnectionStrings__Jobs configured, then run architecture/live_audio_smoke.py with JOBS_TEST_CONNECTION and DEMO_AUTH_SECRET. The smoke checks authenticated upload, no unauthenticated result access, actual local Whisper inference, tenant-authorized retrieval, and immediate denial of subsequent reads after grant revocation.

For a local trusted manual request, issue_token from architecture/audio_access.py mints a token. Pass it through the DEMO_AUTH_TOKEN environment variable to the Python search CLI; do not place tokens on the process command line or in URLs.

## Known limits

This demonstration uses custom short-lived HMAC tokens, not production OIDC/JWT identity federation. The demo PostgreSQL user is a privileged account; someone who can use those credentials can bypass application ACL checks. The example does not configure PostgreSQL RLS or restricted DB roles, a public identity provider, audited grant management, key rotation, tenant quotas, retention, or encrypted storage. Revocation takes effect on the next retrieval query, not against a query already in progress. The legacy public text-job API remains outside this audio-specific protection.

For real enterprise use, authenticate with OIDC, separate SQL roles, enforce database-level RLS or vetted stored procedures, audit permission changes, rotate keys, and test caches and in-flight revocation.

## Verification status — 2026-11-07

Verified on the isolated `reliable_jobs` PostgreSQL 16 database after migration
`004_audio_acl.sql`: both `jobs.tenant_id` and `audio_read_grants` exist.

- **11/11 focused Python tests passed** (3 signed identity and tenant/revoke
  tests, 8 real PostgreSQL worker/concurrency tests). Cross-tenant and
  unauthorized principals are denied *before* source vectors are loaded.
- **Authenticated HTTP + local Whisper/ONNX + PostgreSQL search smoke passed**.
  It confirmed: authorized WAV submission and idempotent replay; unauthenticated
  and other-tenant HTTP result denial; non-owner idempotency-key reuse yields
  409; real audio inference; and an authorized timestamped source result.
  Revoking the owner grant then caused both subsequent HTTP result reads and
  semantic search to deny access.
- Full regression: **25/25 Python architecture tests**, **20/20 standalone
  document RAG tests**, and **12/12 .NET tests** passed. One existing
  Starlette TestClient deprecation warning was reported.

These checks use synthetic audio and disposable demo credentials; they do not
prove production security, DB-role isolation, traffic capacity, or protection
against privileged database access.

## Standalone document RAG

The [document RAG](../python-ai/rag-docs/README.md) reuses the signed-identity verifier, but uses a trusted per-source JSON ACL manifest instead of PostgreSQL grants. Its /ask route verifies identity and current policy before cosine scoring and Ollama context construction. Revocation without restart is verified by FastAPI tests. This does not implement OIDC, database RLS or tenant-isolated vector storage.
