# ADR-001 — Start with PostgreSQL transactional outbox, not a separate broker

**Status:** Accepted for the independent Jobs demo; provisional for the target evidence platform.

**Context.** A user submits work that must survive restart without losing the acceptance record. PostgreSQL already stores job state. Publishing directly to a queue after committing would create a commit/publish gap. A broker introduces separate operations, deployment and monitoring complexity.

**Alternatives.** (A) In-process queue: simplest but can lose acknowledged work. (B) PostgreSQL job + outbox in one transaction, workers claim via `SKIP LOCKED`: one durable source of truth and a short operating path. (C) Kafka/RabbitMQ plus outbox relay: higher decoupling and cross-service fanout, but still needs outbox/dedup and infrastructure operations.

**Decision.** Choose B for moderate workloads with a single PostgreSQL owning the jobs. `POST /jobs` writes job + outbox atomically; multiple workers claim available rows; handler result + processed marker commit together. **Never promise exactly-once external side effects.**

**Evidence.** [Transaction implementation](../../dotnet-outbox/src/Program.cs), [worker](../../dotnet-outbox/src/OutboxWorker.cs), [schema/index](../../dotnet-outbox/sql/001_init.sql). [Concurrency tests](../../dotnet-outbox/tests/ConcurrencyIntegrationTests.cs) and [HTTP smoke](../../dotnet-outbox/tests/smoke.py) passed against isolated PostgreSQL 16.15 on 2026-11-05. Fault-injection inside an active SQL transaction remains untested.

**Trade-offs.** Strong database atomicity, simpler local operations; polling/locking causes database read/write pressure, replay requires durable idempotent consumers, and throughput remains tied to database capacity. This isn't an argument that PostgreSQL queues universally outperform brokers.

**Revisit when:** sustained queue lag exceeds an agreed backlog-age SLO; more independent consumers require fanout/replay; workloads need retention/streaming semantics; database I/O contention grows; or isolation across teams warrants a broker. Measure job arrival rate, ready-row count, oldest age, lock waits, dead-letter count, retries and recovery time **before** choosing. Broker migration requires a transactional relay, schemas, replay/dedup tests and dual-run verification.
