"""Build a self-contained public static bundle, never start a backend."""
from pathlib import Path
import argparse
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public-demos"
def page(title, subtitle, body, demo="", root=False):
    prefix = "" if root else "../"
    nav = "" if root else '<a href="../">← Все демонстрации</a>'
    script = '' if not demo else '<script type="module" src="../ui.mjs"></script>'
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,follow">
<title>{title} — инженерное портфолио</title><link rel="stylesheet" href="{prefix}style.css"></head>
<body data-demo="{demo}"><header>{nav}<h1>{title}</h1><p>{subtitle}</p></header><main>{body}
<footer>Авторский инженерный пример, не клиентское внедрение. <a href="https://github.com/Sergey303/demo">Исходный код</a>.</footer></main>{script}</body></html>"""
def panel(title, content):
    return f'<section class="panel"><h2>{title}</h2>{content}</section>'
def link(path, text):
    return f'<a href="https://github.com/Sergey303/demo/{path}">{text}</a>'
def write(out, rel, text):
    target = out / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
def build_appforge(out, workflow=False):
    original=ROOT/"appforge-admin/generated/frontend-app"
    if not (original/"node_modules").is_dir():
        raise SystemExit("Run npm ci --prefix appforge-admin/generated/frontend-app first.")
    # Stage an isolated entry and reuse the untouched generated components.
    with tempfile.TemporaryDirectory(prefix="appforge-preview-") as temp:
        stage=Path(temp)
        for name in ["src","security"]:
            shutil.copytree(original/name,stage/name)
        for name in ["package.json","tsconfig.json"]:
            shutil.copy2(original/name,stage/name)
        (stage/"node_modules").symlink_to(original/"node_modules",target_is_directory=True)
        for name in ["preview.tsx","previewClient.ts","previewId.ts"]:
            shutil.copy2(SRC/"appforge-preview"/name,stage/"src"/name)
        if workflow:
            for name in ("workflow.tsx", "workflow.css", "workflowApi.ts", "workflowApp.tsx", "workflowClient.ts", "workflowModel.ts"):
                shutil.copy2(SRC/"appforge-preview"/name,stage/"src"/name)
        # The actual generated durability executor requires an authenticated
        # account partition and writes to IndexedDB. Substitute only in the
        # disposable staging tree; the original React and runtime are untouched.
        shutil.copy2(SRC/"appforge-preview/previewDurableMutationRuntime.ts",stage/"src/generated-ts/runtime/durableMutationRuntime.ts")
        for name in ["index.html","vite.config.ts"]:
            shutil.copy2(SRC/"appforge-preview"/name,stage/name)
        if workflow:
            shutil.copy2(SRC/"appforge-preview/workflow.html",stage/"index.html")
        subprocess.run(["node",str(original/"node_modules/typescript/bin/tsc"),"--noEmit"],cwd=stage,check=True)
        subprocess.run(["node",str(original/"node_modules/vite/bin/vite.js"),"build","--outDir",str(out)],cwd=stage,check=True)

def build(out):
    # Avoid destructive cleanup: only accept a fresh path, or an empty directory.
    if out.exists() and (not out.is_dir() or any(out.iterdir())):
        raise SystemExit("Use a new, empty output directory.")
    subprocess.run(["npm", "run", "check"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["node", "--test", "tests/storage.test.mjs", "tests/clinical-demo.test.mjs", "tests/clinical-stages.test.mjs", "tests/draft-checkpoint.test.mjs", "tests/demo-search.test.mjs"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["npm", "run", "build"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["node", "--test", str(SRC / "model.test.mjs"), str(SRC / "reliable-model.test.mjs")], check=True)
    out.mkdir(parents=True, exist_ok=True)
    for name in ["style.css", "ui.mjs", "model.mjs"]:
        shutil.copy2(SRC / name, out / name)
    entries = [
        ("gosvet/", "GosVet", "Рабочее место врача: история пациента, интерактивный помощник, вакцинация и моделирование внешней интеграции.", "Рабочий React-прототип"),
        ("appforge/", "Клиенты, заявки и задачи", "Распределите работу, выполните поручение и проверьте результат.", "Интерактивный учебный процесс"),
        ("reliable-jobs/", "Reliable Jobs", "Проверьте, как система ведёт себя при повторном запросе, сбое и восстановлении.", "Симуляция транзакционных гарантий"),
        ("enterprise-ai/", "Enterprise AI", "Получите ответ с источниками и проверьте, как на него влияют права доступа.", "Replay + интерактивная модель прав"),
    ]
    cards = ''.join(panel(title, f'<p class="tag">{kind}</p><p>{desc}</p><a class="button" href="{href}">Открыть демо</a>') for href,title,desc,kind in entries)
    write(out, "index.html", page("Инженерные демонстрации","Бизнес-приложения, интеграции и AI — попробуйте сценарии без регистрации.", '<p class="notice">Используются только учебные данные. Не вводите реальные сведения. Статические сценарии не подключаются к клиентским системам.</p><div class="grid">'+cards+'</div>',root=True))
    write(out,"gosvet/index.html",page("GosVet","Рабочее место ветеринарного врача: от истории пациента до завершения приёма.",
        '<p class="notice">Учебные записи. Помощник использует локальные демонстрационные правила, не LLM; ВЕТИС моделируется. Данные хранятся в браузере. Не вводите реальные персональные данные.</p>'
        +panel("Попробуйте за 2–3 минуты",'<ol><li>Откройте приём Барсика и введите «Рвота второй день». Выберите несколько тегов.</li><li>Ответьте на уточняющий вопрос и посмотрите, как меняется порядок учебных гипотез. Раскройте обоснования.</li><li>Откройте подсказки осмотра и проверку записи. Измените поле, сохраните черновик.</li></ol><div class="actions"><a class="button" href="app.html#/appointment/demo-001">Открыть приём</a><a class="button" href="app.html#/search">Поиск животного</a><a class="button" href="app.html#/appointment/demo-003">Заполненный пример</a></div><p>Для повторения с исходными данными: меню пользователя → Настройки демо → Сбросить демо (удаляет локальные изменения).</p>')
        +panel("Что демонстрирует проект",'<p>Проектирование сложного рабочего процесса, контекстные подсказки, управление состоянием, проверка полноты записи, сохранение и коррекция данных, раздельные статусы медицинского приёма и внешней отправки.</p><p>'+link("tree/main/GosVet","Исходники GosVet")+' · '+link("blob/main/GosVet/gosvet_demo_scenarios_for_doctor.md","Сценарии приёмки")+'</p>')))
    shutil.copy2(ROOT/"GosVet/dist/index.html",out/"gosvet/app.html")
    admin = '''<section class="panel commercial-intro"><p class="tag">Для руководителей и владельцев бизнеса</p><h2>От обращения клиента до результата работы</h2><p>Посмотрите, как можно объединить записи о клиентах, заявки и поручения сотрудников в одном рабочем приложении под ваши процессы.</p><div class="actions"><a class="button" href="workflow/">Попробовать интерактивное демо</a><a class="button secondary-link" href="../../?service=development#contact">Обсудить вашу внутреннюю систему</a></div><p class="muted">Учебный процесс без сервера, регистрации и БД; смена рабочего места не является проверкой прав.</p></section><section class="panel"><h2>Короткий маршрут</h2><ol class="guide"><li>В очереди диспетчера назначьте Анну на согласование конфигурации.</li><li>Переключитесь на рабочее место Анны, начните поручение и сохраните результат.</li><li>Руководитель увидит изменение сводки и тот же результат в карточке клиента.</li></ol><a href="generated/">Открыть сгенерированный интерфейс</a> · <a href="#quick-try">Отдельный пример реестра клиентов</a></section><p class="notice">Упрощённая интерактивная модель Customer CRUD. Это отдельный демонстрационный интерфейс, не оригинальный сгенерированный React и не подключение к .NET/PostgreSQL. Все изменения только в памяти вкладки.</p>
<div class="grid" id="quick-try"><section class="panel"><h2>Карточка клиента</h2><form id="form"><label>Название<input id="name" required maxlength="180" placeholder="Учебный клиент"></label><label>Email (необязательно)<input id="email" type="email" maxlength="180" placeholder="demo@example.invalid"></label><label>Сегмент<input id="segment" maxlength="90" placeholder="B2B"></label><div class="actions"><button id="save">Создать клиента</button><button type="button" class="secondary" id="cancel">Отмена</button></div></form><output id="message" aria-live="polite"></output></section>
<section class="panel"><h2>Что проверять</h2><p>Создайте запись, измените сегмент, найдите её по названию, удалите и сбросьте состояние. Это отдельный учебный реестр клиентов.</p><button class="secondary" id="reset">Сбросить демо</button></section></div>
<section class="panel"><h2>Клиенты</h2><label>Поиск<input id="search" type="search"></label><p id="count" aria-live="polite"></p><div class="scroll"><table><thead><tr><th>ID</th><th>Название</th><th>Email</th><th>Сегмент</th><th>Действия</th></tr></thead><tbody id="rows"></tbody></table></div></section>'''
    workflow_captures = (("manager", "Сводка руководителя"), ("dispatcher", "Очереди диспетчера"),
                         ("executor-result", "Результат исполнителя"), ("manager-after", "Сводка после выполнения"))
    admin += panel("Рабочие места в демо", '<p>Фактические снимки учебного интерфейса в браузере.</p><div class="evidence-gallery">'+''.join(
        f'<figure><a href="workflow-{name}.png"><img src="workflow-{name}.png" alt="{label}" loading="lazy"></a><figcaption>{label}</figcaption></figure>'
        for name,label in workflow_captures)+'</div><p>Связанные операции отдельно проверены с ASP.NET Core и PostgreSQL 17, включая отрицательные сценарии и конфликт двух обновлений. '+link("blob/main/appforge-admin/evidence/P1-LIVE-WORKFLOW.json","Протокол 15 проверок")+'</p>')
    admin += panel("Проверенная реализация, не только макет",'<p>9 ноября 2026 года Customer CRUD проверен в Chromium с реальными ASP.NET Core API и PostgreSQL: создание, редактирование, мягкое удаление, SQL-проверки. Это отдельное подтверждение базового реестра, не доказательство серверной реализации переходов задач.</p><div class="evidence-gallery"><figure><a href="customers.png"><img src="customers.png" alt="Реальная таблица клиентов" loading="lazy"></a><figcaption>Таблица клиентов</figcaption></figure><figure><a href="create.png"><img src="create.png" alt="Реальная форма создания клиента" loading="lazy"></a><figcaption>Создание записи</figcaption></figure><figure><a href="edit.png"><img src="edit.png" alt="Реальная форма редактирования клиента" loading="lazy"></a><figcaption>Редактирование записи</figcaption></figure></div><p>'+link("blob/main/appforge-admin/evidence/CRUD-LIVE-EVIDENCE.json","Протокол живого CRUD-теста")+' · '+link("blob/main/appforge-admin/business-operations.md","Исходная модель")+' · '+link("tree/main/appforge-admin","Реализация")+'</p>')
    write(out,"appforge/index.html",page("Клиенты, заявки и задачи","Внутренние системы под ваш бизнес-процесс.",admin,"admin"))
    for name in ["customers","create","edit"]:
        shutil.copy2(ROOT/f"appforge-admin/evidence/business-admin-{name}-live.png",out/f"appforge/{name}.png")
    for name,_ in workflow_captures:
        shutil.copy2(SRC/f"media/workflow-{name}.png",out/f"appforge/workflow-{name}.png")
    build_appforge(out/"appforge/generated")
    build_appforge(out/"appforge/workflow", workflow=True)
    # Reliable Jobs has its own model/view, reusing the common static wrapper.
    jobs = (SRC/"reliable-jobs.html").read_text(encoding="utf-8")
    jobs_captures = (("comparison", "Сравнение результата"), ("lost-response", "Неизвестный исход для отправителя"),
                     ("technical", "Техническая проекция"), ("evidence", "Матрица доказательств"),
                     ("initial-mobile", "Мобильный экран"))
    jobs += panel("Снимки принятой учебной модели", '<p>Фактические снимки браузера, не реального API или БД.</p><div class="evidence-gallery">'+''.join(
        f'<figure><a href="p1-{name}.png"><img src="p1-{name}.png" alt="{label}" loading="lazy"></a><figcaption>{label}</figcaption></figure>'
        for name,label in jobs_captures)+'</div><p>'+link("blob/main/dotnet-outbox/P1-ACCEPTANCE.md","Протокол приёмки и реальные проверки")+'</p>')
    html = page("Что произойдёт, если ответ на операцию потеряется?",
                "Учебная заявка на обслуживание · Reliable Jobs", jobs)
    html = html.replace("</head>", '<link rel="stylesheet" href="./reliable.css"></head>')
    html = html.replace("</body>", '<script type="module" src="./reliable-ui.mjs"></script></body>')
    write(out,"reliable-jobs/index.html",html)
    for name in ("reliable-model.mjs","reliable-ui.mjs","reliable.css"):
        shutil.copy2(SRC/name,out/"reliable-jobs"/name)
    shutil.copy2(SRC/"model.mjs",out/"reliable-jobs/model.mjs")
    shutil.copy2(SRC/"media/reliable-jobs-simulation.png",out/"reliable-jobs/simulation.png")
    for name,_ in jobs_captures:
        shutil.copy2(SRC/f"media/reliable-jobs-p1-{name}.png",out/f"reliable-jobs/p1-{name}.png")
    enterprise = '''<section class="panel commercial-intro"><p class="tag">Для руководителей и IT-служб</p><h2>Ответ из корпоративных источников — с проверяемым происхождением</h2><p>Документы и записи разговоров могут стать источниками ответов. Важно не только получить ответ, но и увидеть, откуда он взят и что произойдёт при изменении прав.</p><ol class="guide"><li>Оставьте оба источника разрешёнными: увидите воспроизведение записанного ответа Qwen с двумя источниками.</li><li>Снимите право на документ, затем на аудио. В первом случае останется только выдержка разрешённого источника, во втором — ответ не формируется.</li><li>Верните доступ и выберите вопрос о доставке: в учебном корпусе нет достаточных сведений.</li><li>Посмотрите запись реальной работы и протокол проверок ниже.</li></ol></section><p class="notice">Replay учебного сценария, не онлайн-ИИ. Записанный ответ Qwen воспроизводится только для исходного случая с двумя разрешёнными источниками. Остальные результаты иллюстрируют логику доступа, а не измеряют поиск или качество модели.</p><div class="grid"><section class="panel"><h2>Сценарий и доступ</h2><label>Вопрос<select id="scenario"><option value="refund">Когда можно запросить возврат?</option><option value="unknown">Какие условия доставки?</option></select></label><label>Режим<select id="mode"><option value="generated">Записанный ответ Qwen3</option><option value="extractive">Демонстрация выдержек</option></select></label><label><input type="checkbox" id="doc" checked> Разрешён документ</label><label><input type="checkbox" id="audio" checked> Разрешено аудио</label><button id="run">Показать ответ</button><p>Снимите права на источники и посмотрите, как меняется ответ.</p></section><section class="panel"><h2>Ответ</h2><output id="answer" aria-live="polite"></output><p id="provenance" class="muted"></p><h2>Источники</h2><ul id="sources"></ul></section></div>'''
    enterprise += panel("Запись реальной работы (09.11.2026)",'<video controls preload="metadata" poster="qwen.png" src="qwen.mp4">Ваш браузер не поддерживает видео.</video><p>Настоящие Chromium, PostgreSQL, Whisper, BGE и локальная Qwen3:8b. Запись не доказывает семантическую достоверность всех ответов или production-ready IAM.</p><p>'+link("blob/main/enterprise-demo/EVIDENCE-2026-11-09-QWEN.md","Протокол Qwen")+' · '+link("blob/main/enterprise-demo/EVIDENCE-2026-11-09-MCP.md","Протокол MCP")+' · '+link("tree/main/enterprise-demo","Реализация")+'</p>')
    enterprise += panel("Отдельная проверка двух профилей (15.11.2026)",'<p>Два браузерных запроса с разными серверными учебными профилями прошли через настоящие Qwen3:8b, MCP, ONNX и PostgreSQL. Каждый получил свой источник; после отзыва права новый запрос одного профиля перестал получать его документ, а второй сохранил доступ. Это проверка ограниченного сценария, не production IAM и не гарантия фактической точности ответов.</p><p>'+link("blob/main/enterprise-demo/EP11-LIVE-QWEN-2026-11-15.md","Протокол двух профилей")+'</p>')
    write(out,"enterprise-ai/index.html",page("Enterprise AI","Поиск по документам и аудио с контролем доступа к источникам.",enterprise,"enterprise"))
    for src,dest in [("enterprise-generated-real.mp4","qwen.mp4"),("enterprise-generated-real.png","qwen.png")]:
        shutil.copy2(ROOT/"enterprise-demo/media"/src,out/"enterprise-ai"/dest)
    print("Built",out)
if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    build(args.out.resolve())
