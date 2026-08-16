import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken} from '../../developer/src/api/auth.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const userId='11111111-1111-4111-8111-111111111111';
const studentId='22222222-2222-4222-8222-222222222222';
const secret=process.env.TEST_SESSION_HMAC_SECRET;
if(!secret)throw new Error('TEST_SESSION_HMAC_SECRET_REQUIRED');
const authorization=`Bearer ${createSessionToken({userId,studentId},secret)}`;

test('academy readiness is evidence-gated, privacy-minimized, and track-specific',async()=>{
  const response=await fetch(`${baseUrl}/api/v1/students/${studentId}/academy-readiness?target=ADVANCED_REASONING`,{headers:{authorization}});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.data.requested_track,'ADVANCED_REASONING');
  assert.ok(['CONCEPT_RECOVERY','SCHOOL_EXAM','ADVANCED_REASONING','CONTEST_BRIDGE'].includes(payload.data.recommended_track));
  assert.equal(payload.data.privacy.raw_answers_included,false);
  assert.equal(payload.data.commercial_claim_boundary.score_improvement_claimed,false);
  assert.equal(JSON.stringify(payload).includes('expected_answer'),false);
  const mix=payload.data.weekly_plan.problem_mix;
  assert.equal(mix.concept+mix.standard+mix.advanced,100);
  const invalid=await fetch(`${baseUrl}/api/v1/students/${studentId}/academy-readiness?target=SUPER_ELITE`,{headers:{authorization}});
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error.code,'INVALID_ACADEMY_TRACK');
});

test('academy readiness rejects a different student scope',async()=>{
  const response=await fetch(`${baseUrl}/api/v1/students/99999999-9999-4999-8999-999999999999/academy-readiness`,{headers:{authorization}});
  assert.equal(response.status,403);
});
