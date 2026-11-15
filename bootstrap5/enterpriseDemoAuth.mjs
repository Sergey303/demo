import { createHmac } from "node:crypto";

// Trusted LOCAL DEMO principal. It must not be configurable from browser input.
export const DEMO_PRINCIPAL = Object.freeze({ tenant: "demo-team", sub: "interviewer" });

export function isDemoSecretValid(secret) {
  return typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32;
}

export function configuredPrincipal(env = process.env) {
  const tenant = env.DEMO_PRINCIPAL_TENANT;
  const sub = env.DEMO_PRINCIPAL_SUBJECT;
  if (tenant === undefined && sub === undefined) return DEMO_PRINCIPAL;
  if (![tenant, sub].every(v => typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v)))
    throw new Error("Invalid local demo principal configuration");
  return Object.freeze({ tenant, sub });
}

// Capture once at server startup. Request data is never consulted.
export function demoAuthProfile(env = process.env) {
  const principal = configuredPrincipal(env);
  const secret = env.DEMO_AUTH_SECRET;
  if (!isDemoSecretValid(secret)) throw new Error("Local demo auth is not configured");
  return Object.freeze({ token: (nowSeconds) => issueDemoToken(secret, nowSeconds, principal) });
}

export function issueDemoToken(secret, nowSeconds = Math.floor(Date.now() / 1000), principal = DEMO_PRINCIPAL) {
  principal = configuredPrincipal({DEMO_PRINCIPAL_TENANT: principal?.tenant,
    DEMO_PRINCIPAL_SUBJECT: principal?.sub});
  if (!isDemoSecretValid(secret)) throw new Error("DEMO_AUTH_SECRET must be at least 32 UTF-8 bytes");
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) throw new Error("Invalid clock");
  const payload = Buffer.from(JSON.stringify({
    tenant: principal.tenant,
    sub: principal.sub,
    exp: nowSeconds + 300,
  }), "utf8").toString("base64url");
  const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(payload, "ascii").digest("base64url");
  return payload + "." + signature;
}
