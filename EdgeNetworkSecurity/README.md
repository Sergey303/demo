# Edge Network Security — BGP, Anycast, anti-DDoS

**Статус: scaffold / TODO.** Отдельный демонстрационный проект: Cloudflare, EdgeЦентр (РФ), Yandex Cloud (РФ) и воспроизводимый локальный стенд. Сценарии и метрики общие, реализации физически разделены. Никакие провайдерские защиты не заявляются действующими до настройки и проверки.

## Каталог
- [Архитектура и критерии приёмки](docs/ARCHITECTURE.md)
- [Cloudflare](implementations/cloudflare/README.md)
- [EdgeЦентр (РФ)](implementations/edgecenter-ru/README.md)
- [Yandex Cloud (РФ)](implementations/yandex-cloud/README.md)
- [Локальный стенд](implementations/local/README.md)
- [Симуляторы BGP / Anycast](simulator/README.md)
- [Контракты и сценарии](shared/README.md)

Edge AI — отдельный соседний проект [EdgeAI](../EdgeAI/README.md). Интеграция — [EdgeIntegratedScenarios](../EdgeIntegratedScenarios/README.md).

## Принципы
1. Сетевые L3/L4 механизмы провайдера **не** эмулируются одним ASP.NET rate limiter.
2. BGP/Anycast в локальной версии **симулируются**, а не публикуют маршруты в Интернет.
3. Сценарии нагрузки только локальные / разрешённые, с ограничениями интенсивности и длительности.
4. Секреты, ключи и реальные адреса origin не коммитить.
5. У каждого результата статус: `simulated`, `local-tested`, `provider-configured` или `provider-verified`.

## Первый исполняемый срез (симуляция)

[Модель BGP](simulator/bgp/model.py) реализует выбор пути по local preference / AS_PATH и withdrawal. Это **упрощённая детерминированная модель**, не реальный BGP. Проверки в [общем offline-тесте](../EdgeIntegratedScenarios/tests/test_edge_baselines.py). Запуск из корня репозитория: `python -m unittest discover -s EdgeIntegratedScenarios/tests -v`. Реальные provider-ветки, Anycast и HTTP-стенд пока TODO; задания находятся в [TASK.md провайдеров](implementations/cloudflare/TASK.md), [локальном стенде](implementations/local/TASK.md), [BGP](simulator/bgp/TASK.md) и [Anycast](simulator/anycast/TASK.md).
