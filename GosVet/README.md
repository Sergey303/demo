# GosVet single-file demo

## Run

```bash
npm install
npm run dev
```

Dev URL: `http://localhost:5173`

## Build portable demo

```bash
npm run build
```

Expected artifact:

```text
dist/index.html
```

Routes:

- `index.html#/appointments/today`
- `index.html#/appointment/demo-001`
- `index.html#/external/retry/demo-001`
- `index.html#/attention`
- `index.html#/search`

## Persisted demo state

Versioned localStorage snapshots validate row shapes, IDs, enums and required fields before hydration; incompatible data falls back to seed state. Valid legacy partial snapshots remain readable. This is structural validation, not business-level referential integrity. Run `node --test tests/storage.test.mjs` on Node 22.18+ (Node 24 used for verification).

## Сквозная приёмка рабочего дня врача

[Сценарий показа и приёмки](gosvet_demo_scenarios_for_doctor.md) · [реестр первого прогона](DOCTOR-JOURNEY-2026-11-26.md).

Из корня репозитория: `npm ci --prefix public-demos`, `npm ci --prefix GosVet`, `npm run build --prefix GosVet`, затем `node public-demos/gosvet-journey.mjs GosVet/dist/index.html`. Это диагностический прогон, который намеренно сообщает ненулевой код при обнаружении дефектов; пока не включён в зелёный smoke gate.

## Учебный помощник врача

Под полем анамнеза — несколько сохраняемых причин обращения, гипотезы по
совпадениям текста/тегов, отдельные типовые варианты для вида животного и
уточняющие вопросы. `src/entities/clinicalDemo.ts` содержит полностью
статические примеры и простые правила (включая ограниченную обработку отрицаний).
Не реальная LLM, не медицинская база, не статистика распространённости.
Диагноз и назначения остаются полями врача; никаких автоматических записей.
Проверка: `node --test tests/clinical-demo.test.mjs tests/storage.test.mjs`.
Браузерная приёмка включена в public-demos/smoke.mjs, сценарий G18.

Ответы «Да / Нет / Неизвестно» (G19) сохраняются отдельно от SOAP и тегов.
Учебный порядок меняется по явным связям вопроса и активной гипотезы;
показывается причина изменения, нет автоматического исключения.
Неактуальные ответы можно просмотреть/снять, но они не влияют на текущие гипотезы.
После завершения приёма — только просмотр сохранённых ответов.

G20: неполученные ответы упорядочиваются по способности изменять относительный
порядок близких учебных гипотез, затем по различению остальных вариантов и
общему контексту. Показаны ближайшие три, остальные доступны по кнопке.
Это не клиническая приоритизация, не информационный выигрыш на вероятностях.
