import { createHmac } from "node:crypto";

// Trusted LOCAL DEMO principal. It must not be configurable from browser input.
export const DEMO_PRINCIPAL = Object.freeze({ tenant: "demo-team", sub: "interviewer" });

export function isDemoSecretValid(secret) {
  return typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32;
}

export function issueDemoToken(secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!isDemoSecretValid(secret)) throw new Error("DEMO_AUTH_SECRET must be at least 32 UTF-8 bytes");
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) throw new Error("Invalid clock");
  const payload = Buffer.from(JSON.stringify({
    tenant: DEMO_PRINCIPAL.tenant,
    sub: DEMO_PRINCIPAL.sub,
    exp: nowSeconds + 300,
  }), "utf8").toString("base64url");
  const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(payload, "ascii").digest("base64url");
  return payload + "." + signature;
}
