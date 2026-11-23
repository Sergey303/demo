# Edge evidence dashboard — React/Vite

Read-only, **static and offline** visualization of the checked-in [synthetic routing and policy report](../EVIDENCE-OFFLINE.json) and [measured localhost HTTP plus simulated AI advice](../EVIDENCE-HTTP-ADVICE.json).

## Run locally

From this directory (Node.js 22+; no provider credentials):

```bash
npm ci --no-audit --no-fund
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

The Vite build checks both source JSON objects before bundling them. It does not fetch remote services, route real network traffic, run models or make provider requests. Static assets are bundled for offline inspection. `npm run dev` serves a local development UI; no origin or external provider is contacted.

## What the UI means

- **Simulated**: BGP/Anycast routing, anomaly fixtures and policy decisions, including synthetic fallback counts. These are not measurements of global routing, provider DDoS mitigation or real attack detection.
- **Local-tested**: saved 200/429/503 responses from the bounded ASP.NET Core loopback experiment, distinct from the later simulated AI recommendations. HTTP 429 means temporary rate limiting, not a WAF hard block.
- **Blocked**: Cloudflare, Yandex Cloud and EdgeCenter deployments or account-specific verification have not occurred.
- **Unknown/failed**: rejected evidence schemas must never be shown as successful measurements.

The evidence reader rejects unexpected schema versions, invalid nested statuses, nonfinite values and prototype-polluting fields. It does not substitute for verified, authenticated, immutable production telemetry.

## Acceptance and further work

`npm test`: **6 tests passed**. `npm run build`: **Vite 7.3.8 succeeded**. In Chromium, both 320 px and 1280 px views were checked for readable status distinctions, keyboard navigation, source information and unexpected external requests.

The dashboard is a portfolio visualizer, **not** a live production monitoring console. See [TASK.md](TASK.md) for future browser failure-state and assistive-technology checks, and the [EIS architecture](../README.md) for real HTTP testing instructions.
