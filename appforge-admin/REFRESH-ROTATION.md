# Refresh-token rotation: reproduced defect and correction

2026-11-24. Public baseline f43d0a2; AppForge generator baseline 0b60333f.

## Invariant

One unexpired, unrevoked refresh token may produce at most one successor session. Consuming the old token and inserting the successor must commit together. A failed insert must not burn the old token. A replay must not reactivate it.

The previous AuthTokenService.RefreshAsync read the session, checked expiry and revocation in memory, then saved revocation and the new session without a concurrency predicate. Two EF contexts could read the same active session and both issue successors.

## Reproducible service-level experiment

[Integration harness](tests/RefreshRotation/Program.cs) invokes the actual generated AuthTokenService with separate EF Core contexts and PostgreSQL 16. A DbCommandInterceptor waits for both session SELECT statements to execute before allowing either request to continue. The database is disposable and created from the generated EF model (EnsureCreated, not a migration or HTTP acceptance test).

| Observation | Before | After |
| --- | ---: | ---: |
| Readers synchronized | 2 | 2 |
| Successful rotations | 2 | 1 |
| Active sessions | 2 | 1 |

Additional assertions after correction: old access token revoked; original refresh replay rejected; successor access accepted; injected SaveChanges failure rolls back the conditional consumption; retry succeeds; exactly one active session remains.

Both builds: zero warnings/errors. Baseline run 34.69 s; corrected run 40.85 s, including builds and disposable DB startup. These are test durations, not performance measurements.

## Fix

Read the session without EF change tracking, then conditionally consume it using ExecuteUpdateAsync under ReadCommitted. The UPDATE predicate includes session ID, hash, revocation and expiry. PostgreSQL rechecks the predicate after a competing row update commits. Issue and return the new session only when the affected row count is one and the transaction commits. No migration or new dependency is needed.

The upstream AppForge template was fixed in b159c2fa. Two production model fixtures (role-only and staff-position auth) were rendered and passed focused source-generation assertions. The demo copy contains the equivalent scoped correction, not a full regeneration with a newer generator.

## Reproduce

From the demo root, with .NET 10 SDK and cached postgres:16:

```sh
dotnet build appforge-admin/tests/RefreshRotation/RefreshRotation.csproj
python3 -B appforge-admin/tests/run-refresh-rotation.py
```

For nested RDC, set APPFORGE_TEST_NETWORK_CONTAINER=rdc-project. The launcher creates and removes a random-name disposable PostgreSQL container and uses loopback only. The historical --baseline argument expects the defect and is only for running the harness against the previous implementation.

This establishes the concurrent rotation invariant and rollback behavior for the tested PostgreSQL service path; it does not establish production IAM, HTTP authentication acceptance, session-family compromise handling or load behavior. No existing application database was changed.
