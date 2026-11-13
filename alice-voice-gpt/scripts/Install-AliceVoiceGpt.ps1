# Copies versioned deployment files out of the mounted Git working tree.
# Keeps runtime secrets and .env untouched on subsequent installs.
[CmdletBinding()]
param(
    [string] $Source = (Split-Path -Parent $PSScriptRoot),
    [string] $Destination = 'D:\services\alice-voice-gpt'
)
$ErrorActionPreference = 'Stop'
$Source = [IO.Path]::GetFullPath($Source)
$Destination = [IO.Path]::GetFullPath($Destination)
if (-not (Test-Path -LiteralPath (Join-Path $Source 'compose.yaml'))) {
    throw "No compose.yaml found in source: $Source"
}
if ($Destination.TrimEnd('\').Equals($Source.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase) -or
    $Destination.StartsWith($Source.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination must be outside the Git source tree."
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$files = @(
    'AliceVoiceGpt.csproj', 'Program.cs', 'CodexAnswerer.cs', 'Dockerfile',
    'compose.yaml', '.dockerignore', '.env.example',
    'Caddyfile.alice.caddy', 'README.md'
)
foreach ($name in $files) {
    Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $Destination $name) -Force
}
$envPath = Join-Path $Destination '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath (Join-Path $Source '.env.example') -Destination $envPath
}
$secretDir = Join-Path $Destination 'secrets'
New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
$tokenPath = Join-Path $secretDir 'alice_webhook_token'
if (-not (Test-Path -LiteralPath $tokenPath)) {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    $token = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    [IO.File]::WriteAllText($tokenPath, $token, [Text.UTF8Encoding]::new($false))
}
Write-Host "Installed files into: $Destination"
Write-Host 'Existing .env and webhook token were preserved; the Codex Docker login volume is managed separately.'
Write-Host "Next: docker compose build; docker compose run --rm --entrypoint codex app login --device-auth"
Write-Host "Then: cd '$Destination'; docker compose config --quiet; docker compose up -d"
