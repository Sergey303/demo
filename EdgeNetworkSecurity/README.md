# Edge Network Security — BGP, Anycast, L7 rate limiting и anti-DDoS

**Инженерная лаборатория сетевой устойчивости и защиты HTTP-сервисов.** Проект показывает, как соотносятся маршрутизация между автономными системами, распределение трафика через Anycast, ограничение нагрузки на приложение и провайдерская защита. Это четыре **разных уровня архитектуры**, а не четыре названия одного механизма.

**Текущее состояние:** BGP/Anycast — исполняемые **симуляции**; ASP.NET Core и Redis — **реальная локальная реализация с HTTP-тестами**; Cloudflare — **локально протестированный Worker**; EdgeЦентр и Yandex Cloud — **локально проверяемые контракты staging**, но все три провайдера **без развертывания**.

## Что можно изучить в коде

| Подсистема | Что уже реализовано | Статус и границы |
| --- | --- | --- |
| [BGP best-path](simulator/bgp/README.md) | Выбор альтернативного пути по Local Preference, длине AS_PATH и стабильному tie-break; announce/withdraw, JSON replay и негативные тесты | **Симуляция:** нет BGP-сессий, настоящих AS-политик и измерения convergence |
| [Anycast routing](simulator/anycast/README.md) | Выбор виртуальной площадки по стоимости маршрута, перегрузка, отказ/возврат узла, смена пути и потеря состояния сессии | **Симуляция:** нет реальных префиксов, ECMP или географического роутинга |
| [ASP.NET Core API](implementations/local/README.md) | .NET 10, `/health`, `/api/expensive`, `/metrics`; fixed-window **429**, локальный предел одновременных операций **503**, восстановление | **Локально проверено:** L7, без публичного ingress |
| [Общая квота Redis](implementations/local/src/LocalEdgeApi/RedisQuota.cs) | Атомарный Lua fixed-window по Redis `TIME`, один ключ на namespace для нескольких API, **503 при недоступном Redis**, переподключение | **Локально проверено:** два экземпляра; не Redis Cluster и не распределённый семафор |
| [Безопасный HTTP-пробник](shared/traffic-generator/README.md) | Реальные ответы 200/429/503, p50/p95, счётчики ошибок, SHA-256 сценария | Только **loopback**, не более **10 запросов/с**, **60 с**, 600 обращений; без переходов по редиректам |
| [Провайдерские реализации](#облачные-реализации) | Разделённые каталоги, границы возможностей, TODO и критерии приёмки | **Есть локальный Worker и офлайн-контракты:** сервисы не подключены, IaC не применялся |

Разделение принципиально: **локальный rate limiter не останавливает объёмную атаку L3/L4**, Anycast не гарантирует равномерную загрузку, а HTTP 429 не означает наличия глобальной anti-DDoS-сети.

## Архитектурная идея

```text
Маршрут до edge:    BGP / Anycast (сейчас только моделирование)
                                     |
Защита на edge:     CDN / WAF / L3-L4 anti-DDoS (провайдерские TODO)
                                     |
Локальный стенд:    HTTP API -> fixed-window / Redis shared quota
                                     |
Сервис:             /api/expensive -> bounded concurrency -> 200 / 429 / 503
                                     |
Проверка:           loopback probe -> HTTP-статусы, latency, error counters
```

Симуляторы и HTTP-стенд **не подключены к одной реальной BGP/Anycast-сети**. Это независимые лабораторные срезы, которые можно исследовать и расширять отдельно.

## Как воспроизвести

Из корня `demo`:

```bash
# BGP/Anycast: только стандартная библиотека Python, никаких сетевых запросов
python3 EdgeNetworkSecurity/simulator/bgp/replay.py EdgeNetworkSecurity/simulator/bgp/withdraw-recovery.json
python3 EdgeNetworkSecurity/simulator/anycast/replay.py EdgeNetworkSecurity/simulator/anycast/two-sites-failover.json

# Реальный локальный HTTP-сервис (.NET 10 SDK)
dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj

# В другом терминале: ограниченная проверка только 127.0.0.1
python3 EdgeNetworkSecurity/shared/traffic-generator/probe.py \
  --scenario EdgeNetworkSecurity/shared/traffic-generator/example-429.json \
  --url http://127.0.0.1:5088/api/expensive
```

Проверки:

```bash
python3 -B -m unittest discover -s EdgeNetworkSecurity/simulator/bgp/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/simulator/anycast/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/shared/traffic-generator/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Необязательные настоящие Redis 7 integration tests; нужен Docker
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

Обычная тестовая команда для API не требует Redis-контейнера: Redis-тесты пропускаются без явного `RUN_REDIS_TESTS=1`. Внутри вложенного контейнера `rdc-project` применяется дополнительная переменная `EDGE_REDIS_NETWORK_CONTAINER=rdc-project`; подробности и ограничения — в [инструкции локального стенда](implementations/local/README.md). Текущие настройки сервера привязаны к `127.0.0.1`, не предназначены для внешнего трафика.

## Облачные реализации

| Вариант | Что планируется показать | Что реально есть сейчас |
| --- | --- | --- |
| [Cloudflare](implementations/cloudflare/README.md) | Worker, WAF, L7 rate limits, origin protection, Terraform; провайдерский Anycast отдельно от Worker | [Worker с тестами](implementations/cloudflare/workers/request-guard/README.md) и [TASK.md](implementations/cloudflare/TASK.md); **нет развернутой конфигурации** |
| [EdgeЦентр (РФ)](implementations/edgecenter-ru/README.md) | CDN, anti-DDoS, WAF, DNS, проверка доступных API/IaC и условий тарифа | [Офлайн-контракт](implementations/edgecenter-ru/contract/README.md) с тестами и [TASK.md](implementations/edgecenter-ru/TASK.md); **тариф не подтверждён** |
| [Yandex Cloud (РФ)](implementations/yandex-cloud/README.md) | Smart Web Security, WAF, Advanced Rate Limiter, DDoS Protection, Cloud CDN, Terraform | [Офлайн-контракт](implementations/yandex-cloud/contract/README.md) с тестами и [TASK.md](implementations/yandex-cloud/TASK.md); **ресурсы не создавались** |

Наличие Anycast DNS не доказывает Anycast для HTTP-трафика. ML-функции WAF нельзя автоматически считать возможностью запуска собственных моделей Edge AI.

## Доказательства, ограничения и продолжение

Реальные локальные проверки зафиксированы в [HTTP-отчёте](../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-HTTP.md) и [Redis-отчёте](../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-REDIS.md): для двух API с одной квотой зафиксированы 4 разрешённых запроса и 8 ответов 429; отдельно проверены потеря Redis и восстановление. Это не подтверждение внешнего SLA или cloud CI; изменения тестовых границ после прогона требуют повторной проверки.

**Что остаётся:** распределённое ограничение одновременных операций, Redis failover/ACL/TLS, trusted reverse proxy, реальные провайдерские конфигурации, тесты latency/SLO на изолированном стенде. Задачи Codex лежат [у кода локального API](implementations/local/src/LocalEdgeApi/TASK.md), [в симуляторах](simulator/README.md), [у провайдеров](implementations/yandex-cloud/TASK.md) и в [общем плане](../EdgeIntegratedScenarios/EXECUTION_PLAN.md). См. также [архитектурные критерии](docs/ARCHITECTURE.md) и [правила работы агентов](AGENTS.md).

**Связанные проекты:** [EdgeAI](../EdgeAI/README.md) — независимый inference; [EdgeIntegratedScenarios](../EdgeIntegratedScenarios/README.md) — сравнение rule-only и AI-assisted решений на синтетическом трафике. В продакшен эта лаборатория не развёрнута.
