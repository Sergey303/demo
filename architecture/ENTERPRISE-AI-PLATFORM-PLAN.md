# Enterprise AI Platform — фактическое состояние и дальнейший план

**Статус на 2026-11-09 (исходный main EP-05b: `75477f11c28d65cb9aa88ec3d7ccaa15642ea3f2`):** интегрированный, **ограниченный локальный** путь EP-02–EP-05 плюс опциональный **EP-05b Qwen3:8b generated answer** проверены на настоящих PostgreSQL/Whisper/ONNX/Ollama/Chromium. EP-00 — историческая контрактная база, EP-01 модельная readiness частично открыта, EP-06 длительная надёжность/trace не принята. Генеративный ответ с валидными ID цитат **не доказывает семантическую верность**. [Карта проверяемых AI-компетенций](../AI-CAPABILITIES.md) · [реальный E2E](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md).
**Дата первоначального плана:** 2026-11-08. Перед каждой новой задачей фиксировать актуальный SHA `main` и не считать старый baseline текущим.
**Цель:** превратить работающие изолированные примеры в **одну проверяемую Enterprise Knowledge & Meeting Evidence Platform** для демонстрации компетенций .NET Tech Lead / Solution Architect / AI Architect, а не создать ещё один учебный микросервис.

**Реализованный ограниченный P0-срез:** один React-интерфейс с **фиксированным доверенным локальным demo principal**, WAV + UTF-8 Markdown/.txt, долговременная обработка, SQL grant-first поиск, **дословная цитата или опциональный Qwen3-ответ** с проверяемыми ID и повторной проверкой грантов. Сквозной реальный PostgreSQL/Whisper/ONNX/Chromium-путь подтверждён на синтетических данных; проверка длительной устойчивости, обобщённые ответы LLM, production IAM и полноценная наблюдаемость — **не подтверждены**. Падение API с `Out of memory` под высокой нагрузкой RDC остаётся открытым эксплуатационным риском.

## 1. Текущее состояние (вместо первоначальной инвентаризации 2026-11-08)

Дальнейшие пакеты в §4 отражают **историческую последовательность работ**, а не то, что EP-02–EP-05 ещё нужно реализовать. Для просмотра кода по требованиям вакансии используйте [матрицу компетенций](../AI-CAPABILITIES.md).

| Слой | Что **реально интегрировано** на 2026-11-09 | Что **осталось вне этого пути** |
| --- | --- | --- |
| UI | [Enterprise AI page](../bootstrap5/src/pages/EnterpriseAiPage.tsx), [документы](../bootstrap5/src/pages/DocumentUploadCard.tsx), [поиск и ответ](../bootstrap5/src/pages/UnifiedSearchCard.tsx), [реальный E2E](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md) | Production login и долговременная история UI; локальный фиксированный principal вместо отдельной пользовательской сессии |
| Долговременная очередь | [.NET Jobs API](../dotnet-outbox/src/Program.cs), [общий Python worker](audio_worker.py), [SQL 001–005](../dotnet-outbox/sql/005_document_jobs.sql), idempotency/lease/fencing; [PostgreSQL tests](tests/test_documents_postgres.py) | Legacy `/jobs` остаётся публичным для старого text demo; idempotency key глобален и не scoped по tenant |
| Аудио | `POST /audio-jobs` → [WAV/Whisper worker](audio_worker.py) → PostgreSQL→[единый поиск](unified_search.py); [real model run](../enterprise-demo/EVIDENCE-2026-11-08.md) | Только ограниченный WAV; нет diarization, потокового ASR и оценки на реальных записях |
| Авторизация | [подписанный токен](audio_access.py), [единые SQL grants](../dotnet-outbox/sql/004_audio_acl.sql) и grant-first [retrieval](unified_search.py), revoke/wrong-tenant [тесты](tests/test_answer_postgres.py) | Нет OIDC, DB RLS, реальных многопользовательских сессий и production audit |
| Документы/LLM | [Durable UTF-8 ingestion](document_pipeline.py), [extractive answer](evidence_answer.py) и **[EP-05b Qwen3 JSON/citation generator](guarded_generation.py)** используют одну PostgreSQL-авторизацию; [реальное видео](../enterprise-demo/EVIDENCE-2026-11-09-QWEN.md) | Standalone manifest ACL не является источником грантов; нет semantic entailment, независимого LLM evaluation, PDF/DOCX или production IAM |
| Поиск/evaluation | [EP-04 SQL-granted cosine](unified_search.py) с двумя типами источников; [BM25/RRF](../python-ai/audio-search/hybrid.py), [reranking](../python-ai/audio-search/rerank.py), [RAG evaluation](../python-ai/rag-docs/QUALITY-EVAL.md) существуют отдельно | Не интегрированы reranker/hybrid в основной путь; независимая оценка relevancy/faithfulness и большие корпуса отсутствуют |
| Агентные инструменты | **[EP-09 настоящий MCP stdio](mcp_evidence_server.py) + [Qwen3 tool_calls](mcp_agent_host.py) + [одноразовое PostgreSQL-подтверждение](agent_actions.py)** работают локально с текущим SQL ACL; [реальная приёмка](../enterprise-demo/EVIDENCE-2026-11-09-MCP.md). Прежний [tool-agent](../python-ai/tool-agent/app/agent.py) — отдельный прототип | Нет общего LangGraph/A2A/multi-agent planner, production IAM, production SLO и независимой проверки истинности предложений LLM |
| Эксплуатация | [Launcher](../enterprise-demo/run.py), [CI](../.github/workflows/hiring-demo.yml), [опт-ин model-backed Chromium](../bootstrap5/tests/enterprise-search-live.spec.ts) и SQL fault tests | Нет model-aware readiness, подтверждённого soak/SLO и полного OTel; наблюдавшийся поздний OOM не разобран |

**Существующий успешный [Hiring Demo](../hiring-demo/README.md) не заменяем:** это быстрый вход для рекрутера. Новый маршрут `/dashboard/enterprise-ai` должен дополнять его, а не усложнять и ломать показ надёжности.

## 2. Продуктовый сценарий: что реализовано и что остаётся целью

**Персона:** сотрудник организации, которому нужно проверить решения и обязательства после совещания; у его коллеги и другой организации не должно быть доступа к чужим данным.

**Исходный целевой сценарий для собеседования (2026-11-08; НЕ полный чеклист готовности):** пункты загрузки WAV/Markdown, grant-first поиска и дословного ответа выполнены в локальном демо; отдельно обозначенные readiness всех моделей, авторизованная выдача оригинала, production login, LLM-generated guarded/claim_checked и полный crash/soak остаются не реализованы или не приняты. [Реальный маршрут EP-05](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md).

1. Пользователь A (tenant `alpha`) открывает AI Workspace и видит readiness API, PostgreSQL, audio-worker, retrieval и локальных моделей **по отдельности**; отсутствие сервиса видно как ошибка, без фальшивой зелёной панели.
2. Загружает небольшой, заранее подготовленный **но не предварительно обработанный** WAV; получает `202`, job ID и действительные статусы `queued → done/failed` (в текущем API нет состояния `processing`; отдельную индикацию можно добавить только с серверным контрактом), выполняет повтор с тем же idempotency key без дубля.
3. UI отображает распознанные фразы, источник, старт/конец по времени и ссылку на оригинальное аудио с серверной авторизацией.
4. Загружает небольшую текстовую политику (`.txt`/ограниченный `.md` в MVP) через **durable** document job; видит статус, hash, passages и принадлежность tenant. PDF/Office — не P0.
5. Ищет вопрос по аудио и документу, получает **только разрешённые** фрагменты с типом источника, идентификатором, timestamp (для аудио) или фрагментом документа.
6. Запрашивает evidence-only ответ и отдельно guarded/claim-checked режим локальной LLM. UI показывает цитаты и явно отличает строгую проверку происхождения от **непроверенного семантического entailment**.
7. Администратор в тестовом доверенном интерфейсе отзывает доступ к одному источнику. Следующие результаты поиска, цитаты, просмотр оригинала и LLM prompt для отозванного источника не содержат его. Проверить два разных subject/tenant.
8. На фоне принятой задачи останавливается worker/API, затем запускается снова; принятый job не теряется, lease-фенсинг исключает чужой/stale commit. Видеозапись сохраняет фактические ID и timestamps.

**Критерий успеха:** этот путь реально выполняется из одного UI в изолированном окружении и описан в `README` четырьмя ссылками: «запуск», «демо», «архитектура», «доказательства».

## 3. Исходная целевая архитектура (намеренно НЕ as-built)

```mermaid
flowchart LR
  UI["React AI Workspace\nновый маршрут"]
  GW["ASP.NET Core boundary/BFF\nединая авторизация + корреляция"]
  PG[("PostgreSQL\njobs/outbox, grants, evidence")]
  TXT[".NET text worker\nexisting"]
  AUD["Python audio worker\nWhisper + embeddings"]
  DOC["Document worker\nnew thin adapter"]
  SEARCH["Authorized retrieval API\nnew thin adapter"]
  LLM["Local Ollama\nguarded/evidence/claim_checked"]
  UI --> GW
  GW --> PG
  PG --> TXT
  PG --> AUD
  PG --> DOC
  GW --> SEARCH
  SEARCH --> PG
  SEARCH --> LLM
```

**Правила границ:**

- **PostgreSQL уже является durable source of truth:** использовать существующие `jobs`, `outbox`, lease/fencing, `audio_read_grants`, сохранённые векторы и схемы; документам добавить минимальные миграции/таблицы. Не строить вторую очередь, не дублировать данные в Redis/отдельном vector DB ради MVP.
- **Одна авторизация для каждого источника и каждой операции.** На первом этапе разрешён единственный **trusted demo issuer**, выпускающий существующий короткоживущий подписанный токен на `tenant,subject`. Никакой публичной выдачи токена клиентом по произвольному tenant; для BFF — trusted server-side issuance или локальный заранее заданный демонстрационный профиль. Production OIDC, RBAC/RLS и lifecycle учётных записей — P1.
- **Разрешения перепроверяются перед поиском, извлечением исходника и формированием prompt**, из единой PostgreSQL модели access/grants, а не из устаревающего копируемого ACL manifest. Нельзя считать просто проверку `tenant_id` полноценной авторизацией.
- **Один BFF/API edge** для браузера; Python inference/search процессы не публиковать напрямую в Интернет. Порт, адрес, origin и proxy — localhost по умолчанию.
- **Model inference вне длительной транзакции**; durable job acceptance до ASR/embedding. Lease + heartbeat + fencing при обработке, атомарная фиксация результата и marker только владельцем lease.
- **Не вводить обязательную LLM-генерацию в critical path загрузки**. Evidence-only работает без Ollama, а отсутствие Ollama вызывает явный `unavailable` только для генерации.
- **Безопасная граница HTML/текста:** показывать контент как текст, не интерпретировать Markdown/HTML из пользовательского документа как системные инструкции, не хранить публичные URL к приватному аудио.

## 4. Пакеты реализации по Парето

Каждый пакет ниже является независимым кандидатом для Codex CLI. `P0` — блокирует показ объединённой цепочки; `P1` — дополнительное усиление найма. Оценки времени — ориентиры, **не обязательства**.

| Пакет | Приоритет | Объём изменений (минимальный) | Зависимости | Готовность / доказательство |
| --- | --- | --- | --- | --- |
| **EP-00 Контракты/карта и evidence baseline** | P0 | Реальный SHA `main`; ревизия DTO, SQL 001–004, API, audio result, embeddings, ACL; typed API examples / errors; одна согласованная диаграмма | Нет | Нет вымышленных эндпоинтов; существующий text+audio E2E/регрессии воспроизводятся; контракт версионирован |
| **EP-01 Единый запуск и readiness** | P0 | Расширить `hiring-demo/run.py` отдельным enterprise-профилем или небольшим launcher; поднять API, audio-worker, retrieval, локальные модели, React; миграции только в **disposable** DB; контролируемая остановка дочерних процессов | EP-00 | Один документированный запуск; readiness отражает реальные зависимости; падение любой обязательной зависимости не маскируется |
| **EP-02 React: WAV upload + job progress** | P0 | Новый `/dashboard/enterprise-ai`; upload с size/type bounds, idempotent retry, status, transcript, timestamps, ошибки/отзыв; использовать текущий `POST /audio-jobs` и `GET /jobs/{id}` | EP-00/01 | Реальный браузер → .NET → PG → Python Whisper → JSON result; нет подставного транскрипта; same key = same ID; restart recovery |
| **EP-03 Durable document ingestion** | P0 | Минимальный `document` kind, migration 005+ только для новой схемы, text-only bounded payload, document worker/processor, persisted passages/embeddings, source ID/tenant/owner grant; повтор использовать outbox/leases | EP-00/01 | `202` до эмбеддинга; POST повтор идемпотентен; crash/retry без двойного результата; не принимать неизвестные форматы |
| **EP-04 Unified authorized search** | P0 | Узкий authenticated query/search adapter: разрешённые audio/document segments из PG; source ID, timestamps, chunks, cosine score; grant check SQL **до** выдачи; бюджет `top_k`; один embedding contract | EP-02/03 | Запрос к двум источникам возвращает только owner-granted snippets; tenant B и revoked subject ничего не получают, включая метаданные/извлечение оригинала |
| **EP-05 Evidence/grounded answer UI** | P0 | Подключить существующие `evidence`, `guarded`, `claim_checked` к единым авторизованным фрагментам через адаптер; явный `abstained`, source badges; не копировать старый manifest policy в runtime | EP-04 | Нет источника → отказ **без вызова LLM**; некорректные цитаты → отказ; revoked source не попадает в prompt; точная цитата ≠ семантическая достоверность |
| **EP-06 End-to-end CI, fault drill, видео** | P0 | GitHub Actions: disposable PG 001–latest, реальный .NET API, Python worker, локальная малая модель/фиксируемый кэш либо явно отдельный opt-in inference тест; Playwright, worker kill/reclaim/retry, artifact/video | EP-01–05 | **Один подтверждённый интеграционный trace**: upload→persist→search→answer; multi-tenant negative + revoke + outage + recovery. Нельзя считать mock smoke равным model-backed E2E |
| **EP-07 Observability + SLO** | P1 | Correlation/trace IDs across HTTP/PG/jobs/worker/search, OpenTelemetry traces, job age, queue lag, ASR duration, failed count; аварийный runbook | EP-06 | Сквозной trace и измеренный restart/job recovery, p50/p95 с аппаратной конфигурацией и числом запросов; никаких выдуманных SLO |
| **EP-08 Security/prod deployment hardening** | P1 | OIDC, DB role separation, RLS decision, retention/delete, quotas, upload parser sandbox, object storage if justified, secrets management, audit, HTTPS/reverse proxy | EP-06 | Threat model + отрицательные e2e на tenancy/expiry/revocation, доказательства безопасного удаления |
| **EP-09 Agent approvals/MCP** | P1 | `tool-agent` как строго ограниченный инструмент чтения; для записи серверное одноразовое подтверждение, immutable digest и audit; Planner только после стабильного P0 | EP-06/08 | Тест client `approved=true` не выдаёт полномочий; повтор/подмена/expiry безопасно отклоняются |

**Историческая рекомендация 2026-11-08 (уже реализована):** EP-00 + часть EP-01/EP-02, затем документы EP-03 и поиск EP-04. На 2026-11-09 все EP-02–EP-05 имеют реальные ограниченные E2E; следующие приоритеты для работодателей с AI code-review agent описаны ниже, а не равны хронологическому порядку EP.

## 5. Dependency graph / вертикальные срезы

```mermaid
flowchart TD
  A["EP-00 baseline/contract"] --> B["EP-01 launch/readiness"]
  A --> C["EP-02 WAV UI"]
  B --> C
  B --> D["EP-03 durable document"]
  C --> E["EP-04 unified authorized search"]
  D --> E
  E --> F["EP-05 grounded answer UI"]
  F --> G["EP-06 E2E + fault drill + screencast"]
  G --> H["EP-07 observability"]
  G --> I["EP-08 security hardening"]
  I --> J["EP-09 approved agents"]
```

**Вертикальный срез A (первый показ, выполнен):** authenticated WAV → PostgreSQL job/outbox → Whisper worker → persisted transcript → React timestamps.
**Срез B (реализован extractive и optional guarded LLM):** WAV + text-document → common grant-aware search → evidence-only answer → optional local Qwen3 generation. Citation IDs verify sources only, not semantic truth.
**Срез C (частично: revoke/ACL доказаны, полный fault+soak/trace открыт):** revoke, wrong tenant, no-source refusal, API/worker crash, idempotent recovery → CI + видео + operational dashboard.

**Не расширять P0:** PDF/OCR/DOCX, видеозвонки, streaming ASR, Kubernetes, Terraform, Redis/брокер, multi-GPU/vLLM, RLS/OIDC production, stateful LLM planner, multi-region, infinite history. Всё это отдельные решения, только если есть реальные требования и доказательства ценности.

## 6. Проверяемые критерии приёмки P0

- [ ] `EP-00`: SHA/контракт/матрица реализованного зафиксированы; все относительные ссылки/команды в документации работают; старые режимы не ломаются.
- [ ] `EP-01`: один запуск готовит **только disposable** ресурсы и проверяет PostgreSQL, .NET, Python, retrieval; отсутствие модельного сервиса не притворяется `ready` для LLM.
- [x] `EP-02` **ограниченный синтетический WAV-сценарий**: фактические 202/200, один job ID, Whisper→persisted transcript, запрет неавторизованного чтения и отзыв прав проверены Chromium+PG; [evidence](../enterprise-demo/EVIDENCE-2026-11-08.md). Не заявлять долгосрочную устойчивость или production-авторизацию.
- [x] `EP-03` **малый UTF-8 .txt/.md**: документ принят и сохранён атомарно с outbox и грантом, Python ONNX индексирует реальные фрагменты, same-key 200 / changed-key 409, wrong tenant / revoked 404; [доказательства реальной модели и Chromium](../enterprise-demo/EVIDENCE-2026-11-09.md). Retry и lease/reclaim проверены PostgreSQL; это не OCR/PDF и не soak-приёмка.
- [x] `EP-04` **авторизованный exact retrieval**: один SQL materialized grant-filter до извлечения векторов, совместимый BGE-small, top-k≤5, отсутствие чужих фрагментов, отзыв гранта на следующем поиске, no-evidence → пусто. [Chromium+Whisper+ONNX+PostgreSQL live evidence](../enterprise-demo/EVIDENCE-2026-11-09-SEARCH.md). LLM prompt проверяется в EP-05; здесь LLM не вызывается.
- [x] `EP-05` **дословный evidence-only ответ**: отдельный POST `/answer` заново выполняет разрешённый поиск, до 2 точных выдержек с UUID источника и диапазоном, no-evidence / score<0.67 → отказ, подставные цитаты и неверные API payload отклоняются, revoke на следующем запросе убирает цитату. [Реальный Chromium + Whisper + ONNX + PostgreSQL, видео, тесты](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md). **Не реализованы** LLM guarded/claim_checked с unified ACL и семантический entailment; они остаются самостоятельными, не доказанными задачами.
- [x] `EP-05b` **опциональная локальная Qwen3:8b генерация**: `/answer` принимает только `mode=generated` поверх того же SQL-granted evidence; строго ограниченный localhost Ollama JSON без tools, проверка citation IDs и всех grants **после** инференции, no-evidence → no-model, неправильный ответ/модель недоступна → явный отказ/503. [Настоящий Chromium + Whisper/ONNX + Ollama/PG E2E, видео, ревью Codex](../enterprise-demo/EVIDENCE-2026-11-09-QWEN.md). Semantic entailment и prompt-injection immunity **не доказаны**.
- [x] `EP-09` **ограниченный MCP + настоящий Qwen3 tool calling**: host с ровно двумя разрешёнными tools по официальному stdio MCP v2, модель сама возвращает `tool_calls`, PostgreSQL grant-first поиск и отказ при поддельных параметрах, только предложение заметки без записи, отдельное одноразовое подтверждение пользователя под SQL row lock, конкурентная/revoke/expiry проверка. [Реальные Qwen3 + ONNX + PostgreSQL и тесты](../enterprise-demo/EVIDENCE-2026-11-09-MCP.md). Это **не** общий LangGraph или production IAM; модель может придумать неподтверждённую деталь в заметке.
- [ ] `EP-06`: проходит реальный CI на пустой PostgreSQL с миграциями, отдельной Python ASR и локальной моделью; fault injection в корректной фазе; доступны trace/evidence, короткий screencast и команды повтора.
- [ ] Ограничения/известные дефекты описаны; в публичном README **не написано** «production-ready», «без галлюцинаций» или «exactly once side effects», пока это не доказано.

### Минимальная негативная матрица тестов

| Ситуация | Ожидаемый результат |
| --- | --- |
| user B / wrong tenant запрашивает job, audio blob, document passage | единообразный отказ/404 без раскрытия ID, имени, содержимого или существования |
| admin отзывает grant; user A повторяет search/answer | нет отозванного результата, и LLM запрос его не содержит |
| одинаковый idempotency key + разные payload | 409 без новой задачи |
| worker убит после claim до finalize | lease expires; другая обработка завершает; stale worker cannot commit |
| модель не работает | evidence-only доступен; generation обозначена как unavailable или отказ |
| corrupted audio / слишком крупный документ / пустой вопрос | ограниченный отказ без падения сервиса или утечки body |
| транзакция БД обрывается | нет принятого результата без commit, повтор восстанавливается |
| «инструкция» внутри источника требует раскрыть чужой документ | retrieved text treated as data; no unauthorized tool call, no leaked snippet |

## 7. Политика тестирования и публикации

Сначала запустить существующие локальные проверки **без новых model downloads**:

```bash
python -m pytest -q architecture/tests
cd python-ai/rag-docs && python -m pytest -q tests
cd ../../dotnet-outbox && dotnet test tests/ReliableJobs.Tests.csproj
cd ../bootstrap5 && npm run build && npx playwright test tests/hiring-demo.spec.ts
```

Реальные PostgreSQL-тесты — **только** против отдельной `reliable_jobs` с полными миграциями `001_init.sql` → `002_audio_jobs.sql` → `003_audio_leases.sql` → `004_audio_acl.sql` → новых миграций. Для Python libpq и .NET Npgsql использовать соответствующие форматы DSN; не переиспользовать рабочие БД других проектов.

**Уровни доказательств записывать раздельно:** source inspection → unit → contract → live PostgreSQL → live local Whisper/Ollama → browser E2E → deliberate failure/recovery. Без записи Git SHA, модели, hardware/RAM, входных данных, команд и logs не публиковать численные результаты как воспроизводимые.

**Сложный релиз:** никогда не запускать DEV/E2E «случайно» из PR; выделить допустимые безопасные локальные тесты и opt-in интеграционные проверки. GitHub Actions использует одноразовые ресурсы; runner обязан чистить созданные процессы. При редактировании публичного README факт из target-диаграммы не переносить в implemented до CI evidence.

## 8. Definition of Done для каждой задачи Codex

1. Перед началом `git fetch origin main` и сохранить точный `base_sha`; прочитать `AGENTS.md`, этот план, связанный ADR и актуальный код.
2. Сформулировать один контракт (вход/выход, ошибки, auth, persistence, idempotency), разрешённые пути изменений и **один проверяемый end-to-end результат**; не плодить параллельных реализаций.
3. Реализовать на существующих механизмах. Не изменять несвязанные файлы или чужие незакоммиченные изменения; не изменять `main` без независимого ревью.
4. Добавить положительные и отрицательные тесты, fault scenario для соответствующего среза, выполнить `git diff --check`.
5. **Отдельный reviewer / Codex CLI review**, устранить конкретные замечания, проверить фиксацию миграций и ACL. При наличии `repo-context`/`rc-evidence` можно привязать артефакты по SHA; это инструменты других репозиториев, не обязательная dependency demo.
6. Обновить только актуальные контракты и статусы, записать: tested/not tested, среду, SHA, ссылки на CI evidence; commit/push только согласованных изменений.
7. В `main` принимать пакет при зелёных проверках; не объявлять EP-x закрытым по одному unit test.

## 9. Риски и premortem

| Почему «платформа» может провалиться | Предотвращение |
| --- | --- |
| «Собрали десяток сервисов, но работодателю непонятно, что работает» | Первый экран + один сквозной 3–4-минутный сценарий; короткий путь в README |
| Непоследовательная авторизация в .NET, Python и фронте | Один token/principal, один authoritative grant check; отрицательные тесты **на каждом** границе |
| Очередь и vector storage начинают дублировать PostgreSQL | Прежде расширить существующие jobs/outbox/segments и использовать индекс без отдельной БД |
| Локальная модель не влезает в память или исчерпывает pids в RDC | Evidence-only обязательно без LLM; небольшой CPU-профиль, bounded concurrency и авто-выгрузка модели |
| Миграции на пустой PG отсутствуют в CI | Миграционный ledger и CI с чистой базой 001→latest; успешность `/ready` не заменяет schema check |
| Демонстрация красиво цитирует неправду | Синтаксическая цитата ≠ entailment; строгий refusal, human review, независимая слепая разметка отдельно |
| Излишний scope (MCP/Cloud/Kubernetes) съедает время найма | P0 — вертикальная цепочка и видео, P1 — агент/инфра лишь после подтверждённой E2E |

## 10. Фактические результаты и обновлённые приоритеты найма

**Историческая база EP-00:** [первоначальный контракт и пробелы](enterprise-platform/contracts.md), основанные на SHA `f926104...` (не текущем). На момент его составления live-приёмки ещё не было; **после этого EP-02–EP-05 были действительно выполнены и проверены** ([актуальное доказательство](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md)). Галочка EP-00 как *полная* ревизия современного SHA остаётся открытой; исходный отчёт не следует цитировать как сегодняшнюю карту пробелов.

**EP-02 принята в пределах малого синтетического WAV:** [реальный E2E, скриншот, видеозапись, команды и ограничения](../enterprise-demo/EVIDENCE-2026-11-08.md). Два браузерных прохода с Whisper+ONNX и PostgreSQL завершились успешно; дополнительные 8/8 PostgreSQL проверок worker/reclaim/lease-fencing — PASS. При последующем длительном запуске API завершился с `Out of memory`; требуется отдельная диагностика памяти/soak. Общую готовность Python-моделей `/ready` не заявляет; **EP-01 остаётся частично незакрытой**.

**EP-03 также проверена на реальных сервисах (2026-11-09):** [document E2E, PostgreSQL/ONNX, скриншот, видео, протокол](../enterprise-demo/EVIDENCE-2026-11-09.md). В этой поставке добавлен только ограниченный тип `document`, миграция 005 и та же outbox/lease-подсистема. Старый WAV→Whisper E2E повторно прошёл. На API документ/аудио возвращаются без embeddings.

**EP-04 выполнен для ограниченного синтетического корпуса:** [один настоящий браузерный маршрут, видео и SQL negative tests](../enterprise-demo/EVIDENCE-2026-11-09-SEARCH.md): WAV + Markdown загружены, обе локальные модели проработали, единый запрос вернул два разрешённых источника; отзыв грантов последовательно удалил результаты до `abstained=true`. На момент EP-04 LLM-generated answer ещё не было; позже появился [EP-05b](../enterprise-demo/EVIDENCE-2026-11-09-QWEN.md). Исторический OOM API при длительной работе RDC и readiness AI worker остаются открытыми рисками.

**EP-05 (2026-11-09) принят в ограниченном extractive evidence-only режиме:** [дословные цитаты, точные диапазоны, refusal, реальные E2E/negative tests, видео](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md). Ответ не генерирует новые предложения; цитирование не равно независимой семантической проверке. Продолжение LLM guarded/claim_checked нельзя выдавать за завершённую часть EP-05.

**Текущий порядок по эффекту для агентного анализа работодателем (2026-11-09):** [карта AI-компетенций](../AI-CAPABILITIES.md), **интегрированный Ollama/Qwen LLM с guarded JSON/citation contract** и **ограниченный настоящий MCP/tool-calling с одноразовым подтверждением записи** выполнены локально. Следующие кандидаты: **hybrid BM25/RRF + cross-encoder reranking**, **единый AI evaluation**. Важно переиспользовать уже существующие отдельные примеры, а не начинать новые без потребности. После — **узкий EP-06**: диагностика позднего `.NET Out of memory`, recovery и trace. Это не означает, что LangGraph, reranking единого поиска или независимый AI evaluation уже реализованы.

**Исторический первый milestone выполнен:** WAV и Markdown загружены из React, по ним работают реальный worker/ONNX/Whisper, общий grant-aware поиск, extractive ответ и [опциональная Qwen3 генерация](../enterprise-demo/EVIDENCE-2026-11-09-QWEN.md). [Реальный 20-секундный Chromium E2E](../enterprise-demo/EVIDENCE-2026-11-09-ANSWER.md). Дальнейшие работы не должны выдавать отдельно существующие LLM/agent/reranker функции за уже подключённые.

---

**Связанные документы:** [EP-00 contracts](enterprise-platform/contracts.md) · [архитектура](README.md) · [durable audio](DURABLE-AUDIO.md) · [audio access](AUDIO-ACCESS.md) · [RAG](../python-ai/rag-docs/README.md) · [Hiring Demo](../hiring-demo/README.md) · [матрица рисков](failure-matrix.md).
