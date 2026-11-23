# Edge AI + anti-DDoS integrated scenarios

**Статус: TODO.** Третий отдельный проект для связывания [EdgeNetworkSecurity](../EdgeNetworkSecurity/README.md) и [EdgeAI](../EdgeAI/README.md), без циклических зависимостей.

## ai-assisted-ddos-defense
Данные синтетического тестового трафика → правила защиты → необязательная AI-оценка аномалии → решение по заранее определённой политике → аудит, метрики и сравнение с rule-only baseline.

- [Сценарий](ai-assisted-ddos-defense/README.md)
- TODO: определить версии контрактов и безопасный fallback: при недоступности модели базовые правила продолжают работать.
- TODO: реплей одинаковых данных через разные реализации без внешних атак.
- TODO: сравнивать метрики false positives, latency, availability и origin load.

Никаких автоматических блокировок реальных пользователей на основании невалидированной модели.
