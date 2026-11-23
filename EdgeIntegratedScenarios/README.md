# Edge Integrated Scenarios — сравнение rule-only и AI-assisted защиты

**Лаборатория архитектурного решения: как использовать рекомендацию ML-модели, не превращая её в ненадёжный механизм блокировки.** Проект связывает идеи [Edge Network Security](../EdgeNetworkSecurity/README.md) и [Edge AI](../EdgeAI/README.md), но сохраняет независимость их кода и отказоустойчивость детерминированной защиты.

**Текущее состояние:** offline replay и policy engine **реализованы и локально проверены** на размеченных синтетических сценариях. Опциональная интеграция с ONNX Runtime **реализована в исходниках**, и её нативный запуск **подтверждён локальными ONNX-тестами**. Локальный HTTP-эксперимент связывает реальные ответы ASP.NET Core с последующим offline replay. Опциональная inline-интеграция с ASP.NET Core API **реализована и проверена локально** (только 200 после обязательного rate limiter; при отказе — rule-only fallback). Промышленная производительность, асинхронная обработка и облачные интеграции остаются открытыми.

## Единый офлайн-запуск

Из корня репозитория:

```bash
python3 -B EdgeIntegratedScenarios/run.py
```

Команда запускает четыре fixture-этапа в порядке BGP → Anycast → anomaly →
policy. BGP и Anycast используют отдельные симуляции из исходных проектов.
Policy replay вызывает тот же эвристический scorer для собственного набора
окон. Для запуска достаточно Python и файлов репозитория. Каждый дочерний
процесс получает пустое окружение, ограничен пятью секундами и отклоняет
операции с сокетами и запуск новых процессов через Python audit hook. Этот
контроль предназначен для доверенного кода репозитория.

В stdout выводится один JSON-документ со схемой версии 1, путями и SHA-256
входных файлов, счётчиками и случаями отказа. BGP использует индексы событий с
нуля. Anycast суммирует события по всем стадиям. Policy фиксирует срабатывания
fallback и рекомендации `observe`. При ошибке этапа сохраняются результаты
других этапов, а команда завершает работу с кодом 1. [Пример измеренного
локального запуска на синтетических данных](EVIDENCE-OFFLINE.json).

Cloudflare, Yandex Cloud и EdgeCenter имеют статус `blocked` до подтверждения
возможностей API и прав доступа, согласования тестового окружения и отдельной
провайдерской приёмки. Симуляции показывают поведение заданных моделей
маршрутизации и политики на синтетических данных.

[Инвентарь задач](TASK-INVENTORY.md) строится из исходных `TASK.md` трёх edge
проектов. Команда обновления и проверка актуальности:

```bash
python3 -B EdgeIntegratedScenarios/task_inventory.py
python3 -B EdgeIntegratedScenarios/task_inventory.py --check
```

## Панель просмотра результатов

React/Vite читает [офлайн-реплей](EVIDENCE-OFFLINE.json) и [локальный HTTP-эксперимент](EVIDENCE-HTTP-ADVICE.json) при сборке. Панель показывает симуляции, измерения loopback HTTP, результаты offline advice и заблокированные облачные проверки. Небольшие синтетические выборки ограничивают интерпретацию счётчиков и задержек.

Из корня репозитория, с Node.js 20.19+ (ветка 20) или 22.12+:

```bash
cd EdgeIntegratedScenarios/dashboard
npm ci
npm test
npm run build
npm run preview
```

Откройте `http://127.0.0.1:4173`. Для разработки используйте `npm run dev`.
Браузер загружает статические ресурсы с локального сервера. Для запуска панели
после установки зависимостей достаточно локальных файлов. Изменения JSON
требуют повторной сборки или перезапуска dev-сервера. Проверки и следующие
задачи описаны в [dashboard/TASK.md](dashboard/TASK.md).

## Что реализовано

| Компонент | Назначение | Статус |
| --- | --- | --- |
| [Policy engine](ai-assisted-ddos-defense/policy.py) | Различает `allow`, `observe`, `block`; сохраняет приоритет детерминированной блокировки и fallback при ошибке модели | **Локально проверено** |
| [Replay и оценка](ai-assisted-ddos-defense/replay.py) | Читает 12 размеченных искусственных HTTP-окон, вызывает rules-only эвристику, сравнивает исходные и assisted решения | **Локально проверено**, только синтетические данные |
| [Audit и quality report](ai-assisted-ddos-defense/README.md) | Для каждого сценария: источник решения, версия политики, действие; суммарно TP/TN/FP/FN, precision/recall/FPR, число fallback и ошибочных блокировок правилами | **Локальная имитация**, не наблюдаемость продакшена |
| [ONNX-assisted replay](ai-assisted-ddos-defense/onnx_replay.py) | Загружает [сгенерированную модель ONNX](../EdgeAI/implementations/onnx-local/README.md), использует CPU inference в том же policy engine | **CPU inference проверен локально** |
| [Тесты](ai-assisted-ddos-defense/tests/test_replay.py) | Нормальные и аномальные окна, ложные тревоги, timeout/exception, некорректные score, граничные значения и запрет модельной блокировки | **Локально пройдены**; [ONNX-тесты](onnx-tests/test_onnx_replay.py) (2) пройдены локально |

## Локальный HTTP-эксперимент

Запустите два экземпляра [LocalEdgeApi](../EdgeNetworkSecurity/implementations/local/README.md)
на IPv4 loopback. Для первого задайте `LOCAL_EDGE_PORT=5088`,
`LOCAL_EDGE_PERMITS=4`, `LOCAL_EDGE_WINDOW_SECONDS=60` и оставьте
`LOCAL_EDGE_REDIS_PORT` незаданным. Для второго задайте
`LOCAL_EDGE_PORT=5089` и `LOCAL_EDGE_REDIS_PORT` с выделенным, гарантированно
недоступным портом loopback. Используйте отдельные экземпляры без другого трафика.

```bash
python3 -B EdgeIntegratedScenarios/run_http.py --rate-port 5088 --unavailable-port 5089
RUN_EDGE_HTTP_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v
```

Опциональный тест сам поднимает оба процесса. Ему нужны .NET 10 SDK и локальный
кэш NuGet проекта. Сборка использует пустой локальный источник и временный
каталог артефактов. Тест резервирует порт зависимости и не запускает Redis.

Два последовательных прогона существующего probe используют один профиль
GET `/api/expensive`, по одной секунде отправки на фазу, максимум 10 RPS и
20 попыток суммарно. Общий дедлайн отправки — 60 секунд. Probe отключает прокси и редиректы. JSON v1 сохраняет
счётчики и задержки в `http_observations`. Ожидаемые коды первой фазы —
200 и 429, второй — 503 при недоступности Redis. Другая комбинация или ошибка
транспорта сохраняет измерения, пропускает советы для этой фазы и даёт exit 1.
[JSON измеренного прогона](EVIDENCE-HTTP-ADVICE.json).

В `offline_policy_comparison` оба варианта используют одни и те же счётчики.
Окно содержит число попыток, настроенную длительность, число 429/503 и
синтетическую норму 1 RPS. При пороге 0.5 совет может отметить только группу
200, группа 429 сохраняет только HTTP-ограничение частоты (`rate_limited`), не WAF-блокировку, а 503 остаётся недоступностью.
Это сравнение советов после HTTP, поэтому задержки probe не включают оценку
модели. Модель не получает доступа к маршруту или настройкам API.

По умолчанию используется эвристика. `--onnx [ARTIFACT_DIR]` включает
существующий CPU scorer с локальными артефактами. Лимит в пять секунд включает
инициализацию и inference. При тайм-ауте, отсутствии модели или ошибке
возвращается исходное решение правила. Runner ничего не загружает.

## Локальная inline-рекомендация в ASP.NET Core (опционально)

Реальный `GET /api/expensive` может **после** выполнения защищённого действия вызвать [`inline_advisory.py`](ai-assisted-ddos-defense/inline_advisory.py) через настроенный абсолютный путь к Python. Внешние HTTP-поля в модель не передаются: используются лишь агрегированные per-replica счётчики запросов и статусов в ограниченном временном окне. В режиме Redis запросы 429/503 проходят через прежние правила и **не запускают модель**. Для 200 ответ содержит отдельное поле `advisory`, где разрешены только `allow/observe`; при сбое — `rule-only`. По умолчанию интеграция **выключена**.

[Независимый тест реального HTTP → ONNX](tests/test_inline_end_to_end.py) включает флаг `RUN_EDGE_INLINE_FULL_TESTS=1` и требует .NET 10, Linux, libseccomp и pinned ONNX-зависимости. В нашем локальном эксперименте один ответ занял **2.61 с**, повторный **2.54 с**; ещё один тестовый вызов **2.71 с**. Это измерения только RDC, а не SLA. Требуется P0 на persistent worker/асинхронную очередь и измерение p95/p99 без блокировки ответа.

См. [инженерный протокол](EVIDENCE-2026-11-23-INLINE-API.md), [настройки ASP.NET](../EdgeNetworkSecurity/implementations/local/README.md) и TODO в [локальном API](../EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/TASK.md).

## Inline advisory CLI

The standalone [Python worker](ai-assisted-ddos-defense/inline_advisory.py)
accepts one UTF-8 JSON object over stdin. The caller sends at most 4096 bytes
and closes stdin. All four fields are required integers: `requests` and
`baseline_rps` in 0–10,000,000, `seconds` in 1–3600, and `errors` in
0–`requests`.

```bash
printf '%s' '{"requests":10,"seconds":1,"errors":0,"baseline_rps":10}' |
  python3 -I -B "$PWD/EdgeIntegratedScenarios/ai-assisted-ddos-defense/inline_advisory.py" \
    --timeout-ms 2500 --threshold 0.8
```

A successful response contains `schema_version`, `action`, `source`, `score`,
`fallback`, `status` and `policy_id`. A score at or above the threshold returns
`observe`. Lower scores return `allow`. The recommendation is always simulated
and carries policy ID `demo-policy-v1`. The adapter should pin the threshold to
0.8. The CLI accepts finite thresholds in [0, 1].

The optional `--artifact-dir` takes a trusted absolute directory containing
locally generated artifacts. Omit it for deterministic rules. On Linux, the
existing scorer uses a seccomp-filtered CPU ONNX child. A missing or unusable
model yields `rule-only` / `unavailable`. An expired scoring budget yields
`rule-only` / `timeout`. Input and scoring share the 100–2500 ms budget.
The caller still owns the whole-process deadline, which includes interpreter
startup, filesystem setup, and cleanup. A CLI error yields a nonzero exit,
empty stdout and a fixed diagnostic on stderr. The caller must apply its own
deterministic fallback when the CLI fails or its response is invalid.

The tests exercise the Python CLI directly. ASP.NET adapter acceptance and
HTTP request latency remain open.

```bash
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_advisory.py -v
# Linux with the local EdgeAI ONNX dependencies and libseccomp installed:
RUN_EDGE_INLINE_ONNX_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_advisory.py -v
```

## Поток данных и инварианты

```text
           fixtures.jsonl (12 синтетических размеченных окон)
                              |
                   deterministic rule_action
                      /                   \
               Rule-only              Advisory scorer
               baseline         эвристика или опциональный ONNX
                      \                   /
                       policy.decide(...)
                              |
                     allow / observe / block
                              |
            JSON audit + confusion matrix + fallback counters
```

Главные гарантии текущей политики:

- **AI не блокирует сам:** высокое значение score может изменить только `allow → observe`. Это сигнал для проверки, а не действие WAF.
- **Детерминированный `block` сохраняется:** модель не переводит его в `allow`.
- **При ошибке модели остаётся правило:** отсутствующий, NaN, бесконечный, недопустимый score или исключение scorer приводят к rule-only fallback. Это реализовано для синхронного offline replay; изолированный Python worker уже имеет Linux seccomp и жёсткий дедлайн, но это не исправляет высокую задержку запуска отдельного процесса на каждый HTTP 200.
- **Результат объясним:** `policy_id`, `source`, `status=simulated` и `synthetic_id` позволяют воспроизвести решение; аудит содержит только синтетические идентификаторы.
- **Честная метрика:** `observe` и `block` вместе считаются как *выявленные/отмеченные* случаи. Рост recall отметок **не означает рост доли отражённых атак**.

## Воспроизведение без ML

Из корня репозитория, только Python 3.12+ и стандартная библиотека:

```bash
python3 EdgeIntegratedScenarios/ai-assisted-ddos-defense/replay.py
python3 -B -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v
```

На искусственной выборке тестируется повышение обнаружения потенциальных аномалий ценой дополнительных ложных тревог. Результаты **нельзя интерпретировать как accuracy анти-DDoS на реальном трафике**. См. [описание сценария](ai-assisted-ddos-defense/README.md) и [протокол исходных локальных проверок](EVIDENCE-2026-11-23.md).

## Опциональное выполнение через ONNX

После явной установки зависимостей и генерации синтетической модели по [инструкции EdgeAI](../EdgeAI/implementations/onnx-local/README.md):

```bash
python3 EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py
python3 -B -m unittest discover -s EdgeIntegratedScenarios/onnx-tests -v
```

В этом варианте исполняемые операции модели должны выполняться внутри `onnxruntime.InferenceSession`; **нативная проверка выполнена локально**; статус GitHub Actions `onnx-cpu` проверяется отдельно. Внутренние расчёты модели могут быть настоящими, но входные сценарии и метки остаются синтетическими. Подробности: [актуальная независимая приёмка ONNX](EVIDENCE-CODEX-2026-11-23.md).

## Что ещё нужно для полноценного демонстрационного стенда

1. **Versioned contracts и безопасный runtime:** чёткий формат обмена между API, аномальным детектором и policy; ограничение latency, изоляция процесса модели и timeout/fallback.
2. **Реальный HTTP-путь:** подключить рекомендации к [ASP.NET Core/Redis API](../EdgeNetworkSecurity/implementations/local/README.md) без обхода 429/503 и без автоматических AI-блокировок.
3. **Сравнимая приёмка:** одинаковые нагрузки для rule-only и assisted, независимые размеченные данные, false positives, p95/p99 всего запроса, нагрузка origin и поведение при отказах.
4. **Провайдерские ветки:** Cloudflare, EdgeЦентр и Yandex Cloud — только после подтверждения API, тарифов, полномочий, безопасности origin и разрешённой тестовой площадки.

Рабочие задания Codex находятся [рядом с policy/replay](ai-assisted-ddos-defense/TASK.md), в [общем плане](EXECUTION_PLAN.md) и в [правилах агентов](AGENTS.md). Отдельные протоколы: [HTTP](EVIDENCE-2026-11-23-HTTP.md), [Redis](EVIDENCE-2026-11-23-REDIS.md), [ONNX](EVIDENCE-2026-11-23-ONNX.md).

[Полная локальная приёмка третьей волны: 127 тестов](EVIDENCE-CODEX-WAVE3-2026-11-23.md).

**Назначение проекта — показать проверяемые инженерные компромиссы и безопасные границы интеграции ML, а не заявить о готовой промышленной anti-DDoS-системе.**
