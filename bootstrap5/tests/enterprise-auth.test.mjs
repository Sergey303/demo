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

const { configuredPrincipal, demoAuthProfile } = await import('../enterpriseDemoAuth.mjs');

test('startup profiles are immutable, independent and validated', () => {
  assert.equal(configuredPrincipal({}), DEMO_PRINCIPAL);
  for (const values of [[undefined,'alice'], ['team',undefined], ['', 'alice'],
    ['team','a b'], ['team','é'], ['team','a'.repeat(129)], ['team','x\n']]) {
    assert.throws(()=>configuredPrincipal({DEMO_PRINCIPAL_TENANT:values[0],DEMO_PRINCIPAL_SUBJECT:values[1]}));
  }
  const env={DEMO_AUTH_SECRET:SECRET,DEMO_PRINCIPAL_TENANT:'team',DEMO_PRINCIPAL_SUBJECT:'alice'};
  const alice=demoAuthProfile(env);
  env.DEMO_PRINCIPAL_SUBJECT='bob';
  const bob=demoAuthProfile(env);
  for (const [profile,sub] of [[alice,'alice'],[bob,'bob']]) {
    const claims=JSON.parse(Buffer.from(profile.token(100).split('.')[0],'base64url'));
    assert.deepEqual(claims,{tenant:'team',sub,exp:400});
    assert.ok(Object.isFrozen(profile));
  }
  assert.throws(()=>demoAuthProfile({}));
});

test('both real Vite proxies overwrite caller auth with startup identity', async () => {
  const {createServer: httpServer}=await import('node:http');
  const {once}=await import('node:events');
  const {createServer,loadConfigFromFile}=await import('vite');
  const backend=httpServer((req,res)=>{
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({authorization:req.headers.authorization}));
  });
  backend.listen(0,'127.0.0.1');await once(backend,'listening');
  const port=backend.address().port;
  const saved={...process.env};
  try {
    for (const subject of ['alice','bob',null,'missing-secret','short-secret']) {
      process.env.DEMO_AUTH_SECRET=SECRET;
      process.env.DEMO_PRINCIPAL_TENANT='team';
      process.env.DEMO_PRINCIPAL_SUBJECT=subject ?? '';
      if(subject==='missing-secret') delete process.env.DEMO_AUTH_SECRET;
      if(subject==='short-secret') process.env.DEMO_AUTH_SECRET='short';
      const loaded=await loadConfigFromFile({command:'serve',mode:'development'},new URL('../vite.config.ts',import.meta.url).pathname);
      const config=loaded.config;
      for(const prefix of ['/enterprise-api','/enterprise-search'])
        config.server.proxy[prefix].target=`http://127.0.0.1:${port}`;
      const vite=await createServer({...config,configFile:false,root:new URL('..',import.meta.url).pathname,
        server:{...config.server,port:0,strictPort:false}});
      try {
        await vite.listen();
        const vitePort=vite.httpServer.address().port;
        for(const prefix of ['/enterprise-api','/enterprise-search','/enterprise-api-suffix','/enterprise-search-suffix']) {
          const response=await fetch(`http://127.0.0.1:${vitePort}${prefix}/agent/identity?tenant=victim&subject=victim`,{
            headers:{Authorization:'Bearer forged',Cookie:'tenant=victim; subject=victim'}});
          if(subject===null || subject.endsWith('-secret')){assert.equal(response.status,503);continue;}
          assert.equal(response.status,200);
          const {authorization}=await response.json();
          const claims=JSON.parse(Buffer.from(authorization.slice(7).split('.')[0],'base64url'));
          assert.equal(claims.tenant,'team');assert.equal(claims.sub,subject);
        }
      } finally {await vite.close();}
    }
  } finally {
    for(const key of ['DEMO_AUTH_SECRET','DEMO_PRINCIPAL_TENANT','DEMO_PRINCIPAL_SUBJECT']) {
      if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
    }
    backend.closeAllConnections();await new Promise(resolve=>backend.close(resolve));
  }
});
