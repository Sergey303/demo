# Edge Network Security — архитектура, границы доверия и готовность

Этот документ описывает **фактическое** устройство [EdgeNetworkSecurity](../README.md) и целевую архитектуру его провайдерских веток. Нельзя считать реализацию Cloudflare/EdgeЦентра/Yandex готовой на основании работающего локального rate limiter.

## Четыре уровня, которые нельзя смешивать

| Уровень | Назначение | Что есть в репозитории |
| --- | --- | --- |
| Control plane / BGP | Выбор пути, announcements и withdrawals между маршрутизаторами/AS | Только [детерминированная модель](../simulator/bgp/README.md); реальных BGP-сессий нет |
| Распределение по площадкам / Anycast | Общий виртуальный адрес, неодинаковые маршруты, отказ и перемещение клиентских потоков | Только [симуляция маршрутизации](../simulator/anycast/README.md); без публикации префикса |
| Провайдерский edge | CDN, WAF, anti-DDoS L3/L4/L7, защита origin | [Cloudflare](../implementations/cloudflare/README.md), [EdgeЦентр](../implementations/edgecenter-ru/README.md), [Yandex Cloud](../implementations/yandex-cloud/README.md) — **планы/TODO**, без развернутой конфигурации |
| Origin/application L7 | Ограничить запросы и параллельную работу сервиса, сохранить liveness при сбоях | Настоящий [ASP.NET Core API + Redis](../implementations/local/README.md), HTTP 429/503, fail-closed Redis, реальные локальные тесты |

## Архитектура целевой системы (не развернута)

```text
                              DNS / BGP / Anycast
client -----------------------------------> edge site
                                            | anti-DDoS L3/L4 — provider
                                            | WAF / L7 filters — provider
                                            | optional CDN — provider
                                            v
                                     trusted origin boundary
                                            |
                                      HTTP API / rate quota
                                            |
                              Redis shared fixed-window (optional)
                                            |
                                    protected application
```

В фактическом `local` варианте **нет** DNS/BGP/Anycast, CDN, trusted origin gateway или WAF. API работает на loopback. Redis и лимит одновременных операций независимы: Redis даёт **общую квоту на количество запросов**, `SemaphoreSlim` — **локальный лимит активных запросов** каждого процесса.

## Инварианты и сценарии проверки

- **Штатная нагрузка:** пользовательский HTTP-пробник ограничен до 10 RPS/60 с, допускает только буквальный loopback IP и фиксированные маршруты; редиректы/прокси отключены.
- **Лимит:** 429 означает отказ по частоте; 503 может означать занятость локального semaphore **или** недоступность Redis. Различение фиксируется кодом ответа и внутренними счётчиками, без персональных меток.
- **Отказ Redis:** в Redis-режиме запрос к дорогостоящему API возвращает 503; переключение на независимые локальные лимиты запрещено, чтобы не ослабить общую квоту. `/health` остаётся liveness, не dependency readiness.
- **Два API:** одинаковые namespace/параметры должны давать общую квоту, поэтому запросы, отправленные разным экземплярам, учитываются в одном атомарном Redis-скрипте по серверному времени.
- **Simulated outage:** падение виртуального edge в модели Anycast не является доказательством работоспособности настоящей сети провайдера.
- **ML-advisory:** [EdgeAI](../../EdgeAI/README.md) и [EdgeIntegratedScenarios](../../EdgeIntegratedScenarios/README.md) существуют отдельно. Локальный HTTP API поддерживает [опциональный advisory](../implementations/local/README.md#opt-in-inline-ai-advisory) через Python CLI после проверки квоты. В новом opt-in persistent mode Linux seccomp ONNX-процесс повторно используется между HTTP 200; остальные HTTP-статусы и решения квоты неизменны. [Реальная локальная приёмка](../../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-PERSISTENT-HTTP.md) фиксирует холодную задержку 3–4.5 с и прогретую 4–13 мс на RDC, не производственный SLA.

## Проверенные этапы и приёмка следующего

| Критерий | Состояние |
| --- | --- |
| Воспроизводимый BGP/Anycast replay, отказ площадки и восстановление | **Локально проверено как simulation** |
| Ограниченный HTTP-пробник и настоящие ответы 200/429/503 на loopback | **Локально проверено** |
| Общая Redis-квота: два процесса, атомарность, cold/warm outage и recovery | **Локально проверено**; тестовая доработка границы окна ожидает дополнительной CI-проверки |
| Отсутствие пользовательских данных/токенов в метках локальных счётчиков | **Проверяется текущими тестами/кодом**, не аудитом продакшена |
| Синтетические false positives/false negatives rule-only vs advisory | **Есть в отдельном [offline replay](../../EdgeIntegratedScenarios/README.md)**; не метрики реальных атак |
| Независимые одинаковые сценарии Cloudflare, EdgeЦентра и Yandex Cloud | **TODO**; ни один провайдер не развёрнут |
| Публичная сетевая защита L3/L4, origin shielding, SLA, стоимость, много регионов | **Не реализовано / не проверено** |
| Регламент безопасного провайдерского staged rollout, логи и rollback | **TODO**, без автоматического `apply` |

Локальная доказательная база: [HTTP](../../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-HTTP.md), [Redis](../../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-REDIS.md), [simulator quality](../../EdgeIntegratedScenarios/EVIDENCE-2026-11-23.md).

## Метрики, которые следует сравнивать

Сейчас доступны локальные счётчики запросов, распределение HTTP-статусов и p50/p95 HTTP-пробника, а также синтетические confusion matrices и события отказа модели. Ещё нужно измерить p99 полной latency, origin CPU/RAM, cold/warm Redis failure latency, ложные блокировки легитимных клиентов в независимом корпусе, время сходимости реальных маршрутов, характеристики L3/L4 mitigation и стоимость провайдеров. **Отсутствующие показатели нельзя заполнять вымышленными числами.**

Задачи для Codex CLI: [локальный API](../implementations/local/src/LocalEdgeApi/TASK.md), [Cloudflare](../implementations/cloudflare/TASK.md), [EdgeЦентр](../implementations/edgecenter-ru/TASK.md), [Yandex Cloud](../implementations/yandex-cloud/TASK.md). Все облачные операции выполняются только при явном согласовании контролируемой тестовой среды.
