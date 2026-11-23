# EAI-03 — Cloudflare Workers AI inference

**P1.** Verify available model IDs, Workers AI bindings, quota and price from live official docs before writing config. Do not reuse network-security Worker implicitly.

Acceptance: isolated code/config under this folder; no hardcoded credentials; privacy policy for prompts and output; bounded latency/payload; provider tests mocked locally; opt-in real validation with model ID, region assumptions, version and measured latency in evidence. TODO: choose compatible same-task comparison against ONNX without claiming identical model.
