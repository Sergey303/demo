# Public commercial demos — static publication package

These are original engineering portfolio examples, not customer deployments.
This publication slice intentionally adds no publicly reachable API, database,
authentication service, model endpoint or write to any external system.

## Build and verify

From repository root, with Node 24, npm and Python 3:

    npm ci --prefix GosVet
    npm ci --prefix public-demos
    npm ci --prefix appforge-admin/generated/frontend-app
    python public-demos/build.py --out /tmp/commercial-demos
    cd public-demos
    npx playwright install chromium
    npm run smoke -- /tmp/commercial-demos

Use a new/empty output directory. The build checks TypeScript, GosVet storage
tests, the one-file artifact and deterministic scenario tests. Chromium smoke
serves the bundle under a nested path, exercises the four scenarios and rejects
unexpected requests and browser errors. No real services or model weights are
required. Use the produced directory as the static root; do not serve the
repository root, development proxy, source maps, or disposable backend.
Use an ordinary HTTP(S) static server, not file:// for the module-based demos.

## Handoff to the commercial website

Proposed mount: /demos/ (configurable; all resources are relative).
Publish the built directory as one static unit. Each page supports direct links
and does not depend on the website router. Do not route these paths to a generic
SPA fallback. Serve .mjs as JavaScript, .mp4 as video/mp4 and enable byte ranges
for video. HTTPS recommended. Website should provide the sales CTA outside the
demo iframe/page; use normal links in a new tab if needed. The demo wrappers are
noindex,follow; the commercial service pages remain the SEO landing pages.

| Name | Relative URL | Type | Sales purpose |
| --- | --- | --- | --- |
| Catalog | /demos/ | static | choose scenario |
| GosVet | /demos/gosvet/ | original working React prototype | business systems / complex workflows / simulated AI assistant |
| GosVet appointment | /demos/gosvet/app.html#/appointment/demo-001 | original working React prototype | deep link into editable workflow |
| Клиенты, заявки и задачи | /demos/appforge/ | guide, screenshots and separate technical evidence | bespoke business applications |
| Linked workflow | /demos/appforge/workflow/ | Russian manager, dispatcher and executor workspaces, generated contracts + local adapter | linked customer/request/task workflow |
| AppForge generated UI | /demos/appforge/generated/ | original generated Customer page + isolated local transport | direct link into original UI |
| Reliable Jobs | /demos/reliable-jobs/ | accepted P1 sender/receiver comparison, failure scenarios and CTO evidence | reliable integrations / architecture |
| Enterprise AI | /demos/enterprise-ai/ | recorded Qwen answer replay + deterministic grant scenarios + original video | corporate knowledge search / controlled AI |

All sample data are synthetic. GosVet stores state locally in browser storage;
the three new scenarios use only in-memory state. No actual VetIS integration,
AppForge generated backend, worker, PostgreSQL or LLM is run in the public
bundle. No exactly-once external effects, production IAM, performance SLA or
guarantee of factual LLM answers are claimed.

The accepted P1 linked workflow uses generated field components, DTOs and transport contracts with a consumer workflow shell and memory-only adapter. The separate technical Customer CRUD preview uses the original
generated React page, forms, table, query hooks and contracts in a temporary
build tree; a dedicated transport adapter implements the known customer routes
in memory. The staged durable executor is also substituted with a memory-only
adapter because the original requires an authenticated partition and IndexedDB.
No production generated files are edited; the real authentication and durable
mutation runtime are not used in the static preview. The simple Russian
simulator remains an additional lightweight scenario. The original browser/SQL
acceptance and screenshot remain linked. The generated UI is English and its
preview adapter does not claim parity with all server validation or durable
idempotency. Build staging uses a directory symlink; run on Linux/RDC or CI.
See [P1 acceptance](../appforge-admin/workflow-live/ACCEPTANCE.md) for the separate generated API/PostgreSQL test, concurrency boundary and user acceptance. The public workflow is not connected to that server.

Enterprise replay returns the recorded Qwen answer only for the original
two-source refund scenario; source snippets in the browser are illustrative
synthetic excerpts, and single-source/revocation/unknown scenarios are a
deterministic model, not a new inference run. The actual video and acceptance
report are the authoritative evidence. The outbox simulation does not measure
concurrency or retry timing; inspect the original API/worker tests.

Before a public release, review actual media for publication permission, run the
browser smoke on the deployed HTTPS mount and verify website links.
Reliable Jobs P1 acceptance and separate real API/PG evidence: [P1-ACCEPTANCE.md](../dotnet-outbox/P1-ACCEPTANCE.md).
The provided workflow template builds an artifact only; it does not publish or alter Pages. It is intentionally inactive: the current GitHub OAuth credential lacks workflow scope. To enable it, an authorized maintainer should copy public-demos.workflow.yml.example to .github/workflows/public-demos.yml.

## Коммерческие сценарии и карточки Engineering

[COMMERCIAL-HANDOFF.md](COMMERCIAL-HANDOFF.md) содержит готовые тексты
карточек AppForge, Reliable Jobs и Enterprise AI, точки входа и CTA,
сценарии первого разговора, границы подтверждённых результатов.
GosVet описан отдельно в GosVet/COMMERCIAL-HANDOFF.md.
