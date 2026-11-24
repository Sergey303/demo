# EP-12 release decision — publish evidence before expanding the deployment surface

Decision date 2026-11-24. Compared main 81658db with local committed tip 078e2a7; this is a release review, not a deployment approval.

## Evidence verified during this review

- Public [EP-12G branch, b318db8](https://github.com/Sergey303/demo/tree/b318db8) has [successful hosted CI 43889241102](https://github.com/Sergey303/demo/actions/runs/43889241102). The five jobs (frontend, launcher, live-screencast, oidc-real-https, oidc-caddy-uds) succeeded. In particular the real Keycloak HTTPS browser and Caddy owner-only UDS jobs ran successfully, and the live-screencast job included dedicated PostgreSQL session/key tests and OIDC contract tests. Test infrastructure uses synthetic users/disposable services, not production.
- At review baseline main...EP-12T = 163 main-only and 45 EP-12-only commits, 102 changed files, +13,280/-15 from common ancestor c3a27e01. Main...EP-12G = 163/30, 49 files, +5,263/-15. These are not patch size versus current main. Main changed AGENTS.md and frontend separately; merge-tree identifies shared AGENTS.md changes. Do not overwrite main.
- EP-12T documentation records historical 146 Python PASS and EP-12P 155 .NET PASS/8 SKIP. Those are author-recorded historical results, not newly rerun suites. At review time 6 EP-12H alert-evaluator and 11 EP-12J rollup tests passed on local EP-12T in under one second of test execution; no service/model started.
- EP-12U's committed tip equals EP-12T, but its existing separate worktree contains untracked Ep12uPostgresFlowTests.cs, ep12u_disposable_pg.py, ep12u_kestrel_acceptance.py, ep12u_oidc_acceptance.py and test_ep12u_isolation.py. Preserve them. Not reviewed or executed here, not published, no acceptance claim.

## Release slices and gates

| Slice | Decision now | Gate before merging into main |
|---|---|---|
| A–G: identity mapping, revocable sessions, ingress, admission, metrics | Candidate for first publication; already publicly inspectable at immutable commit b318db8 | Integrate in isolated review with current main; preserve both security and front-end contracts; fresh all-five hosted CI including real C/E tests, separate PostgreSQL migration/key proof. |
| H–K: alert rules, file exporter, rollups, time buckets | Defer merge until A–G accepted; keep experimental opt-in | Bounded samples/cardinality, reset/gap/clock handling, actual .NET exporter interoperability; rerun Python and .NET relevant suites. |
| L–R: lifecycle and systemd watchdog | Defer as reference/experimental | Independent desired inventory is required for positive health; real test-only systemd PID 1, lifecycle/permissions/restart, full wall-clock window and UNKNOWN on gap. Do not deploy an obsolete unsigned positive path. |
| S–T: durable alert outbox and signed topology | Publish as coherent later reference, not as production monitoring | Signed source authority provisioned independently, replay/revision, real controlled receiver and idempotent ACK, queue-full/failure/recovery, key lifecycle and operator runbook. |
| U: real PostgreSQL acceptance | Blocked for release | Review current untracked artifacts; run only in isolated disposable environment with explicit authorization and adequate capacity; record actual result including skips/failures. |

## Alternatives and rationale

1. Merge all 45 commits immediately: broad capability coverage, highest integration/review burden; no recent main-compatible full CI and no real systemd/controller acceptance. Reject.
2. Publish A–G first, then coherent opt-in slices: smallest useful production-shaped identity story with verified public evidence; avoids implying monitoring is deployed. Recommend.
3. Keep the whole series off main: avoids integration risk, but hides useful security architecture from reviewers. Until fresh combined CI exists, use the existing public branch link rather than imply merge completion.

No branch switched, no merge, no workflow mutation, no service deployment or real database restart in this review. Updating workflow files requires appropriate repository workflow permissions (previous unrelated workflow push was refused); do not bypass the gate.

Rollback for first slice: keep current main path default; enable isolated BFF by explicit config only after the acceptance gates; preserve session schema and key material across application rollback, revoke incompatible sessions rather than downgrade trust. Do not route protected traffic to an unauthenticated fallback. For future monitoring, missing or expired trusted telemetry is UNKNOWN, not healthy. Release owner and security reviewer must approve separately in a real team; roles here are proposed responsibilities, not named staff.
