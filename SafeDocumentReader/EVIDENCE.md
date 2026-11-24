# Verification record — 2026-11-24

At commit `fb634def50234e55c43751773804eb52b1f6e5d5`, a fresh sparse checkout on `rdc-project` ran `python3 -m unittest discover -s tests -v` (9 passed) and `python3 -m py_compile safe_read.py contract.py worker.py` (exit 0).

Observed binaries: `pdfinfo`, `pdftoppm`, `docker`, `codex`. Neither `sbx` nor `dangerzone-cli` was found on PATH. No inference image was built; no real rendering, VM creation, offline model inference or attack containment was tested. Unit-test mocks are not live isolation evidence. Subsequent fixture and text-report additions have their own test run.

At commit `0475d2915030960fcbede705a88c5487e2968a93`, a fresh sparse checkout on the same device ran 10/10 unit tests, Python compilation for controller, worker, contract and fixture generator, and generated synthetic documents in a disposable directory. Poppler pdfinfo confirmed 2 pages for first.pdf and 1 for second.pdf; Python zipfile integrity check passed for office.docx. This proves fixture structure, not Dangerzone rendering or AI quality. Temporary checkout and fixtures removed by shell trap.

## Component audit — 2026-11-24

At `643898d4c3531a35ffaff21c3c3d8d1cf44c11ce`, 10 unit tests passed. Poppler rendered synthetic 2-page PDF to two RGB PNGs at 1555x2200. Original PDF text extraction included HIDDEN-Z89-UNRENDERED; not a verified Dangerzone conversion. The real controller returned nonzero and published no report with Dangerzone missing. Codex CLI 0.166.0 help confirmed required flags. Ollama lists qwen3:8b and embeddinggemma:latest only; vision model missing. No /dev/kvm or sbx found. Available memory ~6.9 GiB; do not provision 20 GiB SBX or load 8B vision model on this shared host without capacity planning.

Docker 29.8.2 live probe using preexisting python:3.12-alpine: bind from RDC /tmp failed (daemon is separate); stdin transport worked. With network none, only lo existed, TCP to documentation IP failed, UID 10001, CapEff zero, NoNewPrivs 1, no docker socket and no OPENAI_API_KEY/GH_TOKEN/GITHUB_TOKEN; second fresh container could not read first container's tmpfs canary. These were synthetic ordinary Docker probes, not model or microVM acceptance. Fix: bounded framed stdin transport, no bind mounts; SBX no runtime pull. Full runtime still pending.

### Transport fix verification

At `fd210c700eb86e0c350d2e25d9c0631ff8126389` all 12 unit tests and Python compilation passed on RDC. An initial piped Docker hash probe returned no stdout and failed the assertion; a repeat with a finite framed file on stdin and unbuffered Python passed: 90,131 bytes transferred; both PNG SHA-256 values matched exactly. Use unbuffered worker stdout. Separately generated two one-page synthetic PDFs differing only by invisible PDF text; pdftotext recovered the canary, but Poppler PNG files compared byte-identical (`cmp`, exit 0). This is a Poppler-only controlled test, not full Dangerzone acceptance. No new image downloads, confidential data or shared-service changes. Live SBX, Dangerzone and vision inference remain blocked.

### Renderer follow-up

RDC is Ubuntu 24.04.4 LTS; Podman and Dangerzone unavailable. `unshare --user --map-root-user true` returned Operation not permitted; /dev/fuse and /dev/kvm absent; NoNewPrivs=1, Seccomp=2. Official Dangerzone Linux runtime is Podman, with gVisor inside; 0.11.1 fixes October 2026 archive-update vulnerabilities. No privileged workaround or host package installation performed. Added structural audit on reconstructed PDF, provisioning guide and explicit synthetic live acceptance runner. Full Dangerzone conversion remains blocked.
