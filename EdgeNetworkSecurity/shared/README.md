# Edge Network Security — общие сценарии и безопасная нагрузка

Эта папка содержит **минимальный общий формат лабораторных сценариев** и локальный генератор HTTP-запросов. Она не содержит универсальной реализации Cloudflare/EdgeЦентра/Yandex и не является сетевым DDoS-тестером.

| Содержимое | Состояние и назначение |
| --- | --- |
| [Контракт сценария](contracts/scenario.schema.json) | JSON Schema: идентификатор, только `target=local`, 1–60 секунд, 1–10 RPS, перечень профилей |
| [Baseline fixture](scenarios/baseline.json) | Безопасный стартовый пример, 10 секунд × 2 RPS |
| [HTTP-probe](traffic-generator/README.md) | Реализован Python stdlib клиент: только `127.0.0.1`/`[::1]` и разрешённые HTTP-пути, без перенаправлений и HTTP proxy |
| `metrics/` и `evaluation/` | TODO: единая версионированная схема отчёта и провайдер-независимая оценка задержек/ложных блокировок |

**Граница реализации:** JSON Schema перечисляет профили `baseline`, `burst`, `distributed-simulated`, но текущий `probe.py` **принимает только `baseline`**. Другие профили намеренно отклоняются до их безопасной ограниченной реализации.

Проверка:

```bash
python3 -B -m unittest discover -s EdgeNetworkSecurity/shared/traffic-generator/tests -v
```

Никаких внешних IP/доменов, настоящего volumetric load, подмены IP и обходов CDN/WAF. Связанные договорённости — [архитектура](../docs/ARCHITECTURE.md) и [задания Codex для пробника](traffic-generator/TASK.md).
