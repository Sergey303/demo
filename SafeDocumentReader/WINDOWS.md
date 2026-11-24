# Windows host setup and acceptance

Use the native Windows host rather than nesting the renderer or SBX within RDC Linux.
Official Dangerzone Windows package embeds its own Podman runtime and needs WSL
virtualization. Poppler and Python run natively. Do not expose untrusted inputs
to any host agent or source checkout. Use a fresh private directory, not a
shared or synchronized project folder. Windows ACLs must limit access to the
current account and trusted administrators (POSIX chmod is not an ACL).

## Preconditions (observed 2026-11-24)

- Windows 11 build 26200, Docker Engine 29.8.2 / desktop-linux, WSL2 running.
- Python 3.11 and 3.14; Poppler 25.07.0 available.
- Dangerzone not installed (standard location and Winget inventory checked).
- SBX v0.39.0 exists; sbx ls failed because authentication expired. Installed
  help does not advertise --skills or --pull; do not omit these security flags.
  Update to a compatible version and sign in interactively as the account owner.
- Available memory 272–605 MiB, C: 0.9 GiB and D: 2.7 GiB free. Do not start
  additional VMs or install large images in this state. Free disk and RAM
  without touching unrelated workloads; plan for both images and temporary
  copies. Current summarizer default requests 20 GiB SBX RAM, not suitable
  alongside the current workload.

## Provision only after resolving resource limits

Official instructions:
https://docs.dangerzone.rocks/0.11.1/how-to/install/
https://docs.docker.com/reference/cli/sbx/create/

From PowerShell, with no document in the workspace:

    winget install --id FreedomofthePressFoundation.Dangerzone --exact
    winget upgrade --id Docker.sbx --exact
    sbx login

Verify signed Dangerzone release 0.11.1 or a newer security-patched version
and initialize its signed sandbox separately from any processing:

    & "$env:ProgramFiles\Dangerzone\dangerzone-cli.exe" --version
    & "$env:ProgramFiles\Dangerzone\dangerzone-image.exe" upgrade
    sbx version
    sbx ls
    sbx create --help

Verify --skills off, --static-mcp none, --deny-network and --pull never
are supported, and that shell kit can run without host mounts. Never replace
a rejected option with a weaker policy. Verify image signature, policy and
actual sandbox cleanup using synthetic data before any untrusted document.

## Tests

    py -3.11 -m unittest discover -s tests -v
    py -3.11 tests/live_renderer.py

The host controller finds Dangerzone at the official Windows installation
location if it is not on PATH. Full live acceptance is still required.
The standard setup is not a guarantee of containment. Do not run sensitive
documents until all SECURITY.md gates are satisfied. Do not upload documents
to any external service. The project uses a local model; no cloud fallback.
