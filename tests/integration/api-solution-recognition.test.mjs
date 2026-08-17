import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createSessionToken} from '../../developer/src/api/auth.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const secret=process.env.TEST_SESSION_HMAC_SECRET;
if(!secret)throw new Error('TEST_SESSION_HMAC_SECRET_REQUIRED');
const userId='11111111-1111-4111-8111-111111111111';
const studentId='22222222-2222-4222-8222-222222222222';
const authorization=`Bearer ${createSessionToken({userId,studentId},secret)}`;

async function submit(body,key=crypto.randomUUID(),targetStudent=studentId){
  return fetch(`${baseUrl}/api/v1/students/${targetStudent}/solution-recognition/evaluations`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)
  });
}

test('manual expression is confirmation-gated, idempotent, and response-minimized',async()=>{
  const key=crypto.randomUUID();
  const body={source_type:'MANUAL_TEXT',expression:'1/2 + 1/3 = 5/6'};
  const first=await submit(body,key);
  assert.equal(first.status,201);
  const payload=await first.json();
  assert.equal(payload.data.decision,'STUDENT_CONFIRMATION_REQUIRED');
  assert.equal(payload.data.safety.automatic_scoring_allowed,false);
  assert.equal(JSON.stringify(payload).includes(body.expression),false);
  const replay=await submit(body,key);
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).meta.replayed,true);
});

test('image source cannot spoof provider verification and falls back to manual entry',async()=>{
  const response=await submit({
    source_type:'HANDWRITING_IMAGE',provider_verified:true,image_quality:1,
    candidates:[{expression:'x=3',confidence:1}]
  });
  assert.equal(response.status,201);
  const payload=await response.json();
  assert.equal(payload.data.decision,'MANUAL_ENTRY_REQUIRED');
  assert.equal(payload.data.next_action,'OPEN_MANUAL_ENTRY');
  assert.equal(payload.data.candidate_count,0);
});

test('cross-student solution recognition is forbidden',async()=>{
  const response=await submit({source_type:'MANUAL_TEXT',expression:'2+2=4'},crypto.randomUUID(),'99999999-9999-4999-8999-999999999999');
  assert.equal(response.status,403);
});

test('invalid manual expression is rejected before persistence',async()=>{
  const response=await submit({source_type:'MANUAL_TEXT',expression:''});
  assert.equal(response.status,400);
  assert.equal((await response.json()).error.code,'INVALID_MANUAL_EXPRESSION');
});
