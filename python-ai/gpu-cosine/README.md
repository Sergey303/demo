# OpenAI Triton: cosine similarity GPU kernel

`kernel.py` implements independent dot products against one query using the open-source Triton JIT and masks tail elements for non-power-of-two dimensions. Input vectors **must already be L2-normalized** for the dot products to be cosine scores. The GPU-only `benchmark.py` verifies its output against PyTorch and compares timings. Run `python benchmark.py` after installing CUDA-capable PyTorch and `triton` on a compatible NVIDIA GPU.

This code is **not GPU-tested in the RDC environment**, which has no exposed GPU. Consequently no speedup, throughput or kernel correctness on actual hardware is claimed. This is an opt-in implementation, not a proven performance result.
