# Edge AI — контракты сценариев, не провайдеров

Пока в проекте **нет общего полиморфного SDK** для всех AI-сервисов. Проверяемый локальный контракт первого сценария определён в [features.py](../implementations/onnx-local/features.py): `requests`, `seconds`, `errors`, `baseline_rps` → четыре ограниченных численных признака → score. Отдельно существует [эвристический baseline](../scenarios/traffic-anomaly-detection/baseline.py) с теми же исходными полями. Эти алгоритмы не утверждаются статистически эквивалентными.

## Что уже есть
- Валидация и детерминированное преобразование 4 числовых полей для локального ONNX.
- [Локальный ONNX runner](../implementations/onnx-local/README.md), источник версии и проверка целостности модели.
- [Rule-only synthetic evaluation](../scenarios/traffic-anomaly-detection/README.md) с confusion matrix и зафиксированным hash набора.
- [Интеграционная policy](../../EdgeIntegratedScenarios/README.md), в которой score — только совет, а не приказ на блокировку.

## TODO для Codex

- Определить **разные** контракты `IAnomalyDetector`, `IImageClassifier` и inference-runtime abstraction, не создавать монолитный `IEdgeAIProvider`.
- Ввести versioned transport/schema со стабильными `modelId`, `modelVersion`, `featureSchemaVersion`, `runtime`, `executionLocation`, `latencyMs`, `status`; поле confidence разрешать только с корректным смыслом и калибровкой.
- Отделить normal/timeout/unavailable/invalid-output и их fallback; проверить отрицательными тестами.
- Для сравнения Cloudflare, локального ONNX и Yandex зафиксировать *одинаковые входы*, идентичность задачи и честно отражать несовпадение доступных моделей.

См. [план задач](../../EdgeIntegratedScenarios/EXECUTION_PLAN.md) и [правила EdgeAI](../AGENTS.md). Реального провайдерского API и универсального контрактного пакета пока нет.
