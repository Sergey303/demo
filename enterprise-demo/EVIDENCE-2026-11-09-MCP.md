# EP-09: настоящий MCP + Ollama Qwen3 tool-calling workflow

**Срез:** 2026-11-09. **Исходная ревизия до реализации:** `5f8f8eb7c2eb8fd80f18f48d52ab0e2393b06677`. Платформа — локальное портфолио на синтетических данных, не production IAM или автономный агент без ограничений.

## Реальное исполнение, а не заранее записанные вызовы

```text
Browser /enterprise-search/agent/run
        │ фиксированный demo principal: HMAC tenant + subject (только доверенный proxy)
        ▼
Python FastAPI — проверка токена; ограничение задачи: answer | note
        │
        ▼
Local Qwen3:8b /api/chat, tools=[MCP search_evidence schema]
        │ модель САМА возвращает настоящий Ollama tool_calls
        ▼
Official mcp>=2.3,<2.4 Python Client → isolated stdio MCPServer
        │ ПОДПИСАННАЯ исходная identity через доверенную среду,
        │ НЕ из аргументов модели и НЕ из browser JSON
        ▼
search_evidence → live PostgreSQL tenant + grants
        │ один cached BGE-small ONNX query embedding, точные цитаты E1/E2
        ▼
Qwen3:8b JSON answer + citation_ids
        │ guard: bounded model output, allowlist IDs,
        │ повторная SQL-проверка всех источников
        ▼
Browser: answer with source/job citation, NOT semantically verified

Если пользователь выбрал task=note:
  Qwen3 выбирает инструмент propose_review_note (второй tool_calls)
  → MCP proposal при действующем SQL grant (НЕТ записи заметки)
  → браузер показывает текст предложения и точные цитаты
  → ПОЛЬЗОВАТЕЛЬ отдельно нажимает «Подтвердить»
  → POST /agent/confirm: подписанный principal, one-use nonce hash,
    TTL 5 минут, row locks PostgreSQL, **FOR SHARE всех source_job_ids, реально показанных модели**, INSERT notes
  → второе подтверждение отклоняется, отозванный грант тоже
```

**Код:** [MCP server](../architecture/mcp_evidence_server.py) · [LLM planner/host](../architecture/mcp_agent_host.py) · [one-use database approval](../architecture/agent_actions.py) · [schema migration 006](../dotnet-outbox/sql/006_agent_notes.sql) · [signed local API routes](../architecture/search_api.py) · [React UI](../bootstrap5/src/pages/AgentWorkflowCard.tsx) · [real PostgreSQL/MCP tests](../architecture/tests/test_mcp_agent_postgres.py) · [browser contract tests](../bootstrap5/tests/mcp-agent.spec.ts).

## Проверенные результаты

- Прямой реальный вызов Ollama `qwen3:8b` вернул `tool_calls=[{function:{name:"search_evidence",arguments:{question:"When can customers request a refund?",top_k:1}}}]` с настоящим Qwen3 runtime, не имитацию.
- Реальный SQL/ONNX/LLM прогон на отдельной одноразовой PostgreSQL: создан синтетический документ `refund-policy.md` с **384-мерной BGE-small ONNX эмбеддинг-моделью**. Qwen3 самостоятельно вызвала `search_evidence` → официальный MCP client/server через stdio прочитал только разрешённые данные. Получен ответ **“Customers can request a refund within 30 days.”**, `tool_trace=[search_evidence:ok]`, цитата с исходным job ID. **114,06 секунды** на весь запрос (`answer`).
- Второй запрос в том же изолированном прогоне: Qwen3 вызвала `search_evidence` → `propose_review_note`. Система вернула `approval_required`; **до отдельного confirm записей не существовало**. После симуляции подтверждения владельцем создана ровно одна запись в PostgreSQL; исходный тестовый job и зависимые заметки удалены. **113,14 секунды** на весь запрос (`note`), не latency одной MCP-команды.
- **80/80 Python/PostgreSQL тестов PASS** (включая исправления двух P2, найденных независимым Codex-ревью: повторная проверка ВСЕХ исходных job-грантов при подтверждении и очистка устаревших цитат в UI) после исправления модельного `top_k=5` (host ограничивает до 3; поддельные поля/неверные типы отвергает) и SQL concurrency lock. В них используются реальная PostgreSQL и настоящий in-process MCP client/server; **только ответы модели в этих регрессионных тестах сценарно задаются**. Живые два прогона выше используют настоящую модель и отдельный MCP subprocess.
- Браузерные тесты являются **контрактными тестами с mock HTTP** и не заменяют реальный LLM/MCP прогон. Документируйте их отдельный результат после выполнения.

## Значимые границы безопасности

- У Qwen3 **нет** инструментов shell/file write, SQL query, HTTP fetch, arbitrary tool registry, arbitrary URLs, tenant/subject, admin approval или model-selectable server. Только два фиксированных MCP-инструмента; сервер не слушает сетевой порт, host запускает его в ограниченном stdio subprocess.
- `search_evidence` выполняет материализованный SQL ACL до передачи источников в Python и ограничивает число результатов; JSON аргументы модели валидируются по allowlist, невидимые источники не возвращаются.
- `propose_review_note` **никогда не пишет заметку**. Host проверяет, что предложенный job ID входит в разрешённые результаты текущего поиска. Одноразовый случайный approval token доступен только доверенному HTTP host / браузеру, **не передаётся обратно модели**. Сама запись происходит только после отдельного пользовательского действия.
- При подтверждении PostgreSQL транзакционно блокирует proposal и **каждый grant row всех исходных job ID, показанных модели** (`FOR SHARE OF j,g`) перед INSERT; отзыв любого из этих источников запрещает запись. Model-selected tool argument не может задать набор `source_job_ids` — его формирует доверенный host. Конкурентный revoke сериализуется с записью, а повторный approve отвергается по consumed nonce.
- Неизвестный инструмент, неправильный JSON, произвольные аргументы, чужой job ID, отсутствие данных, истёкший bearer, отозванный grant или истёкший approval → **отказ без записи**. Локальный Ollama недоступен → отдельный MCP-режим возвращает 503, существующий EP-05 extractive search остаётся рабочим.
- **Цитаты не доказывают истинность утверждения LLM.** Во время настоящей проверки Qwen3 предложила: *“The refund deadline is 30 days from the purchase date.”* Документ сообщал только *“within 30 days”* и **не утверждал, от какого события отсчитывать срок**. Именно поэтому предложение визуально маркировано как неподтверждённое и требует явного чтения и решения человека. Prompt injection не считается полностью решённым: предотвращены произвольные вызовы инструментов и неавторизованные записи, но не все смысловые ошибки генерации.
- Единая фиксированная локальная демо-идентичность **не production OIDC, OAuth, PostgreSQL RLS или многопользовательское управление доступами**. LLM работает CPU-only с высокой задержкой и возможной swap-нагрузкой; SLA не установлен. Мониторинг и fault/soak остаются следующими этапами.

## Как повторить

1. Подготовить **новую disposable PostgreSQL 16** только для этого демо; применить миграции `001_init.sql` … `006_agent_notes.sql`. Не подключать рабочие БД других проектов.
2. Установить зависимости `architecture/audio-requirements.txt` (официальный Python SDK `mcp>=2.3,<2.4`); подготовить `HF_HOME` с BGE-small/Whisper и установленный локальный `qwen3:8b` через Ollama, слушающий **только 127.0.0.1:11434**. Все скачивания моделей отдельно, в CI не выполняются.
3. Настроить общий 32+ байт `DEMO_AUTH_SECRET`, `ConnectionStrings__Jobs` и `JOBS_TEST_CONNECTION` на **одну и ту же** disposable DB. Запускать `python enterprise-demo/run.py`; модель Ollama должна быть запущена отдельно.
4. Открыть `http://127.0.0.1:4173/dashboard/enterprise-ai`, загрузить синтетический WAV/Markdown и дождаться `done`. В MCP-карточке выбрать «Спросить через MCP» или «Подготовить заметку для подтверждения». Для записи сначала внимательно сравнить proposal с исходной цитатой, потом подтвердить.
5. CI проверяет без загрузки Qwen-весов: `architecture/tests/test_mcp_agent_postgres.py` на реальной PostgreSQL, и `bootstrap5/tests/mcp-agent.spec.ts` на mock HTTP. Настоящую Qwen3 запускают отдельно (ручной opt-in, ресурсоёмко).

**Нельзя утверждать:** generic multi-agent planner, remote MCP federation, production durable autonomous agent, доказанный semantic entailment, предотвращение всех prompt injection атак или production IAM.
