import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4181';
const userId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const problem1 = '44444444-4444-4444-8444-444444444444';
const problem2 = '55555555-5555-4555-8555-555555555555';
const problem3 = '66666666-6666-4666-8666-666666666666';

const actorHeaders = {
  'x-user-id': userId,
  'x-student-id': studentId,
  'x-role': 'STUDENT'
};

async function api(path, {method = 'GET', body, key, headers = {}} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...actorHeaders,
      ...headers,
      ...(body === undefined ? {} : {'content-type': 'application/json'}),
      ...(key ? {'idempotency-key': key} : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  return {response, payload};
}

test('diagnostic to learning progress core journey persists through PostgreSQL', async () => {
  const health = await api('/healthz', {headers:{'x-user-id':'','x-student-id':'','x-role':''}});
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.data.database.ready, true);
  assert.match(health.response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');

  const locales = await api('/api/v1/locales', {headers:{'x-user-id':'','x-student-id':'','x-role':''}});
  assert.equal(locales.payload.data.locales.length, 8);

  const diagnosticKey = `diag-${crypto.randomUUID()}`;
  const diagnosticBody = {locale:'ko'};
  const created = await api('/api/v1/diagnostics', {method:'POST', key:diagnosticKey, body:diagnosticBody});
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.data.status, 'IN_PROGRESS');
  const diagnosticId = created.payload.data.id;

  const replay = await api('/api/v1/diagnostics', {method:'POST', key:diagnosticKey, body:diagnosticBody});
  assert.equal(replay.response.status, 200);
  assert.equal(replay.payload.data.id, diagnosticId);
  assert.equal(replay.payload.meta.replayed, true);

  const rejectedKeyReuse = await api('/api/v1/diagnostics', {method:'POST', key:diagnosticKey, body:{locale:'en'}});
  assert.equal(rejectedKeyReuse.response.status, 409);
  assert.equal(rejectedKeyReuse.payload.error.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');

  const diagnosticAnswers = [
    [problem1, {value:'5/6'}, 'CORRECT'],
    [problem2, {value:'1/2'}, 'INCORRECT']
  ];
  for (const [problem_item_id, response_value, outcome] of diagnosticAnswers) {
    const result = await api(`/api/v1/diagnostics/${diagnosticId}/responses`, {
      method:'POST',
      key:`diagnostic-response-${crypto.randomUUID()}`,
      body:{problem_item_id,response_value,duration_ms:1200}
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.payload.data.outcome, outcome);
  }

  const diagnosticCompleteKey = `diagnostic-complete-${crypto.randomUUID()}`;
  const completedDiagnostic = await api(`/api/v1/diagnostics/${diagnosticId}/complete`, {
    method:'POST', key:diagnosticCompleteKey, body:{}
  });
  assert.equal(completedDiagnostic.response.status, 200);
  assert.equal(completedDiagnostic.payload.data.accuracy, 0.5);
  const pathItemId = completedDiagnostic.payload.data.learning_path_item_id;
  const completedDiagnosticReplay = await api(`/api/v1/diagnostics/${diagnosticId}/complete`, {
    method:'POST', key:diagnosticCompleteKey, body:{}
  });
  assert.equal(completedDiagnosticReplay.response.status, 200);
  assert.equal(completedDiagnosticReplay.payload.data.learning_path_item_id, pathItemId);
  assert.equal(completedDiagnosticReplay.payload.meta.replayed, true);

  const learning = await api('/api/v1/learning-sessions', {
    method:'POST', key:`learning-${crypto.randomUUID()}`, body:{learning_path_item_id:pathItemId,locale:'ko'}
  });
  assert.equal(learning.response.status, 201);
  const sessionId = learning.payload.data.id;

  const loadedSession = await api(`/api/v1/learning-sessions/${sessionId}`);
  assert.equal(loadedSession.response.status, 200);
  assert.equal(loadedSession.payload.data.status, 'IN_PROGRESS');

  const learningAnswers = [
    [problem1, {value:'5/6'}, 'CORRECT'],
    [problem2, {value:'1/2'}, 'INCORRECT'],
    [problem3, {value:'2/3'}, 'CORRECT']
  ];
  for (const [problem_item_id, response_value, outcome] of learningAnswers) {
    const result = await api(`/api/v1/learning-sessions/${sessionId}/answers`, {
      method:'POST',
      key:`learning-answer-${crypto.randomUUID()}`,
      body:{problem_item_id,response_value,hint_level:outcome === 'INCORRECT' ? 1 : 0,duration_ms:900}
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.payload.data.outcome, outcome);
  }

  const completedLearning = await api(`/api/v1/learning-sessions/${sessionId}/complete`, {
    method:'POST', key:`learning-complete-${crypto.randomUUID()}`, body:{}
  });
  assert.equal(completedLearning.response.status, 200);
  assert.equal(completedLearning.payload.data.status, 'COMPLETED');

  const progress = await api(`/api/v1/students/${studentId}/progress`);
  assert.equal(progress.response.status, 200);
  assert.ok(progress.payload.data.answered >= 3);
  assert.equal(progress.payload.data.accuracy, 2 / 3);
  assert.equal(progress.payload.data.dataSufficient, true);
  assert.ok(progress.payload.data.difficultTopics.includes('33333333-3333-4333-8333-333333333333'));
  assert.ok(progress.payload.data.learning_sessions.completed >= 1);

  const denied = await api(`/api/v1/students/99999999-9999-4999-8999-999999999999/progress`, {
    headers:{'x-student-id':'99999999-9999-4999-8999-999999999999'}
  });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.payload.error.code, 'FORBIDDEN');

  const invalidLocale = await api('/api/v1/diagnostics', {
    method:'POST', key:`invalid-locale-${crypto.randomUUID()}`, body:{locale:'xx'}
  });
  assert.equal(invalidLocale.response.status, 400);
  assert.equal(invalidLocale.payload.error.code, 'UNSUPPORTED_LOCALE');

  const missingIdempotency = await api('/api/v1/diagnostics', {method:'POST', body:{locale:'ko'}});
  assert.equal(missingIdempotency.response.status, 400);
  assert.equal(missingIdempotency.payload.error.code, 'IDEMPOTENCY_KEY_REQUIRED');
});
