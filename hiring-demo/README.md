# Hiring demo: real .NET outbox from the React dashboard

**Audience:** .NET Tech Lead, Solution Architect, System Architect. A reviewer can
see a real request, PostgreSQL-backed result, idempotent retry, 409 conflict and
process restart without reading the whole monorepo. This is a local engineering
demonstration, **not a production deployment**.

## One-command launch (after one-time prerequisites)

The application is bound to localhost. Use only the isolated, disposable
`reliable_jobs` demonstration PostgreSQL; **never set a production connection string**.

One-time setup:

1. Install .NET 10 SDK, Node 22+, Docker and Python 3.12+.
2. In the repository's `bootstrap5/` directory run `npm ci`.
3. Start the isolated PostgreSQL database. On the Windows Docker host, from
   `demo/dotnet-outbox`, use
   `docker compose -p demo-outbox up -d --wait`. A fresh volume automatically
   initializes `001_init.sql`. If the volume already exists, its schema must
   have been migrated independently; the launcher does **not** modify schema.
4. Set the connection string in the terminal used to run this demo.
   - RDC Ubuntu connected to the `knowledge-pilot-dev` network:
     `export ConnectionStrings__Jobs='Host=demo-outbox-postgres;Port=5432;Database=reliable_jobs;Username=demo;Password=demo'`
   - Docker host running the same demo database locally:
     `export ConnectionStrings__Jobs='Host=127.0.0.1;Port=55432;Database=reliable_jobs;Username=demo;Password=demo'`
   These are deliberately disposable example credentials.

**Start both services with one command**, at the repository root:

```bash
python3 hiring-demo/run.py
```

The launcher starts the real ASP.NET Core Jobs API on
`127.0.0.1:5077`, waits for a successful `GET /ready` (including
PostgreSQL), then starts the existing React/Vite application on
`127.0.0.1:4173`. If a dependency fails, it stops its child processes and
prints a failure rather than simulating a successful demonstration. No Docker
socket, extra service or cloud account is needed in the RDC terminal once the
disposable database is already running.

Open **http://127.0.0.1:4173/dashboard/hiring-demo** in a browser on the
same machine. Remote browsers need an explicit, trusted local port forward; the
launcher never exposes the API on external interfaces.

## Two-minute interview walkthrough

| At | Action | What the reviewer should actually observe |
| --- | --- | --- |
| 00:00 | Open the hiring demo page | API + PostgreSQL `ready` is green; a red indicator means the demo is **not** ready |
| 00:15 | Press **POST /jobs** | Real `202 Accepted`, UUID, and queued status |
| 00:30 | Wait for `done` or click refresh | Real persisted result containing word count and SHA-256 |
| 00:45 | Repeat with same key and same text | `200 already-accepted`, **same** UUID |
| 01:00 | Press different payload with same key | `409 Conflict`, **no second job** |
| 01:15 | In launcher terminal enter `r` | Real API process stops; readiness goes red, React page stays up |
| 01:30 | Let launcher restart the API | `GET /ready` becomes green when PostgreSQL is reachable |
| 01:45 | Repeat same request, refresh result | Same UUID and stored result survive the API restart |

**Fault boundary:** this deliberately restarts the **whole API process**, whose
worker is an in-process hosted service. It is *not* an independent worker-crash
experiment, a database outage, or a proof of exactly-once external side effects.
To show a new submission after recovery, use **Новый сценарий** to generate a
fresh idempotency key.

The browser's journal is a local display of real HTTP results and client-side
request timing. It is not distributed tracing or authoritative server telemetry.
It never manufactures a job ID or job result. The demo uses the existing text
job endpoint intentionally; authenticated WAV ingestion, Whisper and the RAG
assistant remain separate demos.

## Correctness and security boundaries

- `Idempotency-Key` is generated once per scenario and reused during retries.
  A changed payload is rejected by the existing PostgreSQL-backed API.
- API reads and writes use Vite's localhost-only `/demo-api` proxy to
  `http://127.0.0.1:5077`. Browser code has no embedded credentials.
- Neither the launcher nor the UI attempts to repair the database, change
  privileges, kill other developers' processes or simulate successful API
  responses. The launcher stops only the child processes **it started**.
- Do not deploy the text-jobs endpoint publicly; it intentionally has no
  production user authentication, quotas or rate limiting.

## Verification

Static launcher tests (no database or .NET process needed):

```bash
python3 -m unittest discover -s hiring-demo/tests -v
```

Frontend typecheck/build (requires one-time `npm ci`):

```bash
cd bootstrap5
npm run build
```

Live check (requires the isolated database and the full launcher):

```bash
curl -i http://127.0.0.1:5077/ready
# The React page calls /demo-api/jobs via Vite proxy.
```

The repository already contains a separate concurrent outbox check at
[`dotnet-outbox/tests/smoke.py`](../dotnet-outbox/tests/smoke.py).
Run it against the same local demo API to verify twenty concurrent duplicate
submissions, one persisted job ID, conflict handling and worker completion.

## Recording the actual walkthrough

The eight steps above form a roughly two-minute screencast. On a machine where
a graphical recorder is available, record the **real browser and launcher
terminal**, not a mocked animation. Preserve the API-down interval and the same
job UUID before and after restart. Do not attach a video or claim a recording
was verified until it has actually been captured and reviewed.

## Source map for the interviewer

- [React page](../bootstrap5/src/pages/HiringDemoPage.tsx) — live browser flow
- [Launcher](run.py) — processes, readiness and restart
- [.NET HTTP transactions](../dotnet-outbox/src/Program.cs) — durable job API
- [Outbox worker](../dotnet-outbox/src/OutboxWorker.cs) — recovery and processing
- [Database schema](../dotnet-outbox/sql/001_init.sql) — constraints
- [Actual concurrency test](../dotnet-outbox/tests/smoke.py) — verification

This is the quickest tour of the core reliability engineering evidence in the
portfolio; see [the full architecture case](../architecture/README.md) for
target components that are **not** yet deployed as a single product.
