# Edge AI + anti-DDoS integrated scenarios

**Статус: синтетический replay, audit и safety-first policy работают; необязательный настоящий локальный ONNX CPU inference реализован в коде, нативное выполнение ожидает подтверждения CI. Провайдеры — TODO.** Третий отдельный проект для связывания [EdgeNetworkSecurity](../EdgeNetworkSecurity/README.md) и [EdgeAI](../EdgeAI/README.md), без циклических зависимостей.

## ai-assisted-ddos-defense
Данные синтетического тестового трафика → правила защиты → необязательная AI-оценка аномалии → решение по заранее определённой политике → аудит, метрики и сравнение с rule-only baseline.

- [Сценарий](ai-assisted-ddos-defense/README.md)
- Реализовано: безопасный fallback — при недоступности модели действуют базовые правила. TODO: стабильный версионированный межпроектный контракт.
- Реализовано: воспроизводимый offline replay 12 синтетических примеров, маркированный audit и сравнение rule-only / anomaly-advisory.
- Реализовано: синтетические false positives и recall для флагов `observe/block`; TODO: измерение latency, availability и origin load на реальном локальном HTTP-стенде.

Никаких автоматических блокировок реальных пользователей на основании невалидированной модели.

## Первый исполняемый срез (simulated)

[policy.py](ai-assisted-ddos-defense/policy.py) реализует `allow / observe / block` с детерминированным fallback, когда модель недоступна или возвращает недопустимое значение. AI score может переводить `allow` только в `observe`, а не в `block`. Общая проверка: `python -m unittest discover -s EdgeIntegratedScenarios/tests -v`; покрыты 8 коротких тестов BGP, baseline и policy. Реплей и 10 дополнительных негативных тестов готовы: [README сценария](ai-assisted-ddos-defense/README.md), [TASK EIS-01](ai-assisted-ddos-defense/TASK.md). Следующий этап — versioned contracts, HTTP integration и реальные метрики.


### ONNX-assisted offline replay

[onnx_replay.py](ai-assisted-ddos-defense/onnx_replay.py) передаёт оценку из настоящего CPU ONNX Runtime в существующую политику `allow → observe`. Модель обучена только на искусственных данных, поэтому все оценки качества остаются синтетическими. Код и тесты готовы; [ONNX-задачи Codex](../EdgeAI/implementations/onnx-local/TASK.md) содержат необходимую проверку. При отключённой модели исходный rule-only сценарий по-прежнему независим от ONNX.
