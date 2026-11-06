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

Requires .NET 10 SDK and Docker. PostgreSQL uses **demo-only credentials** bound to localhost on the host; inside the shared development Docker network it is reachable as `demo-outbox-postgres`. This service uses its own Compose project and database, never ChatPilot tables.

```bash
docker compose up -d
export ConnectionStrings__Jobs='Host=127.0.0.1;Port=55432;Database=reliable_jobs;Username=demo;Password=demo'
dotnet run --project src/ReliableJobs.csproj --urls http://127.0.0.1:5077
```

Liveness is `GET /health` (process only); readiness is `GET /ready` (runs a short PostgreSQL query and returns HTTP 503 when the DB is unavailable). A healthy HTTP process alone does not prove durable job processing is operational.

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
dotnet test tests/ReliableJobs.Tests.csproj --filter "Category!=PostgreSQL"
python3 tests/smoke.py
```

The smoke test sends 20 concurrent identical requests and verifies one shared job ID, 409 for conflicting payload and the committed worker result. **Verified on 2026-11-05** with the isolated PostgreSQL 16.15 container and actual HTTP worker, after the infrastructure-versus-handler error-boundary change.

## Design notes, trade-offs, and limitations

- **Idempotency:** unique constraint in PostgreSQL, not check-then-insert (which races).
- **Durability:** the jobs row and event are written transactionally; worker uses row-level locks and commit. No Redis or in-memory event queue for correctness.
- **Throughput:** workers drain ready rows without an artificial 500 ms delay between successful claims; they sleep only while idle or after a polling error. This eliminates a per-worker polling throttle, but **no throughput benchmark or scale claim** is implied.
- **Retry:** backoff is bounded; the example marks a job failed after five *handler* failures, retaining the outbox record for diagnosis. Only `JobLogic.Process` failures enter the handler-retry branch. SQL/read/update/commit failures escape to the polling loop and roll back the claim instead of consuming handler attempts. The updated code compiled and passed PostgreSQL primitive integration checks plus end-to-end HTTP smoke on 2026-11-05. Targeted fault injection of DB failure during an in-flight transaction and handler-failure exhaustion remains untested.
- **Security:** intentionally **not** production-ready: no user authentication, authorization, per-tenant isolation, HTTPS termination, quotas, secrets manager, input privacy policy or data retention. Do not deploy it to the public Internet.
- **Operational concerns not implemented:** jitter, metrics/tracing, alerting on dead-letter jobs, cleanup/archival, external idempotent consumers, end-to-end integration/load tests, migration orchestration. These are intentional extension points, not features claimed as implemented.
- **Product semantics:** the demo computes a word count and SHA-256 digest to make effects deterministic and verifiable. No proprietary signing or financial processing logic is present.

**Why this is in the portfolio:** a recruiter or tech lead can read the transaction boundary, duplicate-key behavior and failure assumptions directly in working C# and SQL code. This is an illustrative implementation, not a copy of any employer's product.

## Real PostgreSQL concurrency checks

The xUnit project contains **opt-in database integration scenarios** that use unique, disposable tables to exercise actual PostgreSQL behavior:

- two transactions claim different rows with `FOR UPDATE SKIP LOCKED`; the rolled-back claim is available again;
- twenty concurrent inserts with the same unique key produce exactly one winning insert.

They validate important database primitives, not an end-to-end crash of the full API process. Run against a **disposable development database**, never production:

```bash
export JOBS_TEST_CONNECTION='Host=127.0.0.1;Port=55432;Database=reliable_jobs;Username=demo;Password=demo'
dotnet test tests/ReliableJobs.Tests.csproj --filter "Category=PostgreSQL"
```

Without `JOBS_TEST_CONNECTION`, this explicitly selected integration suite **fails fast** instead of silently passing; a green unit-test run is not evidence of integration coverage. The API-level concurrent request check remains `tests/smoke.py` and requires the service to be running.

## Running integration tests from the RDC workstation

The RDC container is connected to the external Docker network `knowledge-pilot-dev` but does **not** have a Docker socket. Run the following once **on the Docker host** (Windows PowerShell):

```powershell
cd D:\projects\ChatPilotGroup\demo\dotnet-outbox
docker compose -p demo-outbox up -d --wait
```

The Compose service joins `knowledge-pilot-dev` under the isolated DNS name `demo-outbox-postgres` and retains a host-only `127.0.0.1:55432` port binding. From **rdc-project**:

```bash
cd /workspace/demo/dotnet-outbox
export JOBS_TEST_CONNECTION='Host=demo-outbox-postgres;Port=5432;Database=reliable_jobs;Username=demo;Password=demo'
dotnet test tests/ReliableJobs.Tests.csproj --filter 'Category=PostgreSQL'
```

The database is intentionally disposable; never reuse the ChatPilot main database or its secrets. `docker compose -p demo-outbox down -v` on the host destroys this demo-only database.

## End-to-end benchmark (disposable local DB)

`python3 tests/benchmark.py --count 100 --concurrency 10` submits **distinct** jobs, verifies their SHA-256 results, and measures accepted/completed throughput and p50/p95/p99 HTTP submission latency. These figures are specific to the local machine, test payload and polling implementation; they are **not** production capacity guarantees. Run against the separately isolated demo database only.

## Verified local end-to-end run (2026-11-05)

On the isolated `demo-outbox-postgres` PostgreSQL 16.15 database, after the outbox error-boundary change:

- **10/10** xUnit tests passed, including **2 real PostgreSQL integration scenarios** for `SKIP LOCKED` rollback/reclaim and unique-key contention; .NET build reported zero errors and warnings.
- `/ready` returned HTTP 200 when the database was connected.
- `python3 tests/smoke.py` **PASS**: 20 concurrent identical idempotency-key submissions, a 409 for different payload, and verified durable processed result.
- `python3 tests/benchmark.py --count 30 --concurrency 6` **PASS** with **30/30 verified results**. One local run: 440.58 accepted/s, 66.43 completed/s including polling, HTTP submission p50 **12.03 ms**, p95 **18.12 ms**, p99 **19.06 ms**. This is a tiny machine-dependent smoke/load probe, not a throughput or SLO guarantee.

**Not yet proven:** service-process crash injection between claim and commit, mid-transaction PostgreSQL disconnection, terminal handler-retry exhaustion, and external side-effect deduplication. These are distinct from testing PostgreSQL primitives and require dedicated failure-injection tests.

## Durable audio extension (opt-in)

See [Durable audio runbook](../architecture/DURABLE-AUDIO.md) for the required `002_audio_jobs.sql` migration, WAV-only API contract, Python `SKIP LOCKED` worker, model dependencies and separate DB connection-string syntax. **Apply migration before starting the updated C# worker.** The extension passed a separate live audio integration smoke on 2026-11-07; see the verification record in the linked runbook. It is not production ready.
