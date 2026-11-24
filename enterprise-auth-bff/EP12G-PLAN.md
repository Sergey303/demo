# EP12G implementation and verification plan

Base: e6c2aa037c678989a307e2422ea9668add8c58cf. Scope: supplied EP12G one-slice brief.

- [x] Inspect guidance, existing middleware ordering, registry and OIDC tests.
- [x] Add one DI-owned disposable BffMetrics with fixed route/outcome/reason/operation vocabularies.
- [x] Observe requests outside transport and exception handling; preserve existing response semantics.
- [x] Wrap existing registry calls and instrument OnRemoteFailure without exception details.
- [x] Add instance-filtered runtime MeterListener coverage and external alert threshold checks.
- [x] Build Release and execute serial vstest; run link and whitespace checks.
- [x] Review final diff, document proof limits, remove temporary brief and commit intended files only.

No endpoint, exporter, dependencies, database/model use or startup/transport changes.
Test-first red/green was not performed: tests were authored after the implementation;
verification below must not be described as test-first evidence.
