"""GPU-only validation against PyTorch matmul and median device latency."""
import torch
import triton
from kernel import scores


def main():
    if not torch.cuda.is_available():
        raise RuntimeError('A CUDA GPU is required; no CPU benchmark is substituted')
    torch.manual_seed(42)
    x = torch.nn.functional.normalize(torch.randn(8192, 256, device='cuda'), dim=1)
    q = torch.nn.functional.normalize(torch.randn(256, device='cuda'), dim=0)
    expected = x @ q
    actual = scores(x, q)
    torch.testing.assert_close(actual, expected, atol=2e-5, rtol=2e-5)
    print({'N':len(x),'D':len(q),'triton_ms':triton.testing.do_bench(lambda: scores(x,q)),
           'torch_ms':triton.testing.do_bench(lambda: x @ q)})


if __name__ == '__main__':
    main()
