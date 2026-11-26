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
def build_appforge(out):
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
        for name in ["preview.tsx","previewClient.ts"]:
            shutil.copy2(SRC/"appforge-preview"/name,stage/"src"/name)
        # The actual generated durability executor requires an authenticated
        # account partition and writes to IndexedDB. Substitute only in the
        # disposable staging tree; the original React and runtime are untouched.
        shutil.copy2(SRC/"appforge-preview/previewDurableMutationRuntime.ts",stage/"src/generated-ts/runtime/durableMutationRuntime.ts")
        for name in ["index.html","vite.config.ts"]:
            shutil.copy2(SRC/"appforge-preview"/name,stage/name)
        subprocess.run(["node",str(original/"node_modules/typescript/bin/tsc"),"--noEmit"],cwd=stage,check=True)
        subprocess.run(["node",str(original/"node_modules/vite/bin/vite.js"),"build","--outDir",str(out)],cwd=stage,check=True)

def build(out):
    # Avoid destructive cleanup: only accept a fresh path, or an empty directory.
    if out.exists() and (not out.is_dir() or any(out.iterdir())):
        raise SystemExit("Use a new, empty output directory.")
    subprocess.run(["npm", "run", "check"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["node", "--test", "tests/storage.test.mjs"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["npm", "run", "build"], cwd=ROOT / "GosVet", check=True)
    subprocess.run(["node", "--test", str(SRC / "model.test.mjs")], check=True)
    out.mkdir(parents=True, exist_ok=True)
    for name in ["style.css", "ui.mjs", "model.mjs"]:
        shutil.copy2(SRC / name, out / name)
    entries = [
        ("gosvet/", "GosVet", "Ветеринарный приём: карточка пациента, вакцинация, обработка ошибок интеграции.", "Рабочий React-прототип"),
        ("appforge/", "Business Operations Admin", "Создайте, найдите, измените и удалите клиента.", "Сгенерированный React + локальный адаптер"),
        ("reliable-jobs/", "Reliable Jobs", "Проверьте повторы, конфликт ключа, откат и завершение операции.", "Симуляция транзакционных гарантий"),
        ("enterprise-ai/", "Enterprise AI", "Посмотрите ответ по документам и аудио и влияние отзыва доступа.", "Replay + интерактивная модель прав"),
    ]
    cards = ''.join(panel(title, f'<p class="tag">{kind}</p><p>{desc}</p><a class="button" href="{href}">Открыть демо</a>') for href,title,desc,kind in entries)
    write(out, "index.html", page("Инженерные демонстрации","Бизнес-приложения, интеграции и AI — попробуйте сценарии без регистрации.", '<p class="notice">Используются только учебные данные. Не вводите реальные сведения. Статические сценарии не подключаются к клиентским системам.</p><div class="grid">'+cards+'</div>',root=True))
    write(out,"gosvet/index.html",page("GosVet","Рабочий React-прототип ветеринарного рабочего места.",'<p class="notice">Вымышленные записи. Внешняя интеграция моделируется; данные хранятся в браузере. Не вводите персональные данные.</p>'+panel("Попробуйте",'<p>Откройте демонстрационный приём, заполните поля и проверьте обработку ошибок. Для повторения используйте настройки демо.</p><div class="actions"><a class="button" href="app.html#/appointment/demo-001">Открыть приём</a><a class="button" href="app.html#/search">Поиск животного</a><a class="button" href="app.html#/appointments/today">Список приёмов</a></div><p>'+link("tree/main/GosVet","Исходники GosVet")+'</p>')))
    shutil.copy2(ROOT/"GosVet/dist/index.html",out/"gosvet/app.html")
    admin = '''<section class="panel"><h2>Оригинальный AppForge React</h2><p>Сгенерированная Customer-страница с оригинальными формами, фильтрами и таблицей. Вместо HTTP/API используется строго локальный адаптер в памяти. Нет логина, нет сервера, данные сбрасываются при обновлении.</p><a class="button" href="generated/">Открыть сгенерированный интерфейс</a></section><p class="notice">Упрощённая интерактивная модель Customer CRUD. Это отдельный демонстрационный интерфейс, не оригинальный сгенерированный React и не подключение к .NET/PostgreSQL. Все изменения только в памяти вкладки.</p>
<div class="grid"><section class="panel"><h2>Карточка клиента</h2><form id="form"><label>Название<input id="name" required maxlength="180" placeholder="Учебный клиент"></label><label>Email (необязательно)<input id="email" type="email" maxlength="180" placeholder="demo@example.invalid"></label><label>Сегмент<input id="segment" maxlength="90" placeholder="B2B"></label><div class="actions"><button id="save">Создать клиента</button><button type="button" class="secondary" id="cancel">Отмена</button></div></form><output id="message" aria-live="polite"></output></section>
<section class="panel"><h2>Что проверять</h2><p>Создайте запись, измените сегмент, найдите её по названию, удалите и сбросьте состояние. Настоящий AppForge генерирует API, EF-модель, контракты и React UI из декларативной модели.</p><button class="secondary" id="reset">Сбросить демо</button></section></div>
<section class="panel"><h2>Клиенты</h2><label>Поиск<input id="search" type="search"></label><p id="count" aria-live="polite"></p><div class="scroll"><table><thead><tr><th>ID</th><th>Название</th><th>Email</th><th>Сегмент</th><th>Действия</th></tr></thead><tbody id="rows"></tbody></table></div></section>'''
    admin += panel("Реальный сгенерированный интерфейс",'<img src="customers.png" alt="Фактический скриншот AppForge после локального теста с PostgreSQL" loading="lazy"><p>'+link("blob/main/appforge-admin/evidence/CRUD-LIVE-EVIDENCE.json","Протокол живого CRUD-теста")+' · '+link("blob/main/appforge-admin/business-operations.md","Исходная модель")+' · '+link("tree/main/appforge-admin","Реализация")+'</p>')
    write(out,"appforge/index.html",page("Business Operations Admin","Пример автоматизации клиентского учёта и разработки внутренних инструментов.",admin,"admin"))
    shutil.copy2(ROOT/"appforge-admin/evidence/business-admin-customers-live.png",out/"appforge/customers.png")
    build_appforge(out/"appforge/generated")
    jobs = '''<p class="notice">Локальная симуляция в памяти: HTTP-коды и транзакционные переходы моделируются; реальный API, PostgreSQL, блокировки и время ожидания не запускаются.</p><div class="grid"><section class="panel"><h2>1. Отправьте операцию</h2><label>Ключ идемпотентности<input id="key" value="order-001" maxlength="100"></label><label>Данные<textarea id="payload" maxlength="300">alpha beta gamma</textarea></label><button id="submit">Отправить / повторить</button><p class="muted">Повтор с теми же данными вернёт тот же ID. Измените текст и отправьте снова с прежним ключом — 409.</p></section><section class="panel"><h2>2. Управляйте обработкой</h2><div class="actions"><button class="secondary" id="rollback">Сбой БД / откат</button><button class="secondary" id="failure">Ошибка обработчика</button><button id="success">Завершить</button></div><p>Откат не расходует попытку обработчика. Пятая ошибка обработчика приводит к failed. Успешная операция не может завершиться повторно.</p><button class="secondary" id="reset">Сбросить</button></section></div><div class="grid"><section class="panel"><h2>Операции</h2><ul id="jobs"></ul></section><section class="panel"><h2>Журнал событий (симуляция)</h2><pre id="log" aria-live="polite">Отправьте первую операцию.</pre></section></div>'''
    jobs += panel("Реальная реализация",'<p>Job и outbox сохраняются в одной транзакции. SKIP LOCKED даёт конкурирующим воркерам разные строки. Это не гарантия exactly-once для внешних эффектов.</p><p>'+link("blob/main/dotnet-outbox/src/Program.cs","API")+' · '+link("blob/main/dotnet-outbox/src/OutboxWorker.cs","Воркер")+' · '+link("blob/main/dotnet-outbox/README.md","Проверки и ограничения")+'</p>')
    write(out,"reliable-jobs/index.html",page("Reliable Jobs","Как не потерять бизнес-операцию и не исполнить её дважды при повторе.",jobs,"jobs"))
    enterprise = '''<p class="notice">Replay учебного сценария, не онлайн-ИИ. Записанный ответ Qwen воспроизводится только для исходного случая с двумя разрешёнными источниками. Остальные результаты иллюстрируют логику доступа, а не измеряют поиск или качество модели.</p><div class="grid"><section class="panel"><h2>Сценарий и доступ</h2><label>Вопрос<select id="scenario"><option value="refund">Когда можно запросить возврат?</option><option value="unknown">Какие условия доставки?</option></select></label><label>Режим<select id="mode"><option value="generated">Записанный ответ Qwen3</option><option value="extractive">Демонстрация выдержек</option></select></label><label><input type="checkbox" id="doc" checked> Разрешён документ</label><label><input type="checkbox" id="audio" checked> Разрешено аудио</label><button id="run">Показать ответ</button><p>Снимите права на источники и посмотрите, как меняется ответ.</p></section><section class="panel"><h2>Ответ</h2><output id="answer" aria-live="polite"></output><p id="provenance" class="muted"></p><h2>Источники</h2><ul id="sources"></ul></section></div>'''
    enterprise += panel("Запись реальной работы (09.11.2026)",'<video controls preload="metadata" poster="qwen.png" src="qwen.mp4">Ваш браузер не поддерживает видео.</video><p>Настоящие Chromium, PostgreSQL, Whisper, BGE и локальная Qwen3:8b. Запись не доказывает семантическую достоверность всех ответов или production-ready IAM.</p><p>'+link("blob/main/enterprise-demo/EVIDENCE-2026-11-09-QWEN.md","Протокол Qwen")+' · '+link("blob/main/enterprise-demo/EVIDENCE-2026-11-09-MCP.md","Протокол MCP")+' · '+link("tree/main/enterprise-demo","Реализация")+'</p>')
    write(out,"enterprise-ai/index.html",page("Enterprise AI","Поиск по документам и аудио с контролем доступа к источникам.",enterprise,"enterprise"))
    for src,dest in [("enterprise-generated-real.mp4","qwen.mp4"),("enterprise-generated-real.png","qwen.png")]:
        shutil.copy2(ROOT/"enterprise-demo/media"/src,out/"enterprise-ai"/dest)
    print("Built",out)
if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    build(args.out.resolve())
