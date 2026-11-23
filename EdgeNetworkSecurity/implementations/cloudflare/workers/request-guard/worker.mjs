const ROUTE = "/edge-health";
const DEADLINE_MS = 1500;

function reply(status, requestId, headers = {}) {
  return new Response(null, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": requestId, ...headers },
  });
}

function probeUrl(value, ingress) {
  if (typeof value !== "string") return null;
  try {
    const origin = new URL(value);
    // Require the canonical HTTPS origin alone. Keep all request URL data out of the target.
    if (origin.protocol !== "https:" || value !== origin.origin ||
        origin.hostname === ingress.hostname) return null;
    return new URL("/health", origin);
  } catch {
    return null;
  }
}

export function createGuard(fetchOrigin, deadlineMs = DEADLINE_MS) {
  return {
    async fetch(request, env) {
      const requestId = crypto.randomUUID();
      const ingress = new URL(request.url);
      if (ingress.pathname !== ROUTE || ingress.href.includes("?")) {
        return reply(404, requestId);
      }
      if (request.method !== "GET") return reply(405, requestId, { allow: "GET" });

      const target = probeUrl(env?.ORIGIN, ingress);
      if (!target) return reply(503, requestId);

      const controller = new AbortController();
      let timer;
      // Cover the time to response headers even if the transport ignores cancellation.
      const deadline = new Promise(resolve => {
        timer = setTimeout(() => {
          resolve(504);
          controller.abort();
        }, deadlineMs);
      });

      async function probe() {
        try {
          const upstream = await fetchOrigin(target.href, {
            method: "GET",
            headers: { "x-request-id": requestId },
            redirect: "manual",
            cache: "no-store",
            signal: controller.signal,
          });
          if (upstream.body) void upstream.body.cancel().catch(() => {});
          if (upstream.ok) return 204;
          if (upstream.status === 429) return 429;
          return 502;
        } catch {
          return 502;
        }
      }

      try {
        return reply(await Promise.race([deadline, probe()]), requestId);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export default createGuard((url, options) => fetch(url, options));
