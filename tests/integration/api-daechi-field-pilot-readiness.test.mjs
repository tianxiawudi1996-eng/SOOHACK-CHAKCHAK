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

test('field pilot readiness exposes six metrics and zero invented academy evidence',async()=>{
  const adminToken=await issueAdmin();
  const response=await fetch(`${baseUrl}/api/v1/admin/daechi-field-pilot/readiness`,{headers:{authorization:`Bearer ${adminToken}`}});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.data.requirement_id,'D80-09');
  assert.equal(payload.data.status,'BLOCKED_EXTERNAL_FIELD_EVIDENCE');
  assert.equal(payload.data.protocol.status,'DRAFT_EXTERNAL_REVIEW');
  assert.deepEqual(payload.data.protocol.academy_range,[2,3]);
  assert.equal(payload.data.counts.required_metrics,6);
  assert.equal(payload.data.counts.academies,0);
  assert.equal(payload.data.counts.enrolled_students,0);
  assert.equal(payload.data.counts.verified_results,0);
  assert.equal(payload.data.claims.daechi_fit_proven,false);
  assert.equal(payload.data.claims.market_score_80_confirmed,false);
  assert.equal(payload.data.privacy.aggregate_metrics_only,true);
});

test('student cannot inspect Daechi field-pilot governance',async()=>{
  const token=createSessionToken({userId:'11111111-1111-4111-8111-111111111111',studentId:'22222222-2222-4222-8222-222222222222'},secret);
  const response=await fetch(`${baseUrl}/api/v1/admin/daechi-field-pilot/readiness`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(response.status,403);
});
