# Enterprise AI Platform — EP-00: фактические контракты и границы интеграции

**Статус:** SOURCE-INSPECTED / contract baseline; **не** подтверждение запуска единой платформы.  
**Срез:** 2026-11-08, `Sergey303/demo:main` @ `f926104dbc7b5d13423492ba358ec3c832156f2d`.  
**Источник:** чтение кода этого SHA через GitHub; команды и интеграционные тесты в рамках EP-00 **не выполнялись**.  
**План:** [EP-00–EP-09](../ENTERPRISE-AI-PLATFORM-PLAN.md). Следующий срез — отдельная реализация EP-01/EP-02.

Этот документ различает **EXISTS** (в коде), **PLANNED** (будущий контракт, требует реализации/тестов) и **RISKS** (не закрытые инварианты). При изменении API, миграций или сериализации обновлять его только вместе с изменением соответствующего кода и ссылкой на SHA.

## 1. Реальные HTTP-контракты — EXISTS

Источник: [`dotnet-outbox/src/Program.cs`](../../dotnet-outbox/src/Program.cs), [`JobLogic.cs`](../../dotnet-outbox/src/JobLogic.cs).

| Метод/путь | Вход | Фактический ответ | Авторизация и ограничения |
| --- | --- | --- | --- |
| `GET /health` | — | `200 {"status":"running"}` | Только процесс, **не** готовность БД |
| `GET /ready` | — | `200 {"status":"ready"}` или `503` | `SELECT 1` с таймаутом 3 с; **не** проверяет Python worker / модели / миграции |
| `POST /jobs` | JSON `{"text":"..."}`; `Idempotency-Key` | Новый: `202 {"id":"uuid","status":"queued"}`; повтор: `200 {"id":"uuid","status":"already-accepted"}`; конфликт: `409 {"error":"..."}` | Сейчас **публичный** учебный текстовый путь. Непустой текст длиной 1–2000 символов; 1 ASCII key длиной 10–128 |
| `POST /audio-jobs` | JSON `{"filename":"clip.wav","wavBase64":"<base64>"}`, `Authorization: Bearer <signed-token>`, `Idempotency-Key` | Аналогично: `202 queued`, `200 already-accepted`, `409` | Подпись и expiry обязательны. Имя 5–100 символов, ASCII буквы/цифры/`._-`, суффикс `.wav`; RIFF/WAVE 44–262144 байта; base64 длиной ≤350000; не проводится полный codec audit |
| `GET /jobs/{id:guid}` | UUID в пути, необязательный `Authorization` для text | `200 {"id":"uuid","status":"queued|done|failed","result":null|{...}}` либо `404` | Text jobs публичны; audio jobs доступны только при валидном токене, совпадении tenant и текущем `audio_read_grants`. Неправильный/revoked/missing ID → `404` |

Неверный/отсутствующий Bearer при `POST /audio-jobs` → `401`; некорректный payload/key/формат → `400`. Протокол ошибки **ещё не унифицирован**: `{"error":"..."}`, пустые 401/404 и `503` без общего ProblemDetails. В браузере следует ветвить по HTTP status, а не парсить все ошибки одним типом. Декодированный WAV и event сохраняются **в одной транзакции до 202**.

### Результат и состояния

- Job status в текущей схеме: **только** `queued | done | failed`. `already-accepted` — статус **POST-ответа о повторе**, не сохранённое состояние job. `processing` / `retrying` сейчас в HTTP **нет**: UI не должен придумывать эти состояния. Можно показывать текст «в обработке» как клиентскую интерпретацию `queued`, но не заявлять о серверном переходе.
- У текстового job `result` записывается сериализацией `JobResult(WordCount, Sha256)`; в `GET` значения из JSONB, содержащие `WordCount`, `Sha256`. Не смешивать с audio result.
- У audio job Python `process_audio` записывает JSON `{"source": "...", "sha256": "...", "segments": [{"source":"...", "start":0.0, "end":3.0, "text":"...", "embedding":[...]}]}` (массив может быть пустым). Таймкоды в секундах; векторы сейчас доступны авторизованному читателю `GET /jobs/{id}` внутри `result`. **Желательно для UI:** отображать только source/time/text, не рендерить/логировать embedding; позже предоставить узкий public projection без embedding.
- `POST /jobs` и `POST /audio-jobs` используют **один глобальный** `jobs.idempotency_key UNIQUE`. Audio collision проверяет, среди прочего, текущий grant/tenant, hash WAV и filename; после revoke повтор может вернуть 409. **Нельзя объявлять tenant-scoped idempotency реализованной.** Для новых путей планировать namespace/tenant-scoped key без поломки старых тестов.
- **Нет** существующих HTTP `/audio/search`, `/documents`, `/search`, `/answer`, `/audio/{id}/download` или endpoint выдачи токена. Их нельзя упоминать как работающие.

## 2. Хранилище и миграции — EXISTS

Источник: [001](../../dotnet-outbox/sql/001_init.sql), [002](../../dotnet-outbox/sql/002_audio_jobs.sql), [003](../../dotnet-outbox/sql/003_audio_leases.sql), [004](../../dotnet-outbox/sql/004_audio_acl.sql).

| Миграция | Состояние |
| --- | --- |
| `001_init.sql` | `jobs(id, idempotency_key UNIQUE, payload_sha256, input, status CHECK queued/done/failed, result jsonb, created_at, updated_at)`; `outbox(id,job_id UNIQUE FK, attempts,next_attempt_at,processed_at,last_error,created_at)`; partial ready index |
| `002_audio_jobs.sql` | `jobs.kind` (`text|audio`), `audio_payload bytea`, `audio_name`, индекс `(kind,id)` |
| `003_audio_leases.sql` | `outbox.lease_token uuid`, `lease_until timestamptz`, индекс для lease/reclaim |
| `004_audio_acl.sql` | `jobs.tenant_id` (старые записи → `unassigned`), `audio_read_grants(job_id,tenant_id,subject_id)` с PK + индекс по (tenant,subject,job) |

Compose инициализирует только 001 на **пустом** volume. 002→004 запускать явно по порядку на **одноразовой** БД; повторный запуск контейнера не накатывает их автоматически. Новая схема документов должна начинаться с **005** и не подменять существующие поля/job semantics. Для тестов явно фиксировать ledger реально применённых миграций.

В C# `OutboxWorker` обслуживает `kind='text'`; Python `architecture/audio_worker.py` — `kind='audio'`. Audio: claim через короткую транзакцию/lease; local Whisper+ONNX вне DB-транзакции; heartbeat через `lease_heartbeat.py`; finalize по `lease_token` и `lease_until`. Ошибки handler дают ограниченный backoff (до 5 попыток), сбои SQL не должны тратить handler budget. **Не** обещать exactly-once inference: после потери lease повторное вычисление допустимо, stale commit запрещён.

**Разные DSN:** .NET `ConnectionStrings__Jobs=Host=...;Port=...;...`; Python `JOBS_TEST_CONNECTION='host=... port=... ...'` (libpq). Не направлять эксперимент в DB ChatPilot/другой проект.

## 3. Реальная идентичность и права — EXISTS + ограничения

Источники: [C# `AudioIdentity`](../../dotnet-outbox/src/AudioIdentity.cs), [Python `audio_access.py`](../audio_access.py), [audio ACL](../AUDIO-ACCESS.md).

- Токен: `base64url(JSON({tenant,sub,exp})).base64url(HMAC-SHA256(secret,payload))`; обязательный `DEMO_AUTH_SECRET` длиной от 32 UTF-8 байт; expiry в будущем, не далее часа. `issue_token(tenant,subject, ttl_seconds=300)` — **только доверенная офлайн-выдача**, не HTTP API и не полномочие произвольного браузера.
- `POST /audio-jobs` добавляет grant владельцу **атомарно с jobs/outbox**. `GET /jobs/{id}` проверяет grant запросом к PostgreSQL **каждый раз**. В Python `fetch_and_search(dsn, job_id, question, k, token=...)` проверяет grant **перед** чтением результата и вызовом encoder.
- `grant_read` / `revoke_read` в `architecture/audio_access.py` — trusted локальные административные операции, **не** user-facing endpoints.
- В DB demo-учётка может быть owner; **нет** доказанного RLS/разделения ролей. Browser, worker и admin нельзя приравнивать по правам.
- В интегрированном UI нельзя добавлять «выбери любой tenant/subject» с выдачей подписанного токена: это обход авторизации. Для P0 — один доверенный локальный демонстрационный профиль/issuer, смена пользователя только контролируемым trusted сценарием; закрытый API-edge. Не сохранять токен в репозитории, адресной строке, видео, браузерном журнале или общем localStorage.

## 4. Python retrieval/RAG — EXISTS, но пока отдельно

- Audio CLI: `python architecture/audio_worker.py search JOB_ID 'question'` с токеном из `DEMO_AUTH_TOKEN`; возвращает `source,start,end,text,score` с векторами из `jobs.result` и вычисляет **только embedding вопроса**. Это **не HTTP endpoint**. [Код](../audio_worker.py).
- Document RAG: FastAPI `POST /ask`, JSON `{"question":"...","top_k":3,"generate":false,"answer_mode":"retrieval|evidence|guarded|claim_checked"}`; question 1–2000, top_k 1–8, значения по умолчанию retrieval/3/false. [Код](../../python-ai/rag-docs/app/main.py).
- `/ask` проверяет Bearer, затем `DOCS_ACL_FILE` — **локальный manifest**, перечитываемый каждый запрос. `DOCS_DIR` на старте загружается в in-memory knowledge base; файлы `.md/.txt` пока не загружаются через HTTP и **не** хранятся в PostgreSQL. Нет связи с `audio_read_grants` и нет durable document jobs.
- RAG modes: `retrieval` → sources; `evidence` → verbatim passage или abstention; `guarded` и `claim_checked` требуют `generate:true` и локальную модель. `claim_checked` ограничивает утверждения точными предложениями/цитатами; валидная цитата **не равна** семантическому доказательству. Генерация не является обязательной для evidence-only.
- **Критичный барьер embeddings:** audio использует ONNX encoder (в частности BGE-small), document RAG по умолчанию `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. Даже одинаковая размерность векторов **не означает** совместимое пространство. Единый top-k нельзя вычислять из смешанных cosine без общей модели/версии и (пере)индексации. Для EP-04 выбрать одну согласованную encoder pipeline/модель и зафиксировать `embedding_model_id`, preprocessing, dimension, normalize, версии; либо делать раздельные ranked sets с явной калибровкой до объединения.
- FastAPI `GET /health` возвращает `{"status":"ok"}`, это не доказательство готовности embeddings/Ollama/DB.

## 5. React / launcher — EXISTS

[`bootstrap5/src/App.tsx`](../../bootstrap5/src/App.tsx) строит страницы по реестру [`routes.ts`](../../bootstrap5/src/routes.ts). Существующий `/dashboard/hiring-demo` работает с `/demo-api` через локальный Vite proxy [`vite.config.ts`](../../bootstrap5/vite.config.ts) на `http://127.0.0.1:5077`. [`hiring-demo/run.py`](../../hiring-demo/run.py) поднимает **только** .NET API + Vite; Python worker, RAG, Ollama в launcher пока отсутствуют. Существующий Hiring Demo **сохранить без регрессии**.

EP-02 добавляет отдельный `/dashboard/enterprise-ai` (page + registry + typed API client). Операции upload/retry/status должны идти через один закрытый boundary. До появления user-facing session не добавлять публичную выдачу токена, `VITE_*` с секретом или псевдо-авторизацию через поле tenant. Отдельно обработать expiry, отсутствие моделей и статус `failed`.

## 6. Предлагаемые интерфейсы — PLANNED, НЕ реализованы

Имена здесь **кандидатные**, утверждаются в отдельном coding PR после выбора одного API boundary:

| Срез | Target contract / поля | Путь реализации и инвариант |
| --- | --- | --- |
| EP-01 | `/enterprise/ready` → `{api,postgres,audio_worker,retrieval,ollama}` с индивидуальными `ready|unavailable` | Проверять настоящие сервисы; отсутствие Ollama не должно блокировать evidence-only |
| EP-02 | Browser `POST /audio-jobs` + `GET /jobs/{id}` (текущие пути), view: `{jobId,status,source,segments:[{start,end,text}]}` | Client typed projection; на первом этапе не расширять SQL. Реальный 202→stored result. Без fake processing |
| EP-03 | `POST /document-jobs` с ограниченным `.txt/.md` + idempotency; status через общий job ID | Новая миграция 005, tenant/grants, document processing вне долгой SQL-транзакции |
| EP-04 | `POST /enterprise/search` → `{hits:[{sourceId,kind,passage,score,start?,end?}]}` | Сервер проверяет grants **до ranking** и payload fetch; никакой прямой браузерной доступности Python CLI |
| EP-05 | `POST /enterprise/answer` → `{mode,answer,abstained,citations,reason}` | Источники только из разрешённых hit; перед prompt актуальная re-authorization; invalid citation → abstention |
| EP-06 | Correlation ID на upload/job/worker/retrieval/answer + CI traces/видео | Не маскировать отсутствие service/inference mock-ответом |

**Не зафиксировано как принятое решение:** точный BFF implementation, форматы document storage/search index, контракт admin revoke UI, модель embeddings, границы трассировки и выдача демо-сессии. Их выбрать минимально до нужного среза, с отрицательными тестами. Не добавлять Redis/брокер/vector DB/Kubernetes/PDF/OCR/агентов в P0.

## 7. Проверки и приемка EP-00

**Source-inspected на SHA выше:** endpoints, SQL 001–004, identities, audio lease/CLI, RAG modes/manifest, React proxy/launcher.  
**Не выполнено в этом пакете:** тесты, живое PostgreSQL/Whisper, доступность ссылок в рантайме, проверка пустой базы и обратная совместимость. Это нельзя отмечать `PASS` без исполнения.

Команды для следующего исполнителя (использовать disposable БД и локальные кэши моделей; не скачивать веса без необходимости):

```bash
python -m pytest -q architecture/tests
cd python-ai/rag-docs && python -m pytest -q tests
cd ../../dotnet-outbox && dotnet test tests/ReliableJobs.Tests.csproj --filter "Category!=PostgreSQL"
cd ../bootstrap5 && npm run build
```

Более поздние проверки: отдельная реальная PG acceptance с миграциями 001→004; `architecture/live_audio_smoke.py`; затем browser e2e и **два identity / revoke / crash**. Старую `/dashboard/hiring-demo` проверять отдельно. Указать точный SHA, версии моделей, localhost endpoints и evidence, не менять статус на «готово» по одной статической ревизии.

### Первый coding slice (следующий PR)

1. Изолированный launcher-профиль для .NET+Python worker+Vite, с корректной readiness и сохранением старого demo. На первом этапе документировать ручной запуск worker, если упрощает доставку.
2. `EnterpriseAiPage` + typed `audio-jobs` API client, валидировать размер WAV **до** base64, использовать стабильный `Idempotency-Key` при повторе и не показывать статус до серверного ответа.
3. Показывать real job `queued/done/failed`, raw transcript `source/start/end/text` и понятные auth/timeout/error states; embedding не выводить. Без новых endpoint claims.
4. Контрактные тесты 202/200/409/401/404 + stale UI request, отдельно живой browser→PG→Whisper сценарий и проверка revoke.
5. После независимого review обновить этот документ и только тогда ставить галочку EP-02.

**Ценность для интервью:** инженер объясняет, почему SQL outbox принимает работу до тяжёлой инференции, почему lease допускает duplicate compute, почему tenant ACL проверяется до retrieval, и почему красивые цитаты LLM не равны истинности. Но главное — пользователь **видит это работающим** в одном интерфейсе.
