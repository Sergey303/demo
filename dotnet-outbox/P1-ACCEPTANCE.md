# Reliable Jobs P1 — accepted

27.11.2026. Source baseline d48ed32f4ab0bee4f05c04e047a76ca1e2dc3ddf.
No production server changes, no P2 fault injection, no changes to the
other demo sources. Browser implementation uses the existing text-job model
extended with deterministic sender/receiver state, two isolated comparison
stores, virtual time, scenario state machine and technical projections.
Only fixed teaching payloads; SHA-256 constants verified independently with
Node crypto on the exact UTF-8 bytes. Arbitrary payload entry is not required.

## Automated checks

- Node model suite: 14/14 (6 previous, 8 Reliable Jobs P1).
- Chromium: RJ01–RJ12, T01–T08; I01–I04/I07–I10 modeled within scope.
  I05/I06 are explained and linked to real PostgreSQL primitive checks,
  not simulated contention. Actual jobs/outbox are projections of one
  browser model, not independent database observations.
- Nested mount, reset and cancel, mobile 390px, keyboard, technical panel,
  evidence links, no unexpected network requests or page errors.
- Original AppForge, GosVet and Enterprise AI regressions pass.
- Isolated Engineering candidate: static build, Markdown/HTML/SEO sync,
  runtime asset budget, HTTP security, four packaging variants.
  Browser traversal on nested Engineering mount: card -> demo -> release
  form with preselected category and local brief -> back -> diagnostics
  category -> mobile. No unexpected requests or page errors.

## New real API/PostgreSQL evidence (27.11.2026)

Disposable PostgreSQL 17-alpine, unique temporary container and random
credentials, no exposed DB port or customer tables. Applied sql/*.sql.
.NET 10.0.112 SDK build of tests/ReliableJobs.Tests.csproj: 0 warnings,
0 errors. Actual API + worker, GET /ready ready. Existing tests/smoke.py
sent 20 requests through a 10-thread pool with same key and text:
common ID, 409 for changed payload, GET done and WordCount=3/SHA-256
equal to independently computed digest. Additional direct SQL query:

    SELECT count(*) AS jobs, count(o.id) AS outbox,
        count(*) FILTER (WHERE j.status='done' AND result IS NOT NULL
            AND processed_at IS NOT NULL AND attempts=0) AS committed_result
    FROM jobs j LEFT JOIN outbox o ON o.job_id=j.id
    WHERE j.idempotency_key LIKE 'portfolio-smoke-%';

Observed 1 / 1 / 1, assertion passed. This is a committed snapshot,
not a count of actual handler invocations or result writes.
Full xUnit suite: 12 passed including two PG-PRIMITIVE tests and two
AudioIdentity tests outside this text scenario. The unique key winner and
SKIP LOCKED/reclaim tests were on separate disposable tables.
The temporary process/container were stopped and removed by trap cleanup.
No real loss of HTTP response, crash, SQL fault injection, terminal handler
exhaustion, external effect, SLA or production security verified.

## Independent review

Codex CLI source-only review from full supplied files (read-only shell sandbox
was unavailable due to kernel namespace restriction). Report found terminal
replay in comparison lane, ambiguous new-key endpoint, insufficient evidence
links, implicit clock advance, overly broad UI claims, missing focused keyboard
and per-lane assertions, and no actual mounted CTA test. Fixed by limiting
terminal experiments to protected single-lane scenarios; one-shot GET after
new key; explicit endpoint and reason; modeled outbox projection/virtual clock;
precise multi-source links; per-lane, cancellation, keyboard and hash assertions;
separate actual nested-mount Engineering traversal. No P2 functions added.
First browser run found CSS overriding hidden terminal button; fixed locally.

## Acceptance and publication scope

Manual owner acceptance confirmed in chat on 27.11.2026 after opening
the Windows RDC review version (HTTP 200, review=3). The screenshots
in public-demos/media/reliable-jobs-p1-*.png are actual captures of the
accepted browser simulation, not screenshots of the live API or DB.
The first action fits the initial 390x844 viewport; both mounted
Engineering CTAs and comparison were verified. Release is a static
portfolio package only. No public live API or external site deployment.
