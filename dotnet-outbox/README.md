# Reliable Jobs — C# / ASP.NET Core / PostgreSQL outbox

**Independent, original portfolio example.** No source code, architecture diagrams, credentials or business data from X5, CASESTUDIO or their customers is included.

A small runnable demonstration of the engineering concepts behind robust async business operations: **REST API, PostgreSQL transactions, idempotent ingestion, durable outbox, competing consumers via SKIP LOCKED, bounded retry and deterministic handler**.

## The invariant

A POST creates a job **and** its outbox event in one transaction. If that transaction fails, neither remains. Reusing the same idempotency key and payload returns the existing job ID; reusing the key with a different payload returns **409 Conflict**.

A background worker claims an event with `FOR UPDATE SKIP LOCKED` (several workers can compete) and commits the application result **in the same DB transaction** as the processed marker. A crashed worker releases its row lock and another worker can process it. Thus **the example's database result** is idempotent; the design does **not** claim exactly-once external delivery.

```text
POST /jobs + Idempotency-Key
    |
    +-- PostgreSQL transaction --+
    |  INSERT jobs               |
    |  INSERT outbox             |
    +----------------------------+
                 |
       worker(s): SELECT ... FOR UPDATE SKIP LOCKED
                 |
       deterministic Process(text)
                 |
       UPDATE jobs + mark outbox in one transaction
                 |
          GET /jobs/{id}
```

## Run locally

Requires .NET 10 SDK and Docker. PostgreSQL uses **demo-only credentials** bound to localhost.

```bash
docker compose up -d
export ConnectionStrings__Jobs='Host=127.0.0.1;Port=55432;Database=reliable_jobs;Username=demo;Password=demo'
dotnet run --project src/ReliableJobs.csproj --urls http://127.0.0.1:5077
```

Then in another terminal:

```bash
curl -i -X POST http://127.0.0.1:5077/jobs \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: sample-report-001' \
  -d '{"text":"alpha beta gamma"}'
# Note the returned ID.
curl -i http://127.0.0.1:5077/jobs/REPLACE-WITH-ID

# Same key + same text -> 200, same job ID; no new event.
# Same key + different text -> 409; no new event.
```

Run unit tests and, **with the API + PostgreSQL running**, the optional concurrent end-to-end smoke test:

```bash
dotnet test tests/ReliableJobs.Tests.csproj
python3 tests/smoke.py
```

The smoke test sends 20 concurrent identical requests and verifies one shared job ID, 409 for conflicting payload and the committed worker result. It was not executed in the original authoring session because the demonstration database was not running.

## Design notes, trade-offs, and limitations

- **Idempotency:** unique constraint in PostgreSQL, not check-then-insert (which races).
- **Durability:** the jobs row and event are written transactionally; worker uses row-level locks and commit. No Redis or in-memory event queue for correctness.
- **Retry:** backoff is bounded; the example marks a job failed after five *handler* failures, retaining the outbox record for diagnosis. DB connection failures rely on the next poll without consuming attempts.
- **Security:** intentionally **not** production-ready: no user authentication, authorization, per-tenant isolation, HTTPS termination, quotas, secrets manager, input privacy policy or data retention. Do not deploy it to the public Internet.
- **Operational concerns not implemented:** jitter, metrics/tracing, alerting on dead-letter jobs, cleanup/archival, external idempotent consumers, end-to-end integration/load tests, migration orchestration. These are intentional extension points, not features claimed as implemented.
- **Product semantics:** the demo computes a word count and SHA-256 digest to make effects deterministic and verifiable. No proprietary signing or financial processing logic is present.

**Why this is in the portfolio:** a recruiter or tech lead can read the transaction boundary, duplicate-key behavior and failure assumptions directly in working C# and SQL code. This is an illustrative implementation, not a copy of any employer's product.
