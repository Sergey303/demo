"""Illustrative Triton cosine numerators (normalized vectors -> cosine dot product).

Single query vs contiguous matrix, one independent dot-product per program.
Requires torch, triton, NVIDIA CUDA GPU for JIT compile and execution.
"""


def scores(vectors, query):
    import torch
    import triton
    import triton.language as tl
    if not vectors.is_cuda or not query.is_cuda:
        raise RuntimeError('Triton benchmark requires a CUDA GPU')
    if vectors.ndim != 2 or query.ndim != 1 or vectors.shape[1] != query.shape[0]:
        raise ValueError('Expected [N,D] vectors and [D] query')
    if not vectors.is_contiguous() or not query.is_contiguous():
        raise ValueError('Contiguous vectors required')
    if vectors.dtype != torch.float32 or query.dtype != torch.float32:
        raise ValueError('float32 required')
    n, d = vectors.shape
    if n < 1 or d < 1:
        raise ValueError('Nonempty inputs required')
    out = torch.empty((n,), device=vectors.device, dtype=torch.float32)
    _dot[(n,)](vectors, query, out, d, triton.next_power_of_2(d), num_warps=4)
    return out


def _lazy_note():
    return 'Kernel requires a CUDA machine and cannot be validated on a CPU-only RDC.'


# Importing this file remains CPU-safe; JIT is initialized only when the module
# is imported on a GPU machine with torch/triton available.
try:
    import triton
    import triton.language as tl
except ImportError:
    pass
else:
    @triton.jit
    def _dot(X, Q, Y, D: tl.constexpr, BLOCK: tl.constexpr):
        row = tl.program_id(0)
        offsets = tl.arange(0, BLOCK)
        x = tl.load(X + row * D + offsets, mask=offsets < D, other=0)
        q = tl.load(Q + offsets, mask=offsets < D, other=0)
        dot = tl.sum(x * q, 0)
        tl.store(Y + row, dot)
