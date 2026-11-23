# Request guard Worker

[worker.mjs](worker.mjs) is a Workers module with a single health route. Set the
trusted `ORIGIN` binding to a canonical HTTPS origin, for example
`https://origin.invalid` without a trailing slash. A queryless `GET /edge-health`
issues one `GET /health` to that origin with manual redirect handling and
`cache: no-store`. The handler uses a fresh `x-request-id` for each request and
sends it as the only application-supplied upstream header. Every response is
empty and marked `no-store`. Upstream bodies are canceled and upstream headers
are discarded. [Workers fetch handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)
and [Request options](https://developers.cloudflare.com/workers/runtime-apis/request/).

| Status | Handler condition |
| --- | --- |
| 204 | Origin returned 2xx |
| 404 | Path or query is outside the health contract |
| 405 | Unsupported method on the health route |
| 429 | Origin returned 429 |
| 502 | Other origin status (including redirects) or fetch failure |
| 503 | Missing or invalid origin binding |
| 504 | No origin response headers within the 1,500 ms deadline |

From this directory, run `node --test worker.test.mjs` with Node 22 or later.
Tests use in-process Requests and an injected fetch function. No sockets,
credentials or Workers account are used.

Bind only a dedicated, controlled health origin. The same ingress hostname is
rejected. Verify aliases and routing independently to avoid recursion. Protect
the health ingress with the staging zone's policy, disable alternate public
Worker ingress, and restrict access to the origin. Cloudflare documents that
same-zone Worker subrequests skip custom and managed WAF rules, so use the
ingress policy and origin access controls as separate boundaries. [Cloudflare
security feature interoperability](https://developers.cloudflare.com/waf/feature-interoperability/).
