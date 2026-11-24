# Threat model and live acceptance

Document and model are untrusted. Host, renderer installation, SBX daemon,
image provenance and operator are trusted. Visible injections can induce
omissions and fabricated conclusions; absence of suspicions is not a verdict.
Rendering can lose hidden spreadsheet rows, comments, revisions, attachments
and off-print content. Verify rendering completeness for each format.

## Required before sensitive use

- Render synthetic PDF/DOCX/XLSX/PPTX, tables, scans, rotated and hidden text;
  confirm page counts and print coverage, absence of active links/text layers.
- Use inert macro and external URL fixtures with a controlled network canary.
  Verify no connection from the renderer or worker, including DNS/IPv6/proxy.
- Inspect actual mountless SBX and effective deny-all rules; confirm no MCP,
  shared skills, host mounts, secrets, retention or Docker socket in worker.
- Process two documents with unique synthetic canaries; verify second cannot
  access previous files, contexts, inference caches or logs. Confirm deletion.
- Interrupt/timeout each stage; confirm cleanup. SIGKILL or power loss bypasses
  finally: inspect and remove only the exact orphaned sdr-* job VM/container
  after checking ownership. Never prune unrelated workloads.
- Test visible fake system authority, exfiltration requests, demands to hide
  warnings, fake JSON/page IDs and obfuscated text. Check zero external effects.
- Independently label holdout requirements, negations, dates and numbers.
  Require zero missing critical facts on holdout; measure compression and
  false warnings separately. Valid JSON does not prove semantic correctness.
- Test resource exhaustion, malformed/large files, model stalls, and verify
  host disk and memory quotas. Runtime downloads and cloud calls prohibited.

## Open P0 / evidence limits

Live renderer/SBX/Codex/Ollama integration, compatibility, effective policy,
crash recovery and quality metrics are not yet verified. Host Poppler still
parses Dangerzone output; parser vulnerabilities remain possible. Dangerzone
may leave an orphan after forced termination; verify cleanup. Initial
renderer/rasterizer resource consumption depends on provisioning. Use
encrypted ephemeral storage, disable core dumps/swap as appropriate; ordinary
deletion is not forensic erasure. Reports remain untrusted data and must not
become privileged agent instructions. Verify image provenance and archive
checksum out of band. Use a clean trusted SBX shell kit with no retention or
additional mounts. No real malware or confidential files in this repository.
