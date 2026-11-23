# Cloudflare — план реализации Edge Network Security

**Статус: архитектурный каркас и задания Codex; Cloudflare-ресурсы не созданы.** В этой ветке нет действующего Worker, применённого WAF ruleset, Terraform state или результатов провайдерских испытаний.

## Для чего эта реализация

Вариант Cloudflare должен показать прохождение запроса через **управляемую сеть edge-провайдера**, а не притворяться, что обычный HTTP middleware воспроизводит L3/L4 anti-DDoS. Cloudflare Anycast и распределённая сеть — свойства провайдера; демонстрационный Worker **не управляет BGP-маршрутами**.

```text
клиент -> Cloudflare edge (WAF, policy/rate limiting) -> test origin
                         |
                  optional Worker
                         |
                    безопасные логи
```

## Что находится в каталоге

| Подраздел | Реализация, которую предстоит написать | Текущее состояние |
| --- | --- | --- |
| [workers/request-guard](workers/request-guard/README.md) | Минимальный Worker с request ID, безопасной обработкой ошибок и фиксированным тестовым маршрутом | **TODO** |
| [waf](waf/README.md) | Правила WAF, режимы безопасного ввода, исключения, rollback и оценка false positives | **TODO** |
| [rate-limits](rate-limits/README.md) | Ограничения по API-маршрутам, различение 429 и security block, соответствие доступному тарифу | **TODO** |
| [terraform](terraform/README.md) | Управление конфигурацией, зафиксированные версии provider, `validate/plan`, ручной `apply` | **TODO** |

Сейчас эти подразделы содержат **описания будущих изменений**, не рабочие Cloudflare-модули.

## Критерии готовности (Codex)

1. Сверить действующие Cloudflare API/Terraform схемы и конкретные возможности тестового тарифа с официальной документацией.
2. Реализовать минимальный Worker и модульные тесты; секреты и zone/account identifiers получать только через защищённые параметры.
3. Подготовить WAF/rate-limit конфигурации и проверяемый staged rollout с обратимым переключением и журналом ложных срабатываний.
4. Проверить на **разрешённом тестовом домене**, что корректные запросы проходят, ограниченные получают ожидаемые ответы, а origin не доступен в обход edge.
5. Разделить результаты: `simulated` локальных [BGP/Anycast лабораторий](../../simulator/README.md), `provider-configured` после применения настроек, `provider-verified` только после фактических проверок.

Никаких нагрузочных атак на публичные ресурсы и автоматического `terraform apply`. Не путать встроенные механизмы WAF и [отдельный проект Cloudflare Workers AI](../../../EdgeAI/implementations/cloudflare-workers-ai/README.md): запуск собственных моделей относится к EdgeAI.

**Продолжать с:** [TASK.md](TASK.md). Официальная отправная точка: https://developers.cloudflare.com/.
