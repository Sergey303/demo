# AI-assisted DDoS defense

TODO (не готовая реализация):
1. Локально размеченные запросы: обычные, всплеск легитимной нагрузки, синтетические боты.
2. Baseline: детерминированные rate limits/WAF.
3. ML: оценка аномалий из EdgeAI, с versioned policy.
4. Decision: allow / observe / challenge / block, с audit trail и TTL; default не должен бесконтрольно блокировать при сбоях модели.
5. Проверки: precision/recall, false positive rate, p95 latency, load, отказ AI, смена модели, перезапуск edge.
6. Провайдерские ветки в EdgeNetworkSecurity; симуляция не выдаётся за действующую anti-DDoS защиту.

Перед реализацией определить интерфейс передачи сигналов и лимиты доверия к модели.
