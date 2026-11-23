# EAI-07 — no-network inference test

**P1.** Verify local model path works with network physically unavailable or sandbox-denied. No provider fallback unless explicitly requested. Acceptance: clean run after cache purge if model is prepackaged, no DNS/HTTP access attempted, bounded memory/latency and evidence of actual model execution. TODO: platform-specific instrumentation (Windows/Linux).
