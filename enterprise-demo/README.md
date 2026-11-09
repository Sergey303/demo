# Enterprise AI — real WAV + documents → protected source evidence

**Status:** bounded local **EP-02 audio**, **EP-03 document** and **EP-04 unified authorized search** verified against disposable PostgreSQL and real local models. Longer-running resource reliability and production IAM are not established. The same page serves real WAV and UTF-8 document ingestion through a shared `jobs`/`outbox`/lease worker, unlike the separate text [Hiring Demo](../hiring-demo/README.md). See [EP-04 real cross-modal browser evidence](EVIDENCE-2026-11-09-SEARCH.md), [EP-02 WAV evidence](EVIDENCE-2026-11-08.md) and [EP-03 document evidence](EVIDENCE-2026-11-09.md).

[![Real Chromium evidence for one question across WAV and Markdown](media/enterprise-search-real.png)](EVIDENCE-2026-11-09-SEARCH.md)

[**Watch unified search E2E (MP4)**](media/enterprise-search-real.mp4) · [Watch real audio E2E (MP4)](media/enterprise-ai-real-whisper.mp4) · [Watch real document E2E (MP4)](media/enterprise-document-live.mp4) · [Document screenshot](media/enterprise-document-live.png)

## User journey

Open `http://127.0.0.1:4173/dashboard/enterprise-ai`. Choose a **small local WAV** (44–262,144 bytes), submit it and observe an actual `202 Accepted` and UUID. A separately running Python worker takes the job from PostgreSQL, runs local Whisper/ONNX inference and stores a timestamped transcript. The page polls the real `GET /jobs/{id}`, showing `queued`, `done` or `failed`; no "processing" state is invented. Repeating the same file and key should return `200 already-accepted` with the **same UUID**. The API now **removes embedding vectors** from authorized `GET /jobs/{id}` responses for both WAV and document jobs, retaining them only in PostgreSQL for later search.

**Security boundary:** The browser connects only to the localhost Vite `/enterprise-api` reverse proxy; it **does not** receive or generate the bearer token. On every proxied request Vite creates a 5-minute HMAC-signed demo identity for the *fixed* `tenant=demo-team, sub=interviewer` using the server-side `DEMO_AUTH_SECRET`, overwriting any browser-supplied Authorization. If secret is missing/short, the enterprise proxy fails with 503. This grants **every browser able to reach the Vite server** the same fixed demo identity: use on **trusted localhost only**, never expose it or use with real sensitive data. This is **not login, OIDC or per-user production authorization**. The existing `/demo-api` proxy remains unchanged.

### Document ingestion — EP-03

On the same page, upload a real UTF-8 `.txt` or `.md` document (1 byte–24 KiB, simple ASCII filename). `POST /document-jobs` returns 202 after atomically saving source text, filename, tenant grant and outbox event; the **same Python worker** creates local BGE-small ONNX chunk embeddings and the browser reads stored evidence with source and character ranges. Same-file/key retry returns 200, different content with the same key 409, and revoked/wrong-tenant reads return 404. See the [actual document video, screenshot, PostgreSQL and E2E proof](EVIDENCE-2026-11-09.md). No PDF/OCR, LLM or production IAM is implied; the separate EP-04 section below documents the implemented unified search.

### Unified authorized evidence retrieval — EP-04

After uploading WAV and/or documents, ask a question in the **same page**. A localhost-only search API on `127.0.0.1:5088` receives only the short-lived signed principal minted by Vite; body contains only `question` and bounded `top_k`. Its **MATERIALIZED SQL authorization** filters tenant + current `audio_read_grants` before flattening stored JSONB segments, then one cached BGE-small encoder and exact cosine return at most five **authorized** source snippets (audio timestamps or document character ranges). Cross-tenant, revoked, missing-token and no-evidence cases are tested. **No generated answer or LLM claim.** See [real browser screencast, screenshot, SQL security tests and reproduction](EVIDENCE-2026-11-09-SEARCH.md).

## Prerequisites

- A disposable `reliable_jobs` PostgreSQL database, with all five migrations `dotnet-outbox/sql/001_init.sql` → `005_document_jobs.sql`. Compose initializes **only 001 on a new volume**. The launcher checks schema read-only and **never** creates, alters or drops a DB.
- .NET 10 SDK; Node version supported by `bootstrap5/package.json`; Python with dependencies from `architecture/audio-requirements.txt`. Real inference also needs FFmpeg and cached `faster-whisper` + `fastembed` weights. The launcher never installs dependencies or downloads weights itself; **the underlying inference libraries may download model weights on first processing if they are not already cached**, so pre-warm/cache them deliberately if disk or networking is restricted.
- A secret of at least 32 UTF-8 bytes, shared by API and Vite. Set it **in the terminal**, not in `.env` committed files or any `VITE_*` frontend variable.

### One-time isolated DB setup (manual)

At the repo root, on the machine that has Docker:

```bash
docker compose -p demo-outbox -f dotnet-outbox/compose.yaml up -d --wait
# Use this only on the isolated demo DB; 001 is initialized by Compose for NEW volumes.
for migration in 002_audio_jobs.sql 003_audio_leases.sql 004_audio_acl.sql 005_document_jobs.sql; do
  docker exec -i demo-outbox-postgres-1 psql -v ON_ERROR_STOP=1 -U demo -d reliable_jobs < "dotnet-outbox/sql/$migration"
done
```

Running the migrations again on a pre-existing demo DB is safe if they were already applied. Do **not** send these commands to ChatPilot, AccountManager or another developer database. Check available free disk space before `docker`, `npm ci`, or model downloads.

### Dependencies and start

From the repository root on a machine that can reach the disposable PostgreSQL container:

```bash
python3 -m pip install -r architecture/audio-requirements.txt
cd bootstrap5 && npm ci && cd ..
export ConnectionStrings__Jobs='Host=127.0.0.1;Port=55432;Database=reliable_jobs;Username=demo;Password=demo'
export JOBS_TEST_CONNECTION='host=127.0.0.1 port=55432 dbname=reliable_jobs user=demo password=demo'
export DEMO_AUTH_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
python3 enterprise-demo/run.py
```

**RDC/network variant:** If PostgreSQL is reachable inside the trusted `knowledge-pilot-dev` Docker network, change the host in both DSNs to `demo-outbox-postgres` and port to `5432`. .NET needs **Npgsql semicolon syntax**; Python `psycopg` needs **libpq space-separated syntax**. Set the same secret in the single launcher environment (its children inherit it). Do not print or record the secret.

The launcher starts and supervises exactly **its own** four services: .NET API (`127.0.0.1:5077`), shared Python media worker, Python authorized search API (`127.0.0.1:5088`) and React Vite (`127.0.0.1:4173`); it terminates only its child process groups on exit. It fails for missing dependencies, mismatched database schema, occupied ports, or dead children. **Both `/ready` endpoints establish only database connectivity**, not Whisper/ONNX model readiness, semantic relevance or production availability. A real finished ingestion plus cross-source search is the model-backed acceptance test.

### Produce a new, not preprocessed, WAV

If FFmpeg was built with the `flite` lavfi filter, synthesize a short reproducible original sample:

```bash
ffmpeg -y -f lavfi -i "flite=text='Customers can request a refund within thirty days':voice=slt" \
  -ar 16000 -ac 1 -c:a pcm_s16le /tmp/enterprise-sample.wav
stat -c '%s bytes' /tmp/enterprise-sample.wav   # must be 44..262144
```

Select the resulting WAV in the browser; do not pre-run the worker on it. The first inference may cause faster-whisper/fastembed to download missing model weights; review cache, disk space and network access before submitting. CPU inference may take time. No vendor API or cloud credential is required. If local model weights are missing and downloading is not acceptable, the UI can demonstrate actual durable acceptance, but **not** claim completed inference.

## Local verification (separate evidence levels)

```bash
node --test bootstrap5/tests/enterprise-auth.test.mjs       # signed identity contract, no DB
python3 -m unittest discover -s enterprise-demo/tests -v # launcher static tests, no DB
python3 -m py_compile enterprise-demo/run.py                # syntax
cd bootstrap5 && npm run check && npm run check:e2e       # TypeScript
npx playwright test tests/enterprise-ai.spec.ts            # stubbed browser contract ONLY
```

### Initial source/contract verification — 2026-11-08 (before model-backed acceptance)

On `rdc-project` from an isolated worktree based on `main` @ `5e0192ab39954435580c490dfcd08a139df3b24e`:

- **PASS:** `npm run check`, `npm run check:e2e`, `npm run build`, targeted ESLint of `EnterpriseAiPage.tsx`.
- **PASS:** 2 Chromium browser-contract tests for the new page (HTTP stubs, including retry and revoked 404); 1 original Hiring Demo browser-contract regression test.
- **PASS:** 5 Python launcher/cross-language token tests, 2 Node signer tests, `py_compile`, and `git diff --check`.
- **PASS:** standalone real Vite proxy without `DEMO_AUTH_SECRET` returned HTTP **503** on `/enterprise-api/ready`.
- **Known baseline:** broad `npm run lint` fails on existing `HiringDemoPage.tsx:57` with `react-hooks/set-state-in-effect`, which predated this slice. New page passes targeted ESLint.
- **Not performed in the initial coding step:** live browser→PostgreSQL→Whisper because system Python lacked `psycopg`, `faster_whisper`, `fastembed`. A separate pre-existing Python virtual environment with these dependencies was later located and reused.

### Actual model-backed acceptance and limits

**Two successful real browser/Whisper runs**, eight passing PostgreSQL worker resilience tests, saved [video/screenshot](EVIDENCE-2026-11-08.md), including idempotency and revocation after genuine inference. These demonstrate the *bounded local WAV slice* and do not prove workload scalability, general speech accuracy, uptime or production readiness. A later third browser attempt encountered an .NET `Out of memory` exit after long-running high-pressure RDC operation; the launcher correctly reported service failure. See the full [evidence and reproduction instructions](EVIDENCE-2026-11-08.md) and [contract baseline](../architecture/enterprise-platform/contracts.md). **EP-03 is now verified for a bounded synthetic text document**, with real browser→.NET→PostgreSQL→Python ONNX processing and audio regression ([evidence](EVIDENCE-2026-11-09.md)). Unified authorized retrieval (EP-04) is now live-verified on synthetic sources ([evidence](EVIDENCE-2026-11-09-SEARCH.md)); grounded natural-language answer/LLM/agent work remains **EP-05–EP-06 future work**.
