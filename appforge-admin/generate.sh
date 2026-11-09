#!/usr/bin/env bash
set -euo pipefail

# Deterministic AppForge input -> generated full-stack admin example.
# APPFORGE_ROOT must be a checkout of Sergey303/AppForge (see README).
here="$(cd -- "$(dirname -- "$0")" && pwd -P)"
appforge="${APPFORGE_ROOT:-}"
if [[ -z "$appforge" || ! -f "$appforge/scripts/quality/run-md-ef-core-production-package.ps1" ]]; then
  echo "Set APPFORGE_ROOT to a checkout of Sergey303/AppForge" >&2
  exit 2
fi
pwsh -NoProfile -File "$appforge/scripts/quality/run-md-ef-core-production-package.ps1" \
  -SpecPath "$here/telegram-operations.md" \
  -OutputRoot "$here/generated" \
  -Clean
