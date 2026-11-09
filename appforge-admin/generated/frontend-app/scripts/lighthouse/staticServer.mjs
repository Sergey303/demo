import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

export async function startStaticServer(root, port = 0) {
  const rootPath = resolve(root);
  const server = createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" }); response.end(); return;
    }
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = resolveAsset(rootPath, decodeURIComponent(url.pathname));
      const body = await readFile(filePath);
      const compressed = /(?:^|[,\s])gzip(?:$|[,\s])/.test(String(request.headers["accept-encoding"] ?? ""));
      const payload = compressed ? gzipSync(body) : body;
      response.writeHead(200, {
        "content-type": contentType(filePath),
        "content-length": String(payload.length),
        "cache-control": filePath.endsWith(".html") ? "no-store" : "public, max-age=31536000, immutable",
        ...(compressed ? { "content-encoding": "gzip", vary: "accept-encoding" } : {}),
      });
      response.end(request.method === "HEAD" ? undefined : payload);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  return new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Static server address is unavailable."));
      resolveReady({ origin: `http://127.0.0.1:${address.port}`, close: () => new Promise(resolveClose => server.close(resolveClose)) });
    });
  });
}

function resolveAsset(root, pathname) {
  if (pathname.includes("..") || pathname.includes("\\")) throw new Error("Invalid path");
  const relative = pathname.replace(/^\/+|\/+$/gu, "") || "index.html";
  const filePath = resolve(root, extname(relative) ? relative : "index.html");
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) throw new Error("Invalid path");
  return filePath;
}

function contentType(path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}
