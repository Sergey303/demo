# Edge AI — независимые сценарии inference

**Статус: scaffold / TODO.** Самостоятельный проект, не подмодуль anti-DDoS.

## Реализации
- [Cloudflare Workers AI](implementations/cloudflare-workers-ai/README.md) — серверлесс edge inference.
- [Локальный ONNX](implementations/onnx-local/README.md) — контейнер/устройство, offline-first.
- [Yandex Cloud](implementations/yandex-cloud/README.md) — конкретный кандидат для российского облачного inference (статус TODO; облако ≠ автоматически edge).
- [Другие российские облака](implementations/russian-cloud/README.md) — альтернативы после проверки требований.

## Сценарии
- `scenarios/traffic-anomaly-detection/` — аномалии сетевого трафика.
- `scenarios/image-inference/` — классификация изображений.
- `scenarios/predictive-maintenance/` — предиктивное обслуживание.
- `scenarios/offline-inference/` — работа без сети.
- `benchmarks/` — единый протокол качества, задержек, затрат и доступности.

Общий интерфейс **по сценариям**, не один мегаконтракт для всех AI. Входы/выходы и качество сравниваются только при эквивалентной задаче и модели. Интеграция с защитой — в [EdgeIntegratedScenarios](../EdgeIntegratedScenarios/README.md).

## Первый исполняемый срез (без ML)

[baseline.py](scenarios/traffic-anomaly-detection/baseline.py) считает ограниченный детерминированный heuristic score для синтетических окон трафика. **Это не обученная модель и не калиброванная вероятность атаки.** Offline unit-тесты: `python -m unittest discover -s EdgeIntegratedScenarios/tests -v`. Дальнейшая работа: [TASK для детектора](scenarios/traffic-anomaly-detection/TASK.md), [ONNX](implementations/onnx-local/TASK.md) и [бенчмарков](benchmarks/TASK.md).
