import test from 'node:test';
import assert from 'node:assert/strict';
import {getClinicalDemo,complaintTags} from '../src/entities/clinicalDemo.ts';
import {decodeState} from '../src/app/storage.ts';
test('empty history does not invent matched hypotheses; examples remain separate',()=>{
 const x=getClinicalDemo('',[],'Кошка');assert.equal(x.hypotheses.length,0);assert(x.common.length);assert(x.questions.length);
});
test('live history and multiple independent tags',()=>{
 const x=getClinicalDemo('Рвота второй день',['Зуд','Диарея'],'Кошка');
 assert(x.hypotheses.some(x=>x.id==='digestive'));assert(x.hypotheses.some(x=>x.id==='skin'));assert(x.questions.some(x=>x.includes('корм')));
 assert.equal(getClinicalDemo('',['Зуд'],'Кошка').hypotheses.some(x=>x.id==='digestive'),false);
});
test('explicit negation is not a positive cue',()=>{
 assert.equal(getClinicalDemo('Рвоты нет, без диареи',[],'Собака').hypotheses.length,0);
});
test('species-specific examples and rules',()=>{
 assert(getClinicalDemo('Чихание',[],'Кошка').hypotheses.some(x=>x.id==='cat-upper'));
 assert(!getClinicalDemo('Чихание',[],'Собака').hypotheses.some(x=>x.id==='cat-upper'));
 assert.notDeepEqual(getClinicalDemo('',[],'Кошка').common,getClinicalDemo('',[],'Собака').common);
});
test('persisted tags retain legacy compatibility',()=>{
 const item={id:'a',clinicId:'c',doctor:'d',ownerId:'o',animalId:'b',reason:'r',complaint:'',soapObjective:'',soapAssessment:'',soapPlan:'',status:'draft'};
 assert.deepEqual(decodeState(JSON.stringify({appointments:[{...item,complaintTags:[complaintTags[0],complaintTags[1]]}]})).appointments[0].complaintTags,complaintTags.slice(0,2));
 assert.equal(decodeState(JSON.stringify({appointments:[{...item,complaintTags:[42]}]})),null);
 assert(decodeState(JSON.stringify({appointments:[item]})));
});
