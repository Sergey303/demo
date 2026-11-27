import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReliable,KEY,PAYLOAD,CHANGED,SCENARIOS,hashOf} from './reliable-model.mjs';
const act=(m,id)=>assert.equal(m.action(id),true,id);
const lane=m=>m.snapshot().lanes[0];
function check(m){
  for(const l of m.snapshot().lanes){
    const jobs=l.jobs;
    if(l.name==='С защитой')assert.equal(new Set(jobs.map(j=>j.key)).size,jobs.length);
    assert.equal(new Set(jobs.map(j=>j.eventId)).size,jobs.length);
    for(const j of jobs){
      assert.equal(j.state==='done',j.processedAt!==null);
      assert.equal(j.state==='done',j.words!==undefined);
      assert.equal(j.state==='failed',j.attempts===5);
      if(j.state==='failed')assert.equal(j.nextAttemptAt,'max');
    }
    if(l.client.knownId)assert(jobs.some(j=>j.id===l.client.knownId));
  }
}
test('RJ01–05 identical actions, distinct stores and sender knowledge',()=>{
  const m=createReliable();act(m,'lost');check(m);
  assert.equal(lane(m).client.knownId,null);assert.equal(lane(m).jobs.length,1);
  act(m,'repeat');check(m);assert.equal(lane(m).client.knownId,'JOB-001');
  assert.equal(m.snapshot().lanes[1].jobs.length,2);
  act(m,'process');assert.match(lane(m).client.observation,/ещё не проверен/);
  act(m,'get');check(m);assert.match(lane(m).client.observation,/результат проверен/);
  const finished=m.snapshot();for(const id of ['replay','reprocess','newKey'])assert.equal(m.action(id),false);assert.deepEqual(m.snapshot(),finished);
  assert.equal(m.snapshot().lanes[1].jobs.filter(j=>j.state==='done').length,2);
});
test('RJ06 T03 rollback leaves no committed rows; retry accepts',()=>{
  const m=createReliable('intake');act(m,'intakeRollback');check(m);
  assert.equal(lane(m).jobs.length,0);assert.equal(lane(m).client.knownId,null);
  act(m,'repeat');assert.equal(lane(m).jobs.length,1);assert.match(lane(m).client.last,/202/);
});
test('RJ07 T02 conflict cannot mutate original',()=>{
  const m=createReliable('conflict');act(m,'send');const original=lane(m).jobs;
  act(m,'conflict');assert.deepEqual(lane(m).jobs,original);assert.match(lane(m).client.last,/409/);
  act(m,'repeat');assert.match(lane(m).client.last,/200/);assert.equal(lane(m).jobs[0].text,PAYLOAD);
});
test('RJ08–09 T04 rollback and completion atomic, reprocess and replay stable',()=>{
  const m=createReliable('worker');act(m,'send');const before=lane(m).jobs;
  act(m,'workerRollback');assert.deepEqual(lane(m).jobs,before);
  act(m,'process');check(m);act(m,'get');const done=lane(m).jobs;
  act(m,'reprocess');assert.deepEqual(lane(m).jobs,done);
  act(m,'replay');assert.match(lane(m).client.last,/200 already-accepted/);
  act(m,'terminalGet');assert.match(lane(m).client.last,/done/);
  act(m,'newKey');assert.equal(lane(m).jobs.length,2);assert.equal(lane(m).jobs[1].key,KEY+'-new');
  act(m,'terminalGet');assert.match(lane(m).client.last,/queued/);assert.equal(m.action('terminalGet'),false);assert.equal(m.action('reprocess'),false);check(m);
});
test('RJ10–11 T05 committed failures and terminal replay',()=>{
  const m=createReliable('failures');act(m,'send');
  for(const [i,delay] of [1,2,4,8].entries()){
    act(m,'failure');const j=lane(m).jobs[0];assert.equal(j.attempts,i+1);assert.equal(j.nextAttemptAt-lane(m).clock,delay);check(m);
  }
  act(m,'failure');check(m);act(m,'get');const failed=lane(m).jobs;
  act(m,'replay');assert.match(lane(m).client.last,/200/);
  act(m,'terminalGet');assert.match(lane(m).client.last,/failed/);
  act(m,'reprocess');assert.deepEqual(lane(m).jobs,failed);assert.equal(m.action('failure'),false);
});
test('RJ12 no external safe repeat and invalid actions cannot mutate',()=>{
  const m=createReliable('external');assert.equal(m.action('send'),false);
  act(m,'externalLost');const s=m.snapshot();assert(s.external);
  for(const id of ['repeat','replay','newKey',null,'constructor','primary'])assert.equal(m.action(id),false);
  assert.deepEqual(m.snapshot(),s);
});
test('all paths preserve model invariants and independent snapshots',()=>{
  for(const [id,scenario] of Object.entries(SCENARIOS)){
    const m=createReliable(id);for(const action of scenario.steps){act(m,action);check(m);}
    const s=m.snapshot();s.lanes[0].client.posts=123;assert.notEqual(lane(m).client.posts,123);
  }
});

test("fixed SHA-256 values match exact UTF-8 payloads",()=>{for(const text of [PAYLOAD,CHANGED])assert.equal(hashOf(text),createHash("sha256").update(text,"utf8").digest("hex").toUpperCase());assert.notEqual(hashOf(PAYLOAD),hashOf(CHANGED));});
