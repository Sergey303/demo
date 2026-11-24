# SafeDocumentReader

Standalone security-oriented document review prototype: render untrusted Office/PDF
documents into images, then generate a short Russian review with requirements,
suspicious AI-directed text, and uncertainties per page. **Not a malware
detector, certified safe viewer or reliable prompt-injection classifier.**

## Trust boundaries

1. Dangerzone converts original bytes into a reconstructed pixel-only PDF
   in its isolated container. OCR is not requested. Poppler renders only
   the reconstructed PDF, never the original.
2. Each document gets a new mountless Docker Sandbox (SBX), with deny-all
   egress, skills off and static MCP disabled. Load a trusted prebuilt image
   into its private Docker daemon and copy a bounded framed PNG stream into it.
   The shell kit must already be provisioned (`--pull never`).
3. The inner worker uses network=none, read-only root filesystem and framed PNG input via stdin (no host bind mounts),
   dropped privileges, bounded CPU/RAM/PIDs, temporary filesystem, no
   Docker logs. Ollama serves a preinstalled local model on loopback.
   Codex uses ephemeral per-page sessions, separate homes, no cloud keys;
   direct Ollama vision without tools is an explicit alternative.
4. Validate JSON, reject missing pages, assign page numbers in trusted
   code. Do not execute model output or automatically forward it to agents.
   Remove the VM on success and handled failure; if deletion fails, do not
   publish the report. Unique names avoid reusing prior state.

## Host setup

Native Windows is also supported for structural tests; see [Windows provisioning](WINDOWS.md) for requirements and pending live acceptance.

### Linux setup

Install and initialize Dangerzone from its official signed distribution (0.11.1 or newer security-patched release) on a supported Linux host with rootless Podman, plus Poppler utilities (pdfinfo, pdftoppm, pdftotext, pdfdetach, pdfimages). See [renderer setup](RENDERER.md). Install standalone Docker Sandboxes
(sbx) on a host supporting its microVMs and Docker for building the image.
Do not install anything while processing a document.

Rendering only:

    python3 safe_read.py input.docx --out /private/review --render-only

Outputs safe.pdf and numbered PNGs after checking the reconstructed PDF has no extractable text, URLs, attachments, forms, JavaScript or encryption and every page contains an image. These are defense-in-depth structural checks, not proof against arbitrary PDF parser exploits. Choose a new private directory outside
repositories, cloud-sync folders and other agent workspaces.

Build the offline image beforehand on a trusted network. Replace placeholders
with reviewed immutable base digests and exact Codex release:

    docker build -t sdr-offline \
      --build-arg NODE_BASE=node:22-bookworm-slim@sha256:<digest> \
      --build-arg OLLAMA_BASE=ollama/ollama@sha256:<digest> \
      --build-arg CODEX_VERSION=<version> \
      --build-arg MODEL=qwen3-vl:8b .
    docker image inspect --format '{{.Id}}' sdr-offline
    docker save -o /private/sdr-offline.tar sdr-offline

Use the complete image ID:

    python3 safe_read.py input.pdf --out /private/review \
      --image-id sha256:<image-id> --image-archive /private/sdr-offline.tar \
      --keep-pages

No runtime model downloads or cloud fallback. The exact Codex/Ollama/model
combination needs live compatibility verification (including vision and local
provider protocol). Explicit --engine ollama uses direct vision without agent
tools. Explicit --backend docker skips the outer microVM for development;
ordinary Docker is not equivalent to SBX. The SBX currently requests 20 GiB
RAM; the inner container is capped at 16 GiB and four CPUs.

Reports are written as report.txt (human-readable, inert plain text) and
report.json (structured, unverified). Default target 80 summary words per page; critical requirements may exceed
the target. Default 20 pages, hard limit 40, 64 MiB input, 256 MiB raster
output. Oversized and incomplete reports fail. --keep-pages retains images
and PDF for human verification. Reports and images contain confidential
content; only temporary artifacts are removed automatically. Original untouched.
Deletion is not secure erasure and abrupt host termination can leave state.

## Tests

    python3 -m unittest discover -s tests -v

Unit checks verify output structure, page coverage, inert data, isolation flags
and cleanup control flow. They do not prove runtime isolation or model quality.
See SECURITY.md for live acceptance gates.

Generate synthetic PDF/DOCX fixtures with visible injections, a hidden PDF
text layer, cross-document canaries and labeled critical requirements:

    python3 tests/generate_fixtures.py /private/sdr-fixtures

Use each generated document separately; compare output to expected.json and
inspect page images. A human must grade semantic coverage and warnings.
See [EVIDENCE.md](EVIDENCE.md) for the actual test environment and limits.

Dependencies: [Dangerzone](https://docs.dangerzone.rocks/),
[Docker Sandboxes](https://docs.docker.com/reference/cli/sbx/create/),
[Codex CLI](https://developers.openai.com/codex/cli/), Ollama and Poppler.
These are separately installed tools; review licenses before redistribution.

Cloud inference intentionally not implemented: a completely offline sandbox
cannot reach cloud Codex, and a broad provider allowlist permits residual
exfiltration. An isolated, tool-free cloud inference broker would be a
separate explicit-consent feature.
