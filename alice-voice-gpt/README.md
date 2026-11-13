# Alice Voice GPT — отдельный Linux-контейнер для частного навыка Алисы

**Устройство:** Яндекс Станция Мини 2 `YNDX-00020` с часами. Прошивка не меняется.

**Команда:** «Алиса, спроси у домашнего собеседника, почему расширяется Вселенная?»
Активационное имя навыка должно быть принято Яндексом. Передача хвоста команды в навык зависит от конфигурации и распознавания Алисы; проверяйте через Яндекс Диалоги.

## Архитектура

Яндекс Диалоги → `https://alice.knowledge-pilot.duckdns.org/alice/<SECRET>` → существующий `KnowledgePilotCaddy` (Windows service, ports 80/443) → `127.0.0.1:18765` → отдельный контейнер `alice-voice-gpt` (.NET 10) → Responses API.

Это **НЕ** контейнер `rdc-project`, не Kubernetes и не новая служба Windows. Docker Desktop может стартовать при входе пользователя. `restart: unless-stopped` действует после запуска движка Docker и не запускает Docker сам.

## Запуск через Docker Desktop (Windows)

1. Из Git-репозитория запустите `& "D:\projects\ChatPilotGroup\demo\alice-voice-gpt\scripts\Install-AliceVoiceGpt.ps1"`. Это скопирует приложение в `D:\services\alice-voice-gpt`, создаст `.env` и токен webhook, сохранив существующие секреты при повторном запуске. Для автономной распаковки ZIP можно использовать `Expand-Archive`.
2. Откройте в PowerShell `cd D:\services\alice-voice-gpt`; скрипт установки уже создаёт `.env`, если его не было.
3. Токен `secrets/alice_webhook_token` создаёт установщик. В `secrets/openai_api_key` вручную сохраните свой отдельный ключ OpenAI API. Не коммитьте оба файла.
4. `docker compose config --quiet` — проверка конфигурации.
5. `docker compose up -d --build` — построение и запуск (это отдельно от `rdc-project`).
6. `docker compose ps` и `curl.exe -i http://127.0.0.1:18765/health` — проверка состояния.
7. `docker compose logs --tail 100 app` — структурированные JSON-логи, без записи текста вопросов.

**Резервный запуск:** `docker compose restart`; **обновление:** `docker compose up -d --build`; **остановка:** `docker compose down`. Compose-тома не используются, пользовательский диалог и локальные лимиты хранятся только в оперативной памяти и обнуляются при рестарте. Важные данные не теряются, но незавершённый ответ пропадёт.

## Caddy

`Caddyfile.alice.caddy` — версия отдельного сайта для уже существующей Windows-службы `KnowledgePilotCaddy` (см. `KnowledgePilot.Deploy/edge/caddy/`). Выделенный порт 18765 привязан **только к 127.0.0.1 на Windows**.

Переносить файл в *активную* конфигурацию следует через принятый механизм публикации `KnowledgePilot.Deploy`: проверить `caddy validate`, затем `caddy reload` через существующий service-owned Caddy. **Не запускайте второй Caddy и не заменяйте основной Caddyfile.** Требуется проверить, что Windows-служба Caddy действительно работает и имеет действующий сертификат для `alice.knowledge-pilot.duckdns.org`: успешный DNS-ответ не доказывает доступность HTTPS.

В конфигурации сайта намеренно отсутствует `kp_access_log`, потому что секретный токен находится в URL webhook и иначе попадёт в access-логи. Убеждайтесь, что другие уровни маршрутизации тоже не пишут полный URL.

## Яндекс Диалоги

1. Создайте **приватный навык Алисы**: https://dialogs.yandex.ru/development.
2. Вставьте URL `https://alice.knowledge-pilot.duckdns.org/alice/<SECRET>` (вместо `<SECRET>` содержимое файла `secrets/alice_webhook_token`).
3. После появления `skill_id` задайте его как `YANDEX_SKILL_ID` в `.env`, затем `docker compose up -d`.
4. Проверьте отправку вопроса в консоли Яндекс Диалогов, а затем голосом на колонке.

## Проверка исходников без реальных ключей

`bash tests/run-smoke.sh` — .NET 10 build и локальная эмуляция протокола Yandex в `DEMO_MODE=true`: health, token, ping, skill ID, ограничение ввода, отсутствие токена в логах. Не проверяет настоящий OpenAI, DNS/TLS, Docker build или физическую колонку.

## Диагностика и ограничения

- `curl.exe -i http://127.0.0.1:18765/health` → 200 означает, что контейнер работает, но не подтверждает HTTPS, авторизацию Яндекса или доступ к OpenAI.
- Наружу публикуется только `/alice/*`; `/health` доступен с Windows локально.
- Яндекс завершает запрос через **4,5 секунды**, включая сеть. Мы ждём OpenAI примерно 2,6 секунды, затем говорим «Думаю над ответом. Скажи: ответ». Длинные ответы озвучиваются не потоково, и повторное «ответ» нужно отправить в открытой сессии.
- `restart: unless-stopped` обеспечивает перезапуск контейнера после падения и при старте Docker, но **не** исправляет ошибки приложения, не восстанавливает сессию и не решает проблему сертификата/провайдера.
- Мониторинг: `docker compose ps`, `docker stats alice-voice-gpt`, `docker compose logs --since 1h app`; позже можно включить экспорт OpenTelemetry и общую наблюдаемость.
- Секреты смонтированы из отдельных файлов, вне образа; `read_only`, `cap_drop: ALL`, `no-new-privileges`, лимит памяти, `healthcheck`, ротация логов.
- Входящие вопросы распознаются на стороне Яндекса; текст отправляется OpenAI. Подписка ChatGPT **не оплачивает** OpenAI API. Название модели в `.env` можно поменять.
- Суточный счётчик в текущем прототипе в памяти; для надёжного бюджета нужен лимит в OpenAI Platform.

Официальные справочники: https://www.yandex.ru/dev/dialogs/alice/doc/ru/wait-response и https://caddyserver.com/docs/running
