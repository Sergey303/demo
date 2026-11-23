# Общие контракты, сценарии, метрики

Одинаковые входные данные и оценка для Cloudflare / EdgeЦентр / local. Не переносить провайдерские сущности в общий контракт.

- `contracts/scenario.schema.json` — стартовый формат сценария.
- `scenarios/baseline.json` — безопасный пример.
- `metrics/` — TODO: единые имена и типы метрик, формат отчёта.
- [`traffic-generator/`](traffic-generator/README.md) — реализован безопасный loopback-only HTTP probe, лимит 10 RPS / 60 секунд, отчёт реальных ответов; дополнительные профили нагрузки TODO.
- `evaluation/` — TODO: сопоставление latency, ошибок и ложных блокировок.
