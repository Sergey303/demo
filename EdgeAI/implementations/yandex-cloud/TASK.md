# EAI-04 — Yandex Cloud inference

**P1.** Validate current model runtime and endpoints from official docs and actual entitlement. Cloud inference in one region is not automatically Edge AI: explicitly record physical execution assumptions.

Acceptance: adapter for one chosen scenario, bounded inputs/timeout, versioned model ref, secrets injected at runtime, mockable API client, test offline fallback, no personal data, real-account validation only opt-in. TODO: compare network overhead from RF source locations and cost using identical workload.
