# AppForge generated admin production package

Generated at UTC: 2026-11-09T11:07:23.0960404Z

## Source

- Spec: /workspace/demo/appforge-admin/business-operations.md
- Spec SHA-256: e5c91382352be3aeaa38bebd5a1334f6168bb783b7e94e122bd50eebe75d2877
- Model: Business Operations Admin
- Project: BusinessOperationsAdmin.Persistence
- Runtime profile: production
- Generator: AppForge.MdToDomain 0.1.0

## Package structure

```text
backend/           Generated .NET backend, solution, preserved EF migration chain, and idempotent migration-chain SQL.
backend-contract/  Canonical backend-contract JSON artifacts.
frontend/          Generated TypeScript bindings and React/PrimeReact components/pages.
frontend-app/      Production Vite app and deployable static bundle under dist/.
deploy/            Self-contained single-VPS Docker Compose production preset.
manifest/          Package manifest and backend-contract generator config.
docs/              Package-local runbook and delivery notes.
```

## Verification

```powershell
dotnet build "/workspace/demo/appforge-admin/generated/backend/BusinessOperationsAdmin.Persistence.csproj"
Test-Path "/workspace/demo/appforge-admin/generated/backend/BusinessOperationsAdmin.slnx"
Test-Path "/workspace/demo/appforge-admin/generated/backend/Migrations/AppForgeGeneratedMigrations.idempotent.sql"
Test-Path "/workspace/demo/appforge-admin/generated/backend-contract/meta/domains.json"
Test-Path "/workspace/demo/appforge-admin/generated/frontend/runtime/httpClient.ts"
Test-Path "/workspace/demo/appforge-admin/generated/frontend-app/dist/index.html"
Test-Path "/workspace/demo/appforge-admin/generated/deploy/production/docker-compose.production.yml"
Test-Path "/workspace/demo/appforge-admin/generated/deploy/production/.env.production.example"
Test-Path "/workspace/demo/appforge-admin/generated/manifest/package-manifest.json"
```

The package was generated from an explicit SpecPath. No fixture-specific project or assembly name is assumed by the pipeline.
