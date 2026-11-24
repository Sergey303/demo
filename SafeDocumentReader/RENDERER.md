# Renderer provisioning and acceptance

Official installation: https://docs.dangerzone.rocks/latest/how-to/install/
Security advisory: https://docs.dangerzone.rocks/latest/advisories/2026-10-22/
Use 0.11.1 or a newer security-patched version. The Linux runtime officially
supported by Dangerzone is Podman, not Docker. Use a dedicated non-root user
on a supported host, with rootless Podman and working user namespaces. Do not
use privileged nested containers or weaken seccomp/AppArmor to work around
RDC restrictions. Do not set signature bypass or dev-mode variables.

Before ingesting documents, install the signed distribution using the official
APT repository and verify its signing fingerprint per upstream instructions.
Install poppler-utils. Initialize the signed sandbox with dangerzone-image
upgrade, or install the official dangerzone-full package. No document should
be present during setup or image upgrades. Verify actual version and runtime:

    dangerzone-cli --version
    podman info --format '{{.Host.Security.Rootless}}'
    unshare --user --map-root-user true
    python3 -m unittest discover -s tests -v
    python3 tests/live_renderer.py

The last command generates only synthetic fixtures and deletes all temporary
artifacts. It verifies the actual controller on two PDF files and a DOCX;
nonzero conversion must not publish output. Independently inspect visible
layout, print areas, hidden rows and comments, run the remaining checks in
SECURITY.md (including network canary), and record evidence before real use.
No automatic installation/fallback is attempted by the controller.

RDC 2026-11-24: Ubuntu noble, no Podman or Dangerzone on PATH, user namespace
creation denied, no /dev/fuse or /dev/kvm, NoNewPrivs=1, Seccomp=2. Do not
claim full Dangerzone acceptance here. Run on a supported host or dedicated VM.
