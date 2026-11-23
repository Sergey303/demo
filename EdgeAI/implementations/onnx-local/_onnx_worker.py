"""Private one-shot worker. Enter the socket filter before importing ONNX."""
from __future__ import annotations

import ctypes
import errno
import json
from pathlib import Path
import sys


def deny_network() -> None:
    # libseccomp handles syscall numbers and architecture checks. Loading or
    # applying the filter must succeed before an artifact can be opened.
    seccomp = ctypes.CDLL("libseccomp.so.2")
    seccomp.seccomp_init.argtypes = [ctypes.c_uint32]
    seccomp.seccomp_init.restype = ctypes.c_void_p
    seccomp.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    seccomp.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    seccomp.seccomp_load.argtypes = [ctypes.c_void_p]
    seccomp.seccomp_release.argtypes = [ctypes.c_void_p]
    seccomp.seccomp_release.restype = None
    ctx = seccomp.seccomp_init(0x7FFF0000)  # SCMP_ACT_ALLOW
    if not ctx:
        raise RuntimeError("could not allocate seccomp filter")
    try:
        deny = 0x00050000 | errno.EPERM  # SCMP_ACT_ERRNO
        for name in (b"socket", b"socketpair", b"socketcall", b"io_uring_setup",
                     b"execve", b"execveat"):
            syscall = seccomp.seccomp_syscall_resolve_name(name)
            if syscall == -1 or seccomp.seccomp_rule_add(ctx, deny, syscall, 0) != 0:
                raise RuntimeError("could not configure seccomp filter")
        if seccomp.seccomp_load(ctx) != 0:
            raise RuntimeError("could not enable seccomp filter")
    finally:
        seccomp.seccomp_release(ctx)


def main() -> None:
    deny_network()
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from isolated import MAX_INPUT, MAX_OUTPUT
    from runtime import OnnxWindowScorer

    request = sys.stdin.buffer.read(MAX_INPUT + 1)
    if len(request) > MAX_INPUT:
        raise ValueError("oversized worker request")
    windows = json.loads(request)
    result = OnnxWindowScorer(Path(sys.argv[1])).score_many(windows)
    output = json.dumps(result, allow_nan=False).encode("ascii")
    if len(output) > MAX_OUTPUT:
        raise ValueError("oversized worker response")
    sys.stdout.buffer.write(output)


if __name__ == "__main__":
    main()
