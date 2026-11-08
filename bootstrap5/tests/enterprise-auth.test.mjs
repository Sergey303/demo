import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { DEMO_PRINCIPAL, isDemoSecretValid, issueDemoToken } from "../enterpriseDemoAuth.mjs";

const SECRET = "test-secret-only-abcdefghijklmnopqrstuvwxyz-123456";

test("fixed server-side principal matches Python/C# signed-token contract", () => {
  const token = issueDemoToken(SECRET, 1_700_000_000);
  const parts = token.split(".");
  assert.equal(parts.length, 2);
  assert.deepEqual(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")), {
    tenant: "demo-team", sub: "interviewer", exp: 1_700_000_300,
  });
  const expected = createHmac("sha256", Buffer.from(SECRET, "utf8"))
    .update(parts[0], "ascii").digest("base64url");
  assert.equal(parts[1], expected);
  assert.deepEqual(DEMO_PRINCIPAL, { tenant: "demo-team", sub: "interviewer" });
  assert.equal(isDemoSecretValid(SECRET), true);
});

test("missing, too-short and malformed secrets fail closed", () => {
  for (const secret of [undefined, "", "short", "A".repeat(31)]) {
    assert.equal(isDemoSecretValid(secret), false);
    assert.throws(() => issueDemoToken(secret));
  }
  assert.throws(() => issueDemoToken(SECRET, -1));
  assert.throws(() => issueDemoToken(SECRET, 1.5));
});
