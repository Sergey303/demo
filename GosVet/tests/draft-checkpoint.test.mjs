import test from 'node:test';
import assert from 'node:assert/strict';
import {draftSignature,canModifyVaccination,canModifyVisit} from '../src/entities/draftCheckpoint.ts';
const a={id:'a',status:'draft',complaint:'',soapObjective:'',soapAssessment:'',soapPlan:''};
const v={id:'v',appointmentId:'a',vaccineName:'Рабифел',vaccineSeries:'1',vaccineValidUntil:'2027-12-31'};
test('checkpoint ignores ordering and server-derived state but detects changed clinical data',()=>{
 const x={...a,complaintTags:['B','A'],clinicalAnswers:{b:'yes',a:'no'}};
 const y={...a,complaintTags:['A','B'],clinicalAnswers:{a:'no',b:'yes'},vetisStatus:'queued',draftSavedAt:'today'};
 assert.equal(draftSignature(x,[v]),draftSignature(y,[v]));
 assert.notEqual(draftSignature(x,[v]),draftSignature(x,[{...v,vaccineSeries:'2'}]));
 assert.notEqual(draftSignature(x,[v]),draftSignature(x,[]));
 assert.notEqual(draftSignature(x,[v]),draftSignature({...x,complaint:'different'},[v]));
});
test('vaccination mutability guards queued, sending, sent and completed records',()=>{
 assert(canModifyVaccination(a,[],'v'));
 for(const vetisStatus of ['queued','sending','sent'])assert(!canModifyVisit({...a,vetisStatus}));
 assert(!canModifyVaccination(a,[{actionId:'v',status:'sent'}],'v'));
 assert(!canModifyVisit({...a,status:'completed_internal'}));
 assert(canModifyVisit({...a,status:'requires_external_attention',vetisStatus:'fill_error'}));
});
