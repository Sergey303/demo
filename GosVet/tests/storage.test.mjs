import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeState, loadState, saveState, clearState} from '../src/app/storage.ts';
import * as seed from '../src/demo-data/seed.ts';

const state = {...seed, selectedClinicId:'clinic-akadem', selectedRole:'doctor', selectedTheme:'lara-light-blue', focusedProblem:null};
test('current state round trips; legacy partial remains supported',()=>{
  assert.deepEqual(decodeState(JSON.stringify({version:2,state})),state);
  assert.deepEqual(decodeState(JSON.stringify({selectedRole:'registrar'})),{selectedRole:'registrar'});
});
test('malformed storage falls back instead of crashing hydration',()=>{
  for(const value of [null,[],true, {appointments:{}}, {appointments:[null]},
    {owners:[{id:'o'}]}, {clinics:[{id:'1',name:'x'},{id:'1',name:'y'}]},
    {selectedRole:'invalid'}, {selectedTheme:'invalid'}, {focusedProblem:[]},
    {version:99,state}, {version:2,state:{selectedRole:'doctor'}},
    {appointments:[{...state.appointments[0],status:'invalid'}]}]){
    assert.equal(decodeState(JSON.stringify(value)),null);
  }
  assert.equal(decodeState('{invalid'),null);
  assert.equal(decodeState(' '.repeat(2_000_001)),null);
});
test('localStorage envelope and unavailable storage',()=>{
  let raw = null;
  globalThis.window = {localStorage:{getItem:()=>raw,setItem:(_key,v)=>{raw=v},removeItem:()=>{raw=null}}};
  try {
    saveState(state);
    assert.equal(JSON.parse(raw).version,2);
    assert.deepEqual(loadState(),state);
    clearState();
    assert.equal(loadState(),null);
    window.localStorage.getItem=()=>{throw Error('storage blocked')};
    assert.equal(loadState(),null);
  } finally {delete globalThis.window;}
});
