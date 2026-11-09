# AppForge packaged production deploy preset

Model: Telegram Operations Admin
Backend project: TelegramOperationsAdmin.Persistence

This directory is a self-contained P0 single-VPS Docker Compose preset for this generated package.
Run all commands from the generated package root.

## Services

- PostgreSQL
- generated ASP.NET API
- generated static React/PrimeReact admin app
- public reverse proxy
- one-off dedicated database migrator
- one-off seed service

## Important boundary

Normal API startup does not apply migrations or seed data automatically.
Use the explicit db-migrate and api-seed profiles from RUNBOOK.md. The API image is not a migration owner.
The public HTTP endpoint is intended to sit behind an outer TLS/WAF layer for customer production deployment.
