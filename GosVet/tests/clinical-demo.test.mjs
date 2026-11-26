import test from 'node:test';
import assert from 'node:assert/strict';
import {getClinicalDemo,complaintTags} from '../src/entities/clinicalDemo.ts';
import {decodeState} from '../src/app/storage.ts';
test('empty history does not invent matched hypotheses; examples remain separate',()=>{
 const x=getClinicalDemo('',[],'Кошка');assert.equal(x.hypotheses.length,0);assert(x.common.length);assert(x.questions.length);
});
test('live history and multiple independent tags',()=>{
 const x=getClinicalDemo('Рвота второй день',['Зуд','Диарея'],'Кошка');
 assert(x.hypotheses.some(x=>x.id==='digestive'));assert(x.hypotheses.some(x=>x.id==='skin'));assert(x.questions.some(x=>x.text.includes('корм')));
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

test('answers reorder hypotheses reversibly without excluding any',()=>{
 const original=getClinicalDemo('Рвота',[],'Кошка');
 const yes=getClinicalDemo('Рвота',[],'Кошка',{'parasite-exposure':'yes','diet-change':'no'});
 assert.equal(yes.hypotheses[0].id,'parasites');
 assert.equal(yes.hypotheses.find(h=>h.id==='digestive').score,-1);
 assert.equal(yes.hypotheses[0].reasons[0].id,'parasite-exposure');
 assert.deepEqual(yes.hypotheses.map(h=>h.id).sort(),original.hypotheses.map(h=>h.id).sort());
 assert.deepEqual(getClinicalDemo('Рвота',[],'Кошка',{'parasite-exposure':'unknown'}).hypotheses,original.hypotheses);
 assert.equal(getClinicalDemo('Рвота',[],'Кошка',{'parasite-exposure':'no','diet-change':'yes'}).hypotheses[0].id,'digestive');
});
test('irrelevant answers retained but not applied; answers alone do not invent hypotheses',()=>{
 const x=getClinicalDemo('Зуд',[],'Кошка',{'parasite-exposure':'yes'});
 assert.equal(x.hypotheses[0].score,0);assert.equal(x.retainedQuestions[0].id,'parasite-exposure');
 assert.equal(getClinicalDemo('',[],'Кошка',{'diet-change':'yes'}).hypotheses.length,0);
});
test('persisted answers validate IDs and enum and accept old snapshots',()=>{
 const row={id:'a',clinicId:'c',doctor:'d',ownerId:'o',animalId:'b',reason:'r',complaint:'',soapObjective:'',soapAssessment:'',soapPlan:'',status:'draft'};
 const valid={'diet-change':'yes','parasite-exposure':'unknown'};
 assert.deepEqual(decodeState(JSON.stringify({appointments:[{...row,clinicalAnswers:valid}]})).appointments[0].clinicalAnswers,valid);
 for(const clinicalAnswers of [{'diet-change':'maybe'},{'fake-id':'yes'},[],null]){
 assert.equal(decodeState(JSON.stringify({appointments:[{...row,clinicalAnswers}]})),null);
 }
 assert(decodeState(JSON.stringify({appointments:[row]})));
});

test('adaptive question order distinguishes close hypotheses before shared and generic context',()=>{
 const x=getClinicalDemo('Рвота',[],'Кошка');
 assert.equal(x.nextQuestion.id,'diet-change');
 assert.equal(x.questionPriority['diet-change'].tier,3);
 assert.equal(x.questionPriority['loose-stool'].tier,1);
 assert.equal(x.questionPriority['sudden-onset'].tier,0);
 assert(x.questions.findIndex(q=>q.id==='parasite-exposure')<x.questions.findIndex(q=>q.id==='loose-stool'));
 const y=getClinicalDemo('Рвота',[],'Кошка',{'diet-change':'yes'});
 assert.equal(y.nextQuestion.id,'parasite-exposure');
 assert.equal(y.questions.at(-1).id,'diet-change');
 assert.equal(y.questionPriority['parasite-exposure'].closePairs.length,1);
 const z=getClinicalDemo('Рвота',[],'Кошка',{'diet-change':'yes','foreign-object':'yes'});
 assert.equal(z.questionPriority['parasite-exposure'].tier,2);
 assert.equal(z.questionPriority['parasite-exposure'].closePairs.length,0);
});
test('unknown advances question without changing hypotheses, reset restores initial ordering',()=>{
 const initial=getClinicalDemo('Рвота',[],'Кошка');
 const x=getClinicalDemo('Рвота',[],'Кошка',{'diet-change':'unknown'});
 assert.deepEqual(x.hypotheses,initial.hypotheses);
 assert.equal(x.nextQuestion.id,'parasite-exposure');
 const answered=Object.fromEntries(initial.questions.map(q=>[q.id,'unknown']));
 const done=getClinicalDemo('Рвота',[],'Кошка',answered);
 assert.equal(done.nextQuestion,null);assert.equal(done.pendingCount,0);
 assert.deepEqual(done.hypotheses,initial.hypotheses);
 assert.equal(getClinicalDemo('Рвота',[],'Кошка',{}).nextQuestion.id,'diet-change');
});
test('no matches and one match do not pretend to distinguish competing hypotheses',()=>{
 const empty=getClinicalDemo('',[],'Кошка');
 assert.equal(empty.nextQuestion.id,'sudden-onset');
 assert.equal(empty.questionPriority[empty.nextQuestion.id].tier,0);
 const single=getClinicalDemo('Хромота',[],'Собака');
 assert.equal(single.hypotheses.length,1);
 assert.equal(single.nextQuestion.id,'trauma');
 assert.equal(single.questionPriority.trauma.tier,1);
});
