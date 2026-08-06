import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken} from '../../developer/src/api/auth.mjs';

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4181';
const userId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const sessionSecret = process.env.TEST_SESSION_HMAC_SECRET;
if (!sessionSecret) throw new Error('TEST_SESSION_HMAC_SECRET_REQUIRED');
const authorization = `Bearer ${createSessionToken({userId,studentId}, sessionSecret)}`;

const problems = [
  {id:'44444444-4444-4444-8444-444444444444',correct:'5/6'},
  {id:'55555555-5555-4555-8555-555555555555',correct:'3/4'},
  {id:'66666666-6666-4666-8666-666666666666',correct:'2/3'}
];
const key = (scope) => `${scope}-${crypto.randomUUID()}`;

async function api(path, {method='GET',body,idempotencyKey} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers:{
      authorization,
      ...(body === undefined ? {} : {'content-type':'application/json'}),
      ...(idempotencyKey ? {'idempotency-key':idempotencyKey} : {})
    },
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  return {response,payload};
}

async function completeDiagnostic(correctCount) {
  const created = await api('/api/v1/diagnostics', {
    method:'POST',idempotencyKey:key('adaptive-create'),body:{locale:'ko'}
  });
  assert.equal(created.response.status, 201);
  const diagnosticId = created.payload.data.id;
  for (const [index,problem] of problems.entries()) {
    const value = index < correctCount ? problem.correct : '0/1';
    const answered = await api(`/api/v1/diagnostics/${diagnosticId}/responses`, {
      method:'POST',idempotencyKey:key('adaptive-answer'),
      body:{problem_item_id:problem.id,response_value:{value}}
    });
    assert.equal(answered.response.status, 201);
  }
  const completionKey = key('adaptive-complete');
  const completed = await api(`/api/v1/diagnostics/${diagnosticId}/complete`, {
    method:'POST',idempotencyKey:completionKey,body:{}
  });
  assert.equal(completed.response.status, 200);
  const replay = await api(`/api/v1/diagnostics/${diagnosticId}/complete`, {
    method:'POST',idempotencyKey:completionKey,body:{}
  });
  assert.equal(replay.response.status, 200);
  assert.deepEqual(replay.payload.data.recommendation, completed.payload.data.recommendation);
  return completed.payload.data;
}

test('diagnostic evidence selects and persists all adaptive routes in PostgreSQL', async () => {
  const remediate = await completeDiagnostic(0);
  assert.equal(remediate.recommendation.route, 'REMEDIATE');
  assert.equal(remediate.recommendation.starting_hint_level, 2);
  assert.equal(remediate.recommendation.target_difficulty, 1);
  const remediateLearning = await api('/api/v1/learning-sessions', {
    method:'POST',idempotencyKey:key('adaptive-learning'),
    body:{learning_path_item_id:remediate.learning_path_item_id,locale:'ko'}
  });
  const remediateFormula = await api(`/api/v1/learning-sessions/${remediateLearning.payload.data.id}/formula-lessons`, {
    method:'POST',idempotencyKey:key('adaptive-formula'),body:{}
  });
  assert.equal(remediateFormula.payload.data.adaptive_route, 'REMEDIATE');
  assert.equal(remediateFormula.payload.data.starting_hint_level, 2);
  assert.equal(remediateFormula.payload.data.target_difficulty, 1);
  const adaptiveHint = await api(`/api/v1/formula-lessons/${remediateFormula.payload.data.id}/responses`, {
    method:'POST',idempotencyKey:key('adaptive-hint'),body:{response_value:{value:'wrong_choice'}}
  });
  assert.equal(adaptiveHint.payload.data.outcome, 'INCORRECT');
  assert.equal(adaptiveHint.payload.data.hint_level, 2);
  assert.ok(adaptiveHint.payload.data.hint);

  const core = await completeDiagnostic(2);
  assert.equal(core.recommendation.route, 'CORE');
  assert.equal(core.recommendation.starting_hint_level, 1);
  assert.equal(core.recommendation.target_difficulty, 3);

  const extend = await completeDiagnostic(3);
  assert.equal(extend.recommendation.route, 'EXTEND');
  assert.equal(extend.recommendation.starting_hint_level, 0);
  assert.equal(extend.recommendation.target_difficulty, 5);

  const latest = await api(`/api/v1/students/${studentId}/adaptive-recommendation`);
  assert.equal(latest.response.status, 200);
  assert.equal(latest.payload.data.route, 'EXTEND');
  assert.equal(latest.payload.data.algorithm_version, 'adaptive-v1');
  assert.equal(JSON.stringify(latest.payload.data).includes('response_value'), false);

  const otherStudentId = '99999999-9999-4999-8999-999999999999';
  const denied = await fetch(`${baseUrl}/api/v1/students/${studentId}/adaptive-recommendation`, {
    headers:{authorization:`Bearer ${createSessionToken({userId,studentId:otherStudentId}, sessionSecret)}`}
  });
  assert.equal(denied.status, 403);
});
