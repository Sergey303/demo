# EAI-02 — ONNX local inference

**P1.** .NET/Python ONNX Runtime CPU-first runner here, model pinned by SHA256/license, no implicit downloads. Small deterministic synthetic ONNX fixture (created by script when dependencies are available) is allowed.

Acceptance: offline mode; numerical reproducibility and shape validation; timeout and bounded batches; metrics p50/p95; privacy controls; wrong model version fails closed; real inference tests clearly distinguished from fake implementation. TODO: permitted pretrained model + deployment on actual edge device.
