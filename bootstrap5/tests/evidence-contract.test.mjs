import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSearch, validateAnswer } from '../src/pages/evidenceContract.ts';

const base = {job_id: '11111111-1111-1111-1111-111111111111', source: 'x', text: 'Evidence.', score: .8};
const rows = [
  {kind:'audio', start:-1, end:2},
  {kind:'audio', start:2, end:1},
  {kind:'audio', start:0, end:Infinity},
  {kind:'audio', start:NaN, end:1},
  {kind:'document', char_start:-1, char_end:2},
  {kind:'document', char_start:2, char_end:2},
  {kind:'document', char_start:1.5, char_end:3},
  {kind:'document', char_start:0, char_end:Number.MAX_SAFE_INTEGER+1},
];
const answer = row => ({mode:'evidence', semantic_verified:false, answer:'Evidence.', abstained:false, reason:'quote', citations:[{...base,...row,quote:'Evidence.'}]});
for (const row of rows) {
  test('reject invalid range '+JSON.stringify(row), () => {
    assert.throws(()=>validateSearch({hits:[{...base,...row}],abstained:false}));
    assert.throws(()=>validateAnswer(answer(row)));
  });
}
for (const row of [{kind:'audio',start:0,end:1.25},{kind:'document',char_start:0,char_end:9}]) {
  test('accept valid '+row.kind, ()=>{
    assert.equal(validateSearch({hits:[{...base,...row}],abstained:false}).hits.length,1);
    assert.equal(validateAnswer(answer(row)).citations.length,1);
  });
}
