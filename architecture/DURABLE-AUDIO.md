# Durable audio to searchable evidence — executable extension

**Architecture evidence, not a production service.** This is a small runnable
extension to the existing .NET 10 / PostgreSQL outbox and Python AI demos.
It improves on [`evidence_flow.py`](evidence_flow.py): a bounded WAV is accepted
and committed **before** Whisper inference. It uses the original PostgreSQL
job/outbox transaction, rather than adding a second queue or broker.

## What is implemented

1. `POST /audio-jobs` accepts `{ "filename": "clip.wav", "wavBase64": "..." }`
   plus one `Idempotency-Key`. It validates a small RIFF/WAVE file (up to 256 KiB),
   inserts `kind='audio'`, audio bytes and an outbox event in one transaction,
   then returns HTTP 202. Same key/file/hash returns the original ID (200).
2. The existing [C# outbox worker](../dotnet-outbox/src/OutboxWorker.cs) claims
   only `kind='text'`. The separate [Python worker](audio_worker.py) claims only
   `kind='audio'` using `FOR UPDATE SKIP LOCKED`.
3. Inside one PostgreSQL transaction, the Python worker runs the local
   faster-whisper model, creates timestamped transcript passages and BGE-small
   embeddings, writes them into the `jobs.result` JSONB, and marks the event
   processed. A worker crash before commit rolls back the changes and lock.
4. `audio_worker.py search JOB_ID 'refund period'` reads **persisted vectors**
   and embeds only the query. A [live smoke](live_audio_smoke.py) generates
   original synthetic speech, submits twice, runs worker, verifies the durable
   result, then searches the saved vectors.

## Reproducible runbook (disposable demo DB only)

A pre-existing Compose database was initialized with `001_init.sql`; Docker
will **not** rerun initialization files when a database volume already exists.
Run migration `002_audio_jobs.sql` **before starting the updated .NET worker**.
On the Windows Docker host from `D:\projects\ChatPilotGroup\demo\dotnet-outbox`:

```powershell
docker compose -p demo-outbox up -d --wait
Get-Content -Raw .\sql\002_audio_jobs.sql | docker exec -i demo-outbox-postgres-1 psql -U demo -d reliable_jobs
```

Then in RDC, from the repository root:

```bash
python -m pip install -r architecture/audio-requirements.txt
export JOBS_TEST_CONNECTION='host=demo-outbox-postgres port=5432 dbname=reliable_jobs user=demo password=demo'
cd dotnet-outbox
export ConnectionStrings__Jobs='Host=demo-outbox-postgres;Port=5432;Database=reliable_jobs;Username=demo;Password=demo'
dotnet run --project src/ReliableJobs.csproj --urls http://127.0.0.1:5077
```

In a second RDC terminal:

```bash
cd /workspace/demo-architect-p1
export JOBS_TEST_CONNECTION='host=demo-outbox-postgres port=5432 dbname=reliable_jobs user=demo password=demo'
python architecture/live_audio_smoke.py
python -m pytest -q architecture/tests
```

**Important:** `ConnectionStrings__Jobs` uses **Npgsql semicolon syntax**;
`JOBS_TEST_CONNECTION` for Python uses **libpq space-separated syntax**.
For the older C# PostgreSQL xUnit suite, `JOBS_TEST_CONNECTION` should instead
use Npgsql syntax. Run the suites separately or set the variable accordingly.

## Architecture boundaries and honest limitations

- The initial API is unauthenticated and restricted to local demo deployment.
  RIFF/WAVE magic and byte-size checks are **not** a full codec/security audit.
- Python holds a PostgreSQL transaction and row lock throughout CPU inference.
  This demonstrates atomicity but causes long locks, connection usage and poor
  scalability. Production needs leases/heartbeats, object storage, transaction
  boundaries around state transitions, worker isolation and backpressure.
- Only one short WAV is accepted per task; results and audio bytes remain in the
  same database without retention, deletion, access controls or PII filtering.
- Query search is a local CLI, not a multi-tenant authenticated retrieval API.
- A failure of handler inference consumes a bounded retry; connection and SQL
  faults roll back. [Optional real PostgreSQL tests](tests/test_audio_postgres.py)
  exercise rollback/claim and terminal retries when the database is available.
- Unit/contract tests do **not** prove a process-kill recovery. A chaos test
  that terminates the worker inside the transaction remains outstanding.

**Verification status:** compilation and unit/contract tests can pass without
PostgreSQL. The Python worker's actual PostgreSQL and model-backed live E2E
must be reported separately; see the 2026-11-07 verification record below.

### Observed real-model check (2026-11-06)

Using a generated FFmpeg/Flite WAV (80,878 bytes), the new
`process_audio(...)` path ran actual CPU `faster-whisper` and `fastembed`
models, produced **one passage** (`0.0–2.56 s`, 384-dimensional vector), and
`search_result(...)` found the correct timestamped source for a refund query
(cosine **0.807466**). This validates local inference/vector serialization
and retrieval *without* PostgreSQL. It does not prove queued transaction
recovery, query relevance on real speech or workload capacity.

## Verification record — 2026-11-07

Verified against the isolated `demo-outbox-postgres` PostgreSQL 16 database
with migration `002_audio_jobs.sql` applied:

- Database schema check confirmed all three new columns (`kind`,
  `audio_payload`, `audio_name`).
- **16/16 Python tests passed** including the two real PostgreSQL cases:
  rollback and re-claim after a row lock, plus five handler failures leading
  to terminal `failed`.
- **10/10 .NET tests passed**, including the existing PostgreSQL concurrency
  tests; .NET built without warnings or errors.
- **Live end-to-end smoke passed** using a locally synthesized WAV:
  `POST /audio-jobs` returned 202; repeat with identical key returned the
  existing job (200); the Python worker ran real local Whisper + ONNX models
  and committed `done` with timestamped evidence and embeddings in PostgreSQL.
  Retrieval from persisted vectors returned `sample.wav` at **0.0–3.0 s**,
  text `Customers can request a refund within 30 days.`, cosine **0.804107**.
  The smoke independently verified the stored media SHA-256.

This is a tiny synthetic single-speaker sample; it cannot establish
production ASR relevance, latency SLOs, capacity or security guarantees.
**Still open:** actual OS-level termination of the worker after locking a
row but before commit; DB disconnection during model inference; behavior
under multiple active AI workers and tenant-level authorization. The database
rollback/reclaim test validates the primitive, not process-crash recovery.
