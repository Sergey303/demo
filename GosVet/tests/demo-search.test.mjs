import test from 'node:test';
import assert from 'node:assert/strict';
import {searchDemoAnimals,filledSoapFields} from '../src/entities/demoSearch.ts';
const animals=[{id:'a',name:'Барсик',chip:'RU-1001',species:'Кошка',ownerId:'o'},{id:'b',name:'Рекс',chip:'RU-2002',species:'Собака',ownerId:'p'}];
const owners=[{id:'o',fullName:'Иванова',phone:'+70000000001'},{id:'p',fullName:'Петров',phone:'+70000000002'}];
const visit={id:'v',animalId:'a',clinicId:'c',status:'in_progress',startedAt:'2026-06-01',complaint:'',soapObjective:'',soapAssessment:'',soapPlan:''};
const completed={...visit,id:'old',status:'completed_internal',startedAt:'2026-05-18',complaint:'1',soapObjective:'2',soapAssessment:'3',soapPlan:'4'};
const data=[visit,completed,{...visit,id:'other',clinicId:'other',animalId:'b'}];
const search=q=>searchDemoAnimals(animals,owners,data,q,'c');
test('empty query exposes the most populated historical example first',()=>{
 const rows=search('   ');assert.equal(rows.length,2);assert.equal(rows[0].animal.id,'a');assert.equal(rows[0].example.id,'old');assert.equal(filledSoapFields(rows[0].example),4);assert.equal(rows[0].current.id,'v');assert.equal(rows[1].visits.length,0);assert.equal(rows[0].reason,null);
});
test('formatted phone and other keys find the right animal',()=>{
 for(const q of ['+7 (000) 000-00-01','иванова','RU-1001',' БАРСИК '])assert.deepEqual(search(q).map(r=>r.animal.id),['a']);
 assert.equal(search('несуществующее').length,0);
});
