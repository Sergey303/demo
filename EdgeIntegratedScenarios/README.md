# Edge Integrated Scenarios — сравнение rule-only и AI-assisted защиты

**Лаборатория архитектурного решения: как использовать рекомендацию ML-модели, не превращая её в ненадёжный механизм блокировки.** Проект связывает идеи [Edge Network Security](../EdgeNetworkSecurity/README.md) и [Edge AI](../EdgeAI/README.md), но сохраняет независимость их кода и отказоустойчивость детерминированной защиты.

**Текущее состояние:** offline replay и policy engine **реализованы и локально проверены** на размеченных синтетических сценариях. Опциональная интеграция с ONNX Runtime **реализована в исходниках**, но её нативный запуск **ещё требует подтверждения**. Подключения к живому ASP.NET Core/Redis API, реальным Cloudflare/EdgeЦентру/Yandex и реальным атакам **нет**.

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

## Что реализовано

| Компонент | Назначение | Статус |
| --- | --- | --- |
| [Policy engine](ai-assisted-ddos-defense/policy.py) | Различает `allow`, `observe`, `block`; сохраняет приоритет детерминированной блокировки и fallback при ошибке модели | **Локально проверено** |
| [Replay и оценка](ai-assisted-ddos-defense/replay.py) | Читает 12 размеченных искусственных HTTP-окон, вызывает rules-only эвристику, сравнивает исходные и assisted решения | **Локально проверено**, только синтетические данные |
| [Audit и quality report](ai-assisted-ddos-defense/README.md) | Для каждого сценария: источник решения, версия политики, действие; суммарно TP/TN/FP/FN, precision/recall/FPR, число fallback и ошибочных блокировок правилами | **Локальная имитация**, не наблюдаемость продакшена |
| [ONNX-assisted replay](ai-assisted-ddos-defense/onnx_replay.py) | Загружает [сгенерированную модель ONNX](../EdgeAI/implementations/onnx-local/README.md), использует CPU inference в том же policy engine | **Код готов; нативная проверка ожидается** |
| [Тесты](ai-assisted-ddos-defense/tests/test_replay.py) | Нормальные и аномальные окна, ложные тревоги, timeout/exception, некорректные score, граничные значения и запрет модельной блокировки | **Локально пройдены**; [ONNX-тесты](onnx-tests/test_onnx_replay.py) требуют отдельной проверки |

Это **offline композиция**: отдельный [HTTP API с Redis](../EdgeNetworkSecurity/implementations/local/README.md) существует и протестирован, но в данном сценарии пока не вызывает модель и не получает её рекомендации в реальном времени.

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
- **При ошибке модели остаётся правило:** отсутствующий, NaN, бесконечный, недопустимый score или исключение scorer приводят к rule-only fallback. Это реализовано для синхронного offline replay; жёсткая изоляция зависшего inference ещё TODO.
- **Результат объясним:** `policy_id`, `source`, `status=simulated` и `synthetic_id` позволяют воспроизвести решение; это не подписанный неизменяемый аудит и не журнал реальных пользователей.
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

В этом варианте исполняемые операции модели должны выполняться внутри `onnxruntime.InferenceSession`; **нативная проверка текущей версии ожидается** в отдельном CI job `onnx-cpu`. Внутренние расчёты модели могут быть настоящими, но входные сценарии и метки остаются синтетическими. Подробности: [ONNX evidence](EVIDENCE-2026-11-23-ONNX.md).

## Что ещё нужно для полноценного демонстрационного стенда

1. **Versioned contracts и безопасный runtime:** чёткий формат обмена между API, аномальным детектором и policy; ограничение latency, изоляция процесса модели и timeout/fallback.
2. **Реальный HTTP-путь:** подключить рекомендации к [ASP.NET Core/Redis API](../EdgeNetworkSecurity/implementations/local/README.md) без обхода 429/503 и без автоматических AI-блокировок.
3. **Сравнимая приёмка:** одинаковые нагрузки для rule-only и assisted, независимые размеченные данные, false positives, p95/p99 всего запроса, нагрузка origin и поведение при отказах.
4. **Провайдерские ветки:** Cloudflare, EdgeЦентр и Yandex Cloud — только после подтверждения API, тарифов, полномочий, безопасности origin и разрешённой тестовой площадки.

Рабочие задания Codex находятся [рядом с policy/replay](ai-assisted-ddos-defense/TASK.md), в [общем плане](EXECUTION_PLAN.md) и в [правилах агентов](AGENTS.md). Отдельные протоколы: [HTTP](EVIDENCE-2026-11-23-HTTP.md), [Redis](EVIDENCE-2026-11-23-REDIS.md), [ONNX](EVIDENCE-2026-11-23-ONNX.md).

**Назначение проекта — показать проверяемые инженерные компромиссы и безопасные границы интеграции ML, а не заявить о готовой промышленной anti-DDoS-системе.**
