# Edge AI — локальный inference, модели и проверка качества

**Отдельная инженерная лаборатория выполнения ML-моделей рядом с источником данных.** Цель — сравнивать ограниченные по ресурсам сценарии inference: от детерминированного алгоритма без ML до локальной ONNX-модели, а позднее — реализаций на разных облачных платформах. Проект **не сводится к anti-DDoS**: анализ трафика — первый пример, а обработка изображений, сигналов датчиков и автономная работа выделены в самостоятельные сценарии.

**Текущее состояние:** эвристика и её оценка на искусственных данных **локально проверены**; ONNX-модель, генератор, CPU-runner и тесты **написаны и опубликованы**, и **настоящий CPU inference ONNX Runtime проверен локально**; также доступны синтетические примеры для изображений, датчиков и автономного inference. Облачные адаптеры остаются **TODO**.

## Что находится в проекте

| Направление | Реальные файлы и содержание | Статус |
| --- | --- | --- |
| [Обнаружение аномалий трафика](scenarios/traffic-anomaly-detection/README.md) | `baseline.py` — воспроизводимый rules-only score; `fixtures.jsonl` — 12 размеченных искусственных окон; `evaluate.py` — матрица ошибок, precision, recall, FPR/FNR и SHA-256 данных | **Локально проверено**; это эвристика без обучения |
| [ONNX на CPU](implementations/onnx-local/README.md) | `features.py` — четыре ограниченных признака; `build_model.py` — обучение маленькой логистической модели на сгенерированных данных и экспорт `MatMul → Add → Sigmoid`; `runtime.py` — проверка модели и вызов ONNX Runtime | **Нативное CPU-выполнение проверено локально** |
| [Benchmark](benchmarks/README.md) | `benchmark.py` — замер создания CPU-сессии и warm inference p50/p95/p99; метаданные модели и синтетического набора | **Локально измерено (Intel Core i5-12400); не SLA** |
| [Cloudflare Workers AI](implementations/cloudflare-workers-ai/README.md) | План выбора модели, binding, API, лимитов и измерения latency | **TODO**; Worker не развёрнут |
| [Yandex Cloud inference](implementations/yandex-cloud/README.md) | План проверки API, исполнения моделей и локализации данных | **TODO**; региональное облако не означает физический edge |
| [Другие российские варианты](implementations/russian-cloud/README.md) | Критерии выбора провайдера и размещения вычислений | **TODO** |

Локальные примеры без внешних зависимостей: [image inference](scenarios/image-inference/README.md), [predictive maintenance](scenarios/predictive-maintenance/README.md), [offline inference](scenarios/offline-inference/README.md) и [benchmark на общих входах](benchmarks/README.md#shared-traffic-inputs).

```bash
python3 -B EdgeAI/scenarios/image-inference/inference.py
python3 -B EdgeAI/scenarios/predictive-maintenance/evaluate.py
python3 -B EdgeAI/scenarios/offline-inference/run.py
python3 -B EdgeAI/benchmarks/compare.py
python3 -B -m unittest discover -s EdgeAI/tests -v
```

## Два способа получить оценку

```text
Размеченное синтетическое окно (requests, seconds, errors, baseline_rps)
                               |
               валидация и нормализация
                     /                   \
         Правила/эвристика           ONNX (CPU)
           без обучения             обучение на искусственных метках
             baseline.py             features.py → model.onnx → runtime.py
                     \                   /
                  score для экспериментального сравнения
                               |
                 интеграционный сценарий rule-only / advisory
```

**Rules-only baseline** вычисляет числовую эвристику: она не является калиброванной вероятностью атаки. **ONNX-путь** создаёт настоящую вычислительную модель, но метки получены по искусственному правилу; это не независимая оценка обнаружения DDoS и не обучение на реальном сетевом трафике. Модели и feature pipeline не объявлены эквивалентными по качеству.

## Как запустить

Все команды — из корня `demo`.

**1. Без ML и внешних зависимостей** (Python 3.12+):

```bash
python3 EdgeAI/scenarios/traffic-anomaly-detection/evaluate.py --threshold 0.5
python3 -B -m unittest discover -s EdgeAI/scenarios/traffic-anomaly-detection/tests -v
```

Этот путь не скачивает модели и не отправляет запросы наружу. На 12 авторских примерах намеренно есть ложные срабатывания и пропуски. Полученные доли **не обобщаются на реальный трафик**.

**2. Генерация и выполнение ONNX** (требуется явная установка фиксированных версий `numpy`, `onnx`, `onnxruntime`):

```bash
python3 -m pip install -r EdgeAI/implementations/onnx-local/requirements.txt
python3 EdgeAI/implementations/onnx-local/build_model.py
python3 EdgeAI/implementations/onnx-local/runtime.py \
  --window-json '{"requests":250,"seconds":10,"errors":45,"baseline_rps":3}'
python3 EdgeAI/implementations/onnx-local/benchmark.py --iterations 50
python3 -B -m unittest discover -s EdgeAI/implementations/onnx-local/tests -v
```

Генератор не скачивает модель: `model.onnx` и `manifest.json` создаются локально в исключённом из Git `artifacts/`. Runner проверяет ID, типы/формы тензоров, SHA-256 и использует только `CPUExecutionProvider`; одна операция принимает **1–32 окна**. SHA-256 контролирует целостность, но **не заменяет подпись издателя**. Нативные тесты (11) и два сквозных ONNX/policy теста прошли локально. Подтверждение GitHub Actions `onnx-cpu` остаётся отдельным критерием.

## Архитектурные решения и безопасность

- **Доменные задачи отделены от провайдеров.** Для изображений и сетевой аномалии нужны разные контракты и критерии качества; универсального интерфейса «всё Edge AI» здесь нет.
- **Edge AI ≠ облачный AI.** Локальный CPU/устройство и удалённый inference различаются местом обработки, задержками, конфиденциальностью, стоимостью и поведением без сети.
- **Модель не является механизмом принудительной блокировки.** В [EdgeIntegratedScenarios](../EdgeIntegratedScenarios/README.md) её оценка может рекомендовать только наблюдение; детерминированные правила продолжают работать при ошибке модели.
- **Нет неявной загрузки весов и реальных пользовательских данных.** В ONNX-модуле только воспроизводимая синтетическая обучающая выборка, модель фиксируется manifest+hash; отсутствуют реальные CPU/RAM/SLO гарантии.
- **Метрики разделяются:** качество на размеченной выборке, время *чистого* inference и задержка полного HTTP-пути — разные измерения. Пока измерение HTTP+ONNX вместе **не реализовано**.

## Доказательства и следующие этапы

[Протокол приёмки после Codex](../EdgeIntegratedScenarios/EVIDENCE-CODEX-2026-11-23.md) фиксирует подтверждённый запуск CPU и совместные тесты; [предыдущая запись](../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-ONNX.md) сохраняет историю первоначальной непроверенности. Конкретные [задачи Codex рядом с ONNX-кодом](implementations/onnx-local/TASK.md), [задачи бенчмарка](benchmarks/TASK.md) и [правила агентов](AGENTS.md) охватывают изоляцию/тайм-аут inference, реальную независимую выборку, калибровку, GPU/WASM/.NET, сравнение сред исполнения и облачные адаптеры.

**Связанные проекты:** [EdgeNetworkSecurity](../EdgeNetworkSecurity/README.md) — реальный локальный HTTP/Redis и симуляторы маршрутизации; [EdgeIntegratedScenarios](../EdgeIntegratedScenarios/README.md) — offline сравнение решений с эвристикой или опциональным ONNX. **Подключения модели к работающему HTTP API пока нет.**
