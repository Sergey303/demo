"""Single-host lab controller. Only a trusted operator may write the gate."""
import argparse
import os
from pathlib import Path
import re
import tempfile
import time


def publish(path, content):
    """Atomic replace, file and parent directory fsync; no partially written pin."""
    fd, temp = tempfile.mkstemp(prefix=".primary-gate-", dir=path.parent)
    try:
        # API and controller use the same trusted local account in this lab.
        with os.fdopen(fd, "w", encoding="ascii", newline="\n") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
        dir_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def manifest(window, run_id):
    boot = Path("/proc/sys/kernel/random/boot_id").read_text().strip()
    namespace = os.readlink("/proc/self/ns/time")
    if not re.fullmatch(r"[0-9a-f-]{36}", boot) or not re.fullmatch(r"time:\[[0-9]+\]", namespace):
        raise ValueError("Unknown Linux monotonic clock domain")
    return f"v2:{window * 1000}:{run_id}:{boot}:{namespace}\n"


def control(path, run_id=None, window=60, max_clock_delta_ms=0, *, fenced=False):
    if not path.is_absolute() or not path.parent.is_dir():
        raise ValueError("Use an absolute gate path in a trusted existing directory")
    if run_id is not None and (not fenced or not re.fullmatch(r"[0-9a-f]{40}", run_id)
                              or not 1 <= window <= 60
                              or not 0 <= max_clock_delta_ms <= 60000):
        raise ValueError("Valid pin, window, clock bound and fencing attestation required")
    import fcntl  # Linux/Unix lab controller; API itself is cross-platform.
    # All commands using the same gate serialize; process death releases the lock
    # but leaves the gate closed, and a new invocation starts a full wait again.
    with open(str(path) + ".lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        publish(path, "closed\n")
        if run_id is not None:
            # This invocation must start AFTER independently verified fencing.
            deadline = time.monotonic() + window + max_clock_delta_ms / 1000
            while (remaining := deadline - time.monotonic()) > 0:
                time.sleep(remaining)
            publish(path, manifest(window, run_id))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gate", type=Path)
    parser.add_argument("--run-id")
    parser.add_argument("--window", type=int, default=60)
    parser.add_argument("--max-clock-delta-ms", type=int, default=0)
    parser.add_argument("--old-primary-fenced", action="store_true",
                        help="Attest old writer is independently fenced and clocks are bounded")
    args = parser.parse_args()
    control(args.gate, args.run_id, args.window, args.max_clock_delta_ms,
            fenced=args.old_primary_fenced)


if __name__ == "__main__":
    main()
