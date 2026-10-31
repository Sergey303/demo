# Technical knowledge review contract (Python AI)

Goal: help reviewing agents accurately understand, explain and challenge the technology demonstrated here. Optimize for high-value evidence, not quantity of technologies, documentation pages or green checks.

## Read order

1. `README.md` and `TECHNOLOGY_EVIDENCE.md` in this directory.
2. Relevant project's `README.md`, implementation, tests, evaluation code and input data.
3. Execute the least expensive deterministic check first; report missing packages, model downloads and environment blockers separately.

## Required review output

For each claim, record **Claim → code location → mechanism → experimental evidence → limitations → next discriminating test**. Distinguish: `implemented`, `statically inspected`, `unit-tested`, `measured on representative data`, `production-proven`, `not verified`. Never promote one level to another. If evidence is missing say `unknown`, not `passed`.

Answer five questions before recommending expansion:

1. What is the business task and what baseline beats doing nothing (including a non-neural baseline)?
2. Where exactly is neural computation, training/inference and the external model dependency?
3. What would falsify quality, robustness, security or reproducibility claims?
4. Which metrics and data split test the actual decision, and where can leakage or selection bias occur?
5. What is the smallest next experiment that reduces the greatest uncertainty?

## Prioritization (qualitative Pareto)

Prefer one real, reproducible experiment with a baseline, held-out examples, failure analysis and explicit limits over ten feature additions. Prioritize: (1) correctness of technical claims; (2) meaningful evaluation and comparison with baseline; (3) failure and security boundaries; (4) reproducibility; (5) integrations and presentation. Stop adding tools, frameworks, or projects that do not improve those criteria.

Do not call a fixed, caller-supplied tool action an autonomous agent, an inference-only embedding API a trained-in-repo model, or a tiny illustrative corpus a representative benchmark. A human approval boolean supplied by a client is NOT authentication.

When editing, keep demos independently runnable. Preserve unrelated work and do not modify unrelated `.github` files. Do not create fake metrics. Review claims against actual source, not README descriptions alone.
