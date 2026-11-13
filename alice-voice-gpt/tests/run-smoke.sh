#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log="$(mktemp)"
token="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
pid=""
cleanup() {
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
    rm -f "$log"
}
trap cleanup EXIT

dotnet build "$root/AliceVoiceGpt.csproj" -c Release --nologo -v q
DEMO_MODE=true YANDEX_SKILL_ID=demo-skill ALICE_WEBHOOK_TOKEN="$token"   ASPNETCORE_URLS="http://127.0.0.1:19088"   dotnet run --no-build -c Release --no-launch-profile --project "$root/AliceVoiceGpt.csproj" > "$log" 2>&1 &
pid=$!
for i in $(seq 1 40); do
    if curl --silent --fail "http://127.0.0.1:19088/health" > /dev/null; then break; fi
    if ! kill -0 "$pid" 2>/dev/null; then cat "$log"; exit 1; fi
    sleep 0.25
done
ALICE_SMOKE_TOKEN="$token" python3 "$root/tests/smoke.py"
if grep -Fq -- "$token" "$log"; then
    echo "FAIL: webhook token leaked into local logs" >&2
    exit 1
fi
echo "PASS: no webhook token in application logs"
