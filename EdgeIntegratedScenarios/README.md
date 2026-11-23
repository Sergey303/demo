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

[Независимый тест реального HTTP → ONNX](tests/test_inline_end_to_end.py) включает флаг `RUN_EDGE_INLINE_FULL_TESTS=1` и требует .NET 10, Linux, libseccomp и pinned ONNX-зависимости. В нашем локальном эксперименте один ответ занял **2.61 с**, повторный **2.54 с**; ещё один тестовый вызов **2.71 с**. Это измерения только RDC, а не SLA. Persistent worker теперь реализован и локально проверен; P0 остаются предзагрузка модели/асинхронный advisory и измерение p95/p99 под безопасной нагрузкой.

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

## Fifth-wave persistent ONNX transport (standalone)

[`persistent_worker.py`](ai-assisted-ddos-defense/persistent_worker.py) keeps one
trusted `OnnxWindowScorer` / CPU session alive for serial requests. It does not
change the one-shot CLI. **Persistent ASP.NET integration and two real native HTTP scoring runs
have now been independently verified**, documented in [merged evidence](EVIDENCE-2026-11-23-PERSISTENT-HTTP.md). The standalone transport tests alone
do not establish HTTP behavior; production latency/load acceptance remains open.

The C# parent must launch exactly this argument layout (absolute executable,
script and existing artifact directory; no shell):

```text
python -I -B <ABS path EdgeIntegratedScenarios/ai-assisted-ddos-defense/persistent_worker.py> --artifact-dir <ABS existing dir> [--threshold 0.8]
```

Use the Python executable from the pinned ONNX venv. No model or dependency is
downloaded. Threshold defaults to 0.8 and must be finite in [0,1]. Linux and the
existing libseccomp filter are mandatory: the filter is installed before ONNX
imports or graph loading; failure exits closed. Native stdout/stderr diagnostics
are suppressed to prevent model/path details entering the protocol.

Successful initialization emits and flushes exactly one UTF-8 NDJSON line:

```json
{"schema_version":1,"kind":"ready","model":"onnx-cpu"}
```

Send one JSON window per line, with a terminating LF and at most **4096 UTF-8
bytes including LF**. Required fields and integer bounds match the one-shot CLI:
`requests` and `baseline_rps` 0–10,000,000, `seconds` 1–3600, `errors`
0–`requests`. Duplicate/unknown fields, nesting, booleans, floats, nonfinite
constants, malformed UTF-8/JSON and unterminated frames are rejected. Empty EOF
exits successfully. Each valid window receives one immediately flushed line of
at most 2048 bytes, with exactly these seven fields:

```json
{"schema_version":1,"action":"allow","source":"onnx-cpu","score":0.2,"fallback":"none","status":"simulated","policy_id":"demo-policy-v1"}
```

Scores at/above the threshold produce `observe`; the worker never returns
`block` or invents a fallback score. Startup failure emits no ready/response;
a bad frame or inference error emits no response for that request. Failures
exit nonzero with only `persistent worker failed\n` on stderr. Earlier successful
responses remain valid. No input contents are echoed.

The parent must wait for ready under a startup deadline, allow **one outstanding
request maximum**, enforce request deadlines and response byte/schema limits,
and kill/reap/restart on timeout, EOF, nonzero exit or invalid response. An idle
worker intentionally waits for input; it has no internal request timer. Apply
deterministic rule-only fallback in the parent. Model inference runs serially.
This is a synthetic advisory model, not validated DDoS protection.

```bash
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_persistent_worker.py -v
# Explicit opt-in; run using an existing venv with the exact EdgeAI requirements:
RUN_EDGE_PERSISTENT_ONNX_TESTS=1 /ABS/PINNED_VENV/bin/python -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_persistent_worker.py -v
```

Native tests build only local synthetic artifacts inside this subtree, require
NumPy 2.2.6 / ONNX 1.19.1 / ONNX Runtime 1.23.2 in a venv, and check two requests
with the same PID after moving artifacts away (reloading the session would fail),
malformed/oversized frames and parent timeout/kill/restart. Stdlib fixtures are
explicitly separate from actual native inference evidence.

## Persistent HTTP → ONNX acceptance (fifth wave)

The opt-in [ASP.NET Core persistent mode](../EdgeNetworkSecurity/implementations/local/README.md)
uses a single inherited stdin/stdout pipe to a Linux seccomp-filtered
[CPU ONNX worker](ai-assisted-ddos-defense/persistent_worker.py) per API process.
It reuses one validated model session across successful 200 responses, with
one outstanding scoring request, exact bounded JSON frames, separate startup
and scoring deadlines, a 750 ms restart cooldown and deterministic
rules-only fallback. **HTTP quota admissions and 429/503 are unchanged.**
It is disabled by default, while the earlier opt-in one-shot mode remains.

Two independently repeated genuine HTTP→ONNX runs on RDC measured
cold/warm **3816.63/4.24 ms** and **2975.05/8.03 ms**. The first
request still pays native startup. These are **two observations only, not
p50/p95/p99, throughput or production SLA**. Private process pipes and trusted
paths are not a replacement for broader service security or authorization.

See [merged E2E evidence](EVIDENCE-2026-11-23-PERSISTENT-HTTP.md)
and the [opt-in tests](tests/test_inline_end_to_end.py).

### Opt-in API prewarm acceptance

**Pending an independent E2E run after the API change merges.** The suite
starts the real Linux seccomp worker with `LOCAL_EDGE_ADVISORY_ENABLED=1`,
`LOCAL_EDGE_ADVISORY_MODE=persistent`, and `LOCAL_EDGE_ADVISORY_PREWARM=1`.
It polls `/metrics` for up to 15 seconds after API health, before sending
any `/api/expensive` requests. It checks `advisoryWorkerReady`,
`advisoryPrewarmAttempts`, and `advisoryPrewarmFailures` alongside the
request and scorer counters. Two HTTP 200 ONNX responses after moving
the artifacts aside establish reuse of the initialized session. A third
request must return HTTP 429 without scoring. The suite logs both warm
HTTP latencies and allows up to 1000 ms per request as a local smoke bound.
It also covers lazy startup with the flag unset and missing-model prewarm
with rule-only fallback and healthy `/ready`.

After merge, run from the repository root with Linux, libseccomp, the .NET 10
SDK, the API's NuGet dependencies already in the local package cache, and a
venv with the pinned [ONNX dependencies](../EdgeAI/implementations/onnx-local/requirements.txt).
The test build uses an empty local package source and writes its artifacts
to a temporary directory under EIS.

```bash
RUN_EDGE_INLINE_FULL_TESTS=1 /ABS/PINNED_VENV/bin/python -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_end_to_end.py -v
```

For a separate local measurement, point the stdlib sampler at an already
running disposable API on IPv4 loopback. It reports nearest-rank p50/p95/p99
time to response headers for HTTP 200, separate non-200 and transport failure
counts, and a status breakdown. It accepts 1–10 RPS and 1–60 seconds.

```bash
python3 -B EdgeIntegratedScenarios/sample_latency.py --port 5088 --rps 2 --seconds 10
```
