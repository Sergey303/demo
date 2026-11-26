import test from 'node:test';
import assert from 'node:assert/strict';
import {getVisitAssistant} from '../src/entities/clinicalStages.ts';
import {decodeState} from '../src/app/storage.ts';
const base={id:'a',clinicId:'c',doctor:'d',ownerId:'o',animalId:'b',reason:'r',complaint:'Рвота',soapObjective:'',soapAssessment:'',soapPlan:'',status:'draft'};
test('empty text and exam do not invent observed facts',()=>{
 const x=getVisitAssistant({...base,complaint:''},'Кошка');
 assert.equal(x.filled,0);assert.equal(x.activeObservations.length,0);assert.equal(x.evidence.length,0);
 assert.equal(x.differences.length,0);
});
test('observations and owner replies retain distinct provenance',()=>{
 const x=getVisitAssistant({...base,clinicalAnswers:{'loose-stool':'yes'},clinicalObservations:{'stool-observed':'absent','abdomen-discomfort':'present'}},'Кошка');
 const h=x.evidence.find(h=>h.id==='digestive');
 assert(h.support.some(r=>r.source==='Ответ владельца'));
 assert(h.support.some(r=>r.source==='Осмотр'));
 assert(h.against.some(r=>r.source==='Осмотр'));
 assert.equal(x.differences[0].id,'stool-observed');
 assert.equal(x.recordedObservations,2);
 assert.equal(x.filled,1);
});
test('unknown and inactive observations are not interpreted as absence',()=>{
 const x=getVisitAssistant({...base,clinicalAnswers:{'loose-stool':'yes'},clinicalObservations:{'stool-observed':'unknown','skin-change':'present'}},'Кошка');
 assert.equal(x.differences.length,0);
 assert(x.evidence.every(h=>h.against.length===0));
 assert.equal(x.savedInactive[0].id,'skin-change');
 assert(x.evidence.some(h=>h.missing.includes('Жидкий стул наблюдался во время приёма')));
});
test('exam supports review and contextual plan without mutating SOAP',()=>{
 const a={...base,soapObjective:'Осмотр записан',soapAssessment:'Оценка врача',soapPlan:'План врача',clinicalObservations:{'abdomen-discomfort':'present'}};
 const snapshot=JSON.stringify(a);
 const x=getVisitAssistant(a,'Кошка');
 assert.equal(x.filled,4);assert.equal(x.missing.length,0);assert(x.planTopics.some(s=>s.includes('ЖКТ')));
 assert.equal(JSON.stringify(a),snapshot);
});
test('observation persistence validates keys and enum, preserves legacy',()=>{
 const a={...base,clinicalObservations:{'abdomen-discomfort':'present','stool-observed':'unknown'}};
 assert.deepEqual(decodeState(JSON.stringify({appointments:[a]})).appointments[0],a);
 for(const clinicalObservations of [{'made-up':'present'},{'stool-observed':'maybe'},null,[]]){
  assert.equal(decodeState(JSON.stringify({appointments:[{...base,clinicalObservations}]})),null);
 }
 assert(decodeState(JSON.stringify({appointments:[base]})));
});
