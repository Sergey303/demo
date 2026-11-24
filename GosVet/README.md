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
