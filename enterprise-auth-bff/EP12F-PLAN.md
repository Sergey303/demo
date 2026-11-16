# EP-12F implementation plan

Design and acceptance: [EP-12F admission contract](../enterprise-demo/EP12F-ADMISSION.md).
Base: `90df3430985fdc0415b03c1e8553a13bb9c66fb0`; isolated branch
`feature/ep12f-oidc-admission`. No external DB/model used; main untouched.

1. Write an executable failing callback-budget regression, run Release focused tests
   with one build/test process and a bounded .NET GC heap.
2. Add one host-owned disposable admission service containing two independent
   System.Threading.RateLimiting sliding windows (60/180, 1 minute, 6 segments,
   auto replenish, no queue). Insert after validated ingress, before infrastructure
   and authentication. Empty 429, fixed bounded Retry-After, no cookie or identity.
3. Add DI-only small-budget tests for real OIDC challenge/callback, blocked valid
   callback, DB-failure precedence, spoofed metadata, route/method exclusions,
   concurrency, host isolation, and real AF_UNIX. No optional metrics: no new
   telemetry labels/exporter or privacy surface.
4. Run focused then full BFF Release tests sequentially, link validator, existing
   feasible frontend checks, and diff checks. Record actual outcomes and skips.
5. Review final diff independently, address findings, document boundaries/evidence,
   commit intended source/tests/docs locally and stop.

Review focus: early cookie validation must not touch SQL on rejected requests;
login exhaustion must leave callbacks usable; alternate methods/paths must not
consume budgets; invalid ingress must precede admission; rejection must contain
no provider/cookie/query/identity data. No distributed/fairness/DDoS claim.
