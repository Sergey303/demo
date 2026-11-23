# Сценарные контракты

TODO: определить отдельные интерфейсы (IAnomalyDetector, IImageClassifier) и формат оценки качества. Не закреплять детали Cloudflare или ONNX в доменных контрактах.

Обязательные поля результата: modelId/version, inferenceLatencyMs, confidence (если калиброван), runtime, executionLocation и status.
