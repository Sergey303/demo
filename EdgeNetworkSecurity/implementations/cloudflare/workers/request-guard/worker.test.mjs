import assert from "node:assert/strict";
import test from "node:test";
import { createGuard } from "./worker.mjs";

const ingress = "https://edge.invalid";
const env = { ORIGIN: "https://origin.invalid" };
const request = (path = "/edge-health", init) => new Request(ingress + path, init);
const unexpectedFetch = () => assert.fail("unexpected origin call");

test("only the fixed, queryless GET route can reach the origin", async () => {
  let calls = 0;
  const guard = createGuard(() => {
    calls++;
    return unexpectedFetch();
  });
  for (const path of ["/", "/edge-health/", "/edge-health?x=1", "/edge-health?"]) {
    assert.equal((await guard.fetch(request(path), env)).status, 404);
  }
  const response = await guard.fetch(request("/edge-health", { method: "POST" }), env);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(calls, 0);
});

test("unusable origin settings fail closed", async () => {
  let calls = 0;
  const guard = createGuard(() => { calls++; });
  for (const ORIGIN of [undefined, "http://origin.invalid", "https://edge.invalid:443",
    ingress, "https://edge.invalid:8443", "https://user@origin.invalid",
    "https://origin.invalid/path", "https://origin.invalid?x", "https://origin.invalid#x"]) {
    assert.equal((await guard.fetch(request(), { ORIGIN })).status, 503);
  }
  assert.equal(calls, 0);
});

test("the origin receives only a generated request ID and a fixed health GET", async () => {
  const calls = [];
  const guard = createGuard((url, init) => {
    calls.push({ url, init });
    return new Response("private", { headers: { "set-cookie": "private" } });
  });
  const incoming = request("/edge-health", { headers: {
    authorization: "fixture", cookie: "fixture", "x-request-id": "caller",
    "x-forwarded-for": "192.0.2.1", "cf-connecting-ip": "192.0.2.2",
  } });
  const first = await guard.fetch(incoming, env);
  const second = await guard.fetch(incoming, env);
  assert.equal(calls.length, 2);
  const id = first.headers.get("x-request-id");
  assert.match(id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.notEqual(id, second.headers.get("x-request-id"));
  assert.equal(calls[0].url, "https://origin.invalid/health");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.cache, "no-store");
  assert.deepEqual(calls[0].init.headers, { "x-request-id": id });
  assert.equal(first.status, 204);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal(first.headers.get("set-cookie"), null);
  assert.equal(await first.text(), "");
});

test("redirects and origin failures map to empty errors, preserving 429", async () => {
  for (const status of [302, 401, 429, 503]) {
    let calls = 0;
    let canceled = false;
    const guard = createGuard(() => {
      calls++;
      const body = new ReadableStream({ cancel() { canceled = true; } });
      return new Response(body, { status, headers: { location: "https://other.invalid" } });
    });
    const response = await guard.fetch(request(), env);
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert.equal(response.headers.get("location"), null);
    assert.equal(await response.text(), "");
    assert.equal(calls, 1);
    assert.equal(canceled, true);
  }
  const guard = createGuard(() => { throw new Error("private details"); });
  const response = await guard.fetch(request(), env);
  assert.equal(response.status, 502);
  assert.equal(await response.text(), "");
});

test("deadline returns 504 and aborts even if transport never settles", async () => {
  let signal;
  const guard = createGuard((_url, init) => {
    signal = init.signal;
    return new Promise(() => {});
  }, 10);
  assert.equal((await guard.fetch(request(), env)).status, 504);
  assert.equal(signal.aborted, true);
});
