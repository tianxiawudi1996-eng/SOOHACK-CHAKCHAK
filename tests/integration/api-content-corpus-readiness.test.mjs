import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken} from '../../developer/src/api/auth.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const secret=process.env.TEST_SESSION_HMAC_SECRET;
if(!secret)throw new Error('TEST_SESSION_HMAC_SECRET_REQUIRED');

async function issueAdmin(){
  const response=await fetch(`${baseUrl}/api/v1/local-demo/privacy-operator/session`,{method:'POST'});
  assert.equal(response.status,201);
  return (await response.json()).data.access_token;
}

test('content corpus readiness is admin-only and fails closed with zero licensed items',async()=>{
  const adminToken=await issueAdmin();
  const response=await fetch(`${baseUrl}/api/v1/admin/content-corpus/readiness`,{headers:{authorization:`Bearer ${adminToken}`}});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.data.status,'BLOCKED_EXTERNAL_CONTENT_EVIDENCE');
  assert.equal(payload.data.target_count,30000);
  assert.equal(payload.data.metrics.registered,0);
  assert.equal(payload.data.claims.corpus_30000_complete,false);
  assert.equal(payload.data.publication_policy.automatic_publication,false);
});

test('student cannot inspect content corpus operations',async()=>{
  const token=createSessionToken({userId:'11111111-1111-4111-8111-111111111111',studentId:'22222222-2222-4222-8222-222222222222'},secret);
  const response=await fetch(`${baseUrl}/api/v1/admin/content-corpus/readiness`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(response.status,403);
});
