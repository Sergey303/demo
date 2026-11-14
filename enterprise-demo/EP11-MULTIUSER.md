# EP-11: trusted local multi-principal slice

Base: `5af1c4b3fbcf511766f2e4fae8c04665b07349c7`.
Development branch: `feature/ep11-multiuser-auth`. Published source branch: `feature/ep11-multiuser-published`. Implementation date: 2026-11-13.
The feature commit containing this record is the delivery revision; obtain it
with `git log -1 --format=%H -- enterprise-demo/EP11-MULTIUSER.md`.

## Implementation and evidence map

| Requirement | Concrete code / checks | Scope |
| --- | --- | --- |
| Immutable trusted profiles | `configuredPrincipal`, `demoAuthProfile`, `issueDemoToken` in `bootstrap5/enterpriseDemoAuth.mjs`; `enterprise-auth.test.mjs` | Default retained, invalid config fails closed, two actual Vite proxies overwrite forged caller Authorization/query/cookies |
| Verified read-only identity | `agent_identity`, `_principal`, no-store middleware in `architecture/search_api.py`; `test_agent_identity.py` | Only sanitized tenant/subject/kind, no DB/model dependency, no token issuing endpoint |
| Browser lifecycle | `AgentWorkflowCard.tsx`; `mcp-agent.spec.ts` | Read-only demo identity, checks before/after operations and on focus; old citations and proposals cleared on failure/change; async guards |
| Distinct SQL authorization | `test_multiuser_postgres.py`, `multiuser_mcp_fixture.py` | Shared real disposable PostgreSQL, real official MCP stdio subprocess per principal, scripted model and deterministic two-dimensional encoder |
| Revocation and writes | Same tests plus `test_mcp_agent_postgres.py` | Alice/Bob/cross-tenant context isolation; model-selected subject rejected; forged token; revoke before/during model; owner-bound approval; saved note hidden after revoke |
| EP-10 regression | `test_ai_gateway_postgres.py` | Existing untracked tests preserved, refund lexical overlap corrected; source/response/tool rejection |

`mcp_agent_host.bounded_execute` also normalizes expected policy/tool refusals
inside the stdio context, before AnyIO can wrap them during teardown. Transport
failures remain errors and the model semaphore still releases in `finally`.

No ACL, minimum score (`0.67`), fixed production MCP entrypoint, tool catalog,
source lock/recheck, or extractive default was changed. The test-only stdio
entrypoint substitutes only encoder initialization. It is selected by a pytest
monkeypatch, not an HTTP argument, model output, or production environment flag.

## Opt-in real browser two-profile demo

Use **only a newly created disposable PostgreSQL**. Apply migrations
`dotnet-outbox/sql/001_init.sql` through `006_agent_notes.sql`. Use a trusted
shell to set a fresh random `DEMO_AUTH_SECRET` of at least 32 UTF-8 bytes and
`JOBS_TEST_CONNECTION` to that database. The .NET API, when used for uploads,
needs `ConnectionStrings__Jobs` pointing to the same disposable database.
Never reuse shared databases or place secrets in `VITE_*` variables.

Start one backend, with local model/embedding dependencies already installed:

```bash
python -m uvicorn --app-dir architecture search_api:app --host 127.0.0.1 --port 5088
```

In two separate shells inheriting the same secret (repository root):

```bash
DEMO_PRINCIPAL_TENANT=ep11-team DEMO_PRINCIPAL_SUBJECT=alice \
  npm --prefix bootstrap5 run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

```bash
DEMO_PRINCIPAL_TENANT=ep11-team DEMO_PRINCIPAL_SUBJECT=bob \
  npm --prefix bootstrap5 run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

Open `/dashboard/enterprise-ai` on both ports. Confirm that the MCP cards show
`ep11-team / alice` and `ep11-team / bob`, explicitly marked demo identity, not
SSO. These ports are locally accessible by the same person; they do not prove
human authentication. There is no public user switcher.

Use the existing document ingestion path with a running .NET API/document worker
(see `enterprise-demo/README.md`) to create separate synthetic documents as each
profile. Use `Customers may request a refund within 30 days.` and ask
`When can customers request a refund?`. Each uploaded job is tenant/owner-bound.
Alternatively a trusted offline fixture may create completed synthetic jobs;
that demonstrates authorization, not ingestion or model quality.

From a trusted Python shell with `architecture` on `PYTHONPATH`, use
`audio_access.grant_read(dsn, job_id, 'ep11-team', 'bob')` to share Alice's source
with Bob, then `revoke_read` with the same arguments to withdraw that grant.
Both functions are offline administration, never public HTTP endpoints. Repeat
Bob's question after each change and verify citation IDs. A different tenant's
profile must see none of these sources (optionally start a third Vite process
with `DEMO_PRINCIPAL_TENANT=ep11-other DEMO_PRINCIPAL_SUBJECT=alice` on port 4175).
For notes: prepare as Alice, attempt
confirmation as Bob (denied), confirm as Alice, then revoke Alice's original
source grant and verify `/agent/notes/{job_id}` hides the saved note. Do not
expose approval capabilities in screenshots/logs. Stop the processes and delete
only the disposable resources created for this run.

Real Qwen/ONNX browser acceptance is opt-in and **not claimed by this delivery**.
No models were downloaded or run. Regex gates remain imperfect, valid citations
prove origins only, and revocation after final SQL check but before delivery is
a documented concurrency limit. Production OIDC, SSO, RLS, session management,
and general autonomous planning remain absent.

## Verification record

Results below describe the local development branch. Its proposed CI changes include
new deterministic HTTP and disposable DB/MCP suites, plus existing signer and
browser contracts. The published source branch intentionally retains the EP-10
workflow unchanged: the GitHub OAuth credential rejected a workflow-file update
without `workflow` scope. Consequently, new EP-11 test modules are NOT yet
selected by the published CI workflow. The initial local results predate publishing.

Local execution used PostgreSQL 16 from an already present Docker image, a
uniquely named `ep11-disposable-5af1c4b` container, new `ep11_disposable` database,
all six migrations, 192 MiB memory limit, and 12 database connections. No shared
or production DSN was used. Native `initdb` could not drop root privileges in
this environment. The remote Docker daemon's published loopback port was also
unreachable from the workspace; the successful tests used a local TCP relay
through `docker exec` to **only that newly created container**. No other
container or database was inspected. Python dependencies were installed in a
small repository-local venv; no ML packages, browser, or models were installed.

Commands (with `JOBS_TEST_CONNECTION` set only to that isolated DB):

```bash
node --test bootstrap5/tests/enterprise-auth.test.mjs
npm --prefix bootstrap5 run check
npm --prefix bootstrap5 run check:e2e
# From bootstrap5:
npx playwright test tests/mcp-agent.spec.ts --workers=1
# Using the repository-local venv's python:
python -m pytest -q \
  architecture/tests/test_agent_identity.py \
  architecture/tests/test_multiuser_postgres.py \
  architecture/tests/test_ai_gateway_postgres.py \
  architecture/tests/test_ai_gateway.py \
  architecture/tests/test_mcp_agent_postgres.py \
  architecture/tests/test_audio_access.py \
  architecture/tests/test_guarded_generation.py \
  architecture/tests/test_generation_postgres.py \
  architecture/tests/test_evidence_answer.py \
  architecture/tests/test_answer_postgres.py \
  architecture/tests/test_unified_search.py \
  architecture/tests/test_search_postgres.py
python3 scripts/check_hiring_review_links.py
git diff --check
```

Independent source review was performed twice. It found the stale identity on
401 and a two-sentence injection fixture that selected only benign evidence;
both were corrected. The final source review found no blocking issue. It did
not execute databases or claim separate live-model acceptance.

Intermediate negative results are retained here for clarity: the unreachable
Docker loopback run had 72 passes, 26 failures and 4 setup errors; the relay run
had 100 passes and 2 failures, exposing the stdio refusal-handling issue now
fixed. A subsequent run had 102 passes and one incorrect new test expectation:
a malformed bearer yields 401 before secret lookup, so the missing-signer test
was corrected to send a well-formed signed token. One browser rerun had 7 passes
and a page-load timeout before locating the MCP card; the cause was not
established. The complete final browser rerun passed all 9 tests in 26.8 seconds.
The signer/proxy suite passed all 4 tests, both TypeScript checks passed, and
the review-link validator passed. Final Python and cleanup status follow below.


**Final result: 103/103 selected Python tests PASS in 73.20 seconds, with no
skips; signer/real-proxy tests 4/4 PASS; Chromium HTTP contracts 9/9 PASS.**
[Captured summaries](EP11-TEST-RESULTS.txt) accompany the commands above.
The proxy suite also tests suffix paths matching Vite's prefix routing so
missing/invalid configuration cannot skip the auth prerequisite middleware.
Temporary test infrastructure is removed after verification; the original
untracked brief and `__pycache__` directories are preserved and excluded from
the commit. No remaining deterministic-test blocker is known. Live two-profile
Qwen/ONNX browser acceptance and production IAM remain explicitly unverified.

## Review fixes (2026-11-13)

Base SHA: `e65af53ef19bcb7704eb69df85f082eb8e0ef168`, branch
`feature/ep11-multiuser-auth`. This follow-up addresses only the three verified
findings in the review brief: whole-page confidentiality, same-profile focus
cancellation, and private-text isolation test adequacy.

`EnterpriseAiPage.verifyIdentity` now owns verified server identity and an epoch.
No upload, search, answer or MCP controls mount until identity is verified.
Initial invalid identity/network failure refuses calls. On confirmed change or
failed verification, a synchronous epoch commit unmounts the complete private
subtree: audio file/key/job/transcript, document file/chunks, search hits,
exact/generated answers, and MCP proposals disappear. Layout cleanup aborts and
fences old asynchronous work. Only the trusted server chooses the principal;
backend HMAC and PostgreSQL checks are unchanged. Focus uses a separate,
coalesced identity request; same-profile checks preserve in-flight run/confirm,
pending approval, result and success. MCP retains pre/post-operation checks.

A browser abort or identity transition cannot roll back a confirmation already
committed by the server. If the confirmation response is lost, its commit outcome
is unknown and the note may have been saved. The approval is never replayed
automatically; the UI must not claim an interrupted operation was not committed.

`enterprise-identity.spec.ts` uses mocked HTTP only. It checks page-wide clearing,
initial refusal, stale responses, and same-principal focus during run/confirm.
The local, unpushed CI workflow change selects it; the published workflow does
not yet include it. These are browser lifecycle contracts,
not new model-backed acceptance or authentication of humans.

`test_multiuser_postgres.py` uses three distinct complete refund sentences with
private markers, preserving common query terms and `MIN_SCORE=0.67`. Answer and
note checks inspect every model message and the entire returned result,
including tool trace/citations: own text must appear, all foreign markers must
be absent. Revoke checks distinguish an already-authorized prompt from the
empty refused response and a subsequent retrieval with no private prompt text.
The encoder and model remain deterministic/scripted; MCP stdio and SQL are real
only when the disposable database tests execute. No Qwen quality claim follows.

Verification results and limitations: [review-fix test record](EP11-REVIEW-FIX-RESULTS.txt).

## Publication boundary (2026-11-14)

`feature/ep11-multiuser-published` contains the complete EP-11 code, unit and
integration tests, browser tests, and evidence, but **not** changes to
`.github/workflows/hiring-demo.yml`. This explicitly honors GitHub
workflow-file scope restrictions rather than bypassing them. Existing CI
checks can run from the published branch. EP-11-specific new browser and
PostgreSQL test selection must be enabled through an authorized workflow
change before claiming branch CI covers those tests. The original full local
branch remains available for review on RDC.

## Published branch acceptance (2026-11-14)

- Published source SHA **`155fec44a85a1ff01826cb4c0a2bb6a585fff730`** on
  `feature/ep11-multiuser-published`; this branch does not alter the Actions
  workflow because the OAuth token lacks `workflow` scope.
- GitHub [Hiring demo checks](https://github.com/Sergey303/demo/actions/runs/43560725613)
  for that SHA: **launcher, frontend, live-screencast all successful (3/3)**.
  The existing workflow's selected tests ran; it does **not** select the new
  EP-11 multiuser PostgreSQL suite or `enterprise-identity.spec.ts`.
- **Independent real HTTP + Chromium smoke PASS (exit 0)** on the exact
  published source: one FastAPI instance on loopback, two separate Vite
  instances on ports 4173 and 4174, respectively issuing the server-held
  signed profiles `review-team/alice` and `review-team/bob` from the same
  ephemeral HMAC secret. Both browser pages displayed their correct identity.
  For each proxy, caller-forged Authorization, query and cookies did not alter
  the verified subject. Direct unsigned `/agent/identity` returned 401.
- The isolated smoke deliberately used **no PostgreSQL and no model**; it
  verifies actual browser/proxy/HTTP identity binding only. Independently,
  the local developer-branch synthetic DB + real MCP stdio 4/4 and browser
  mock-HTTP 36/36 results remain documented above; they do not constitute
  a two-user live Qwen3/ONNX trial.
- At acceptance time Ollama was not serving and **`qwen3:8b` was not present
  locally**; the previous `qwen3:1.7b` manifest symlink did not resolve to
  installed weights. With only approximately 7.5 GB disk space available,
  no automatic download or substitution of a different model was performed.
  Thus real Qwen3:8b + ONNX two-user acceptance is **NOT RUN**.
- The three ephemeral HTTP/Chromium processes were terminated and the
  temporary dependency link removed. No production/shared database, server
  secret, or user data was used. No merge to `main` is claimed.
