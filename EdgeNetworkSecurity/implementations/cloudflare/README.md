# Cloudflare implementation

**Статус: TODO — конфигурация ещё не применена.** Эта директория только для Cloudflare, не смешивать с РФ-провайдером.

## План
- `workers/request-guard/`: TODO — минимальный Worker, проверка методов, заголовков и корреляция request ID.
- `waf/`: TODO — декларативные WAF rulesets, исключения и безопасный rollback.
- `rate-limits/`: TODO — лимиты по маршрутам, различать `429` и security block, учитывать доступность в тарифе.
- `terraform/`: TODO — IaC с фиксацией версий провайдера, dry-run и импортом существующих ресурсов.
- DNS, proxied origin, доступ к origin только через доверенный путь — TODO.

BGP и Anycast предоставляет сеть Cloudflare. Worker **не настраивает BGP**. Edge AI находится в [отдельном проекте](../../../EdgeAI/implementations/cloudflare-workers-ai/README.md).

Секреты — только через секрет-хранилище/CI. Развёртывание — только в контролируемом тестовом zone/account. Официальные документы: https://developers.cloudflare.com/
