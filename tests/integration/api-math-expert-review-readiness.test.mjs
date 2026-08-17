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

test('math expert readiness exposes criteria but no invented experts or approvals',async()=>{
  const adminToken=await issueAdmin();
  const response=await fetch(`${baseUrl}/api/v1/admin/math-expert-review/readiness`,{headers:{authorization:`Bearer ${adminToken}`}});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.data.requirement_id,'D80-07');
  assert.equal(payload.data.status,'BLOCKED_EXTERNAL_EXPERT_REVIEW_EVIDENCE');
  assert.equal(payload.data.protocol.status,'DRAFT_EXTERNAL_REVIEW');
  assert.equal(payload.data.protocol.minimum_distinct_reviewers,2);
  assert.equal(payload.data.counts.criteria,4);
  assert.equal(payload.data.counts.verified_experts,0);
  assert.equal(payload.data.counts.targets,0);
  assert.equal(payload.data.counts.dual_approved_targets,0);
  assert.equal(payload.data.controls.automatic_approval,false);
  assert.equal(payload.data.claims.professional_review_complete,false);
  assert.equal(payload.data.claims.market_score_80_confirmed,false);
});

test('student cannot inspect math expert governance readiness',async()=>{
  const token=createSessionToken({userId:'11111111-1111-4111-8111-111111111111',studentId:'22222222-2222-4222-8222-222222222222'},secret);
  const response=await fetch(`${baseUrl}/api/v1/admin/math-expert-review/readiness`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(response.status,403);
});
