import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken} from '../../developer/src/api/auth.mjs';

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4181';
const userId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const conceptId = '77777777-7777-4777-8777-777777777777';
const problemId = '44444444-4444-4444-8444-444444444444';
const sessionSecret = process.env.TEST_SESSION_HMAC_SECRET;
if (!sessionSecret) throw new Error('TEST_SESSION_HMAC_SECRET_REQUIRED');

const authorization = `Bearer ${createSessionToken({userId,studentId}, sessionSecret)}`;

async function api(path, {method='GET',body,key} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers:{
      authorization,
      ...(body === undefined ? {} : {'content-type':'application/json'}),
      ...(key ? {'idempotency-key':key} : {})
    },
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  return {response,payload};
}

const key = (scope) => `${scope}-${crypto.randomUUID()}`;

test('formula lesson runs five stages and persists misconception and mastery in PostgreSQL', async () => {
  for (const locale of ['ko','zh-CN','ja','en','es','fr','it','ru']) {
    const lesson = await api(`/api/v1/concepts/${conceptId}/lesson?locale=${encodeURIComponent(locale)}`);
    assert.equal(lesson.response.status, 200);
    assert.equal(lesson.payload.meta.locale, locale);
    assert.equal(lesson.payload.data.lesson.steps.length, 5);
    assert.equal(lesson.payload.data.formula.semantic_key, 'formula.fraction.add.unlike');
    assert.equal(JSON.stringify(lesson.payload).includes('expected_response'), false);
  }

  const diagnostic = await api('/api/v1/diagnostics', {method:'POST',key:key('formula-diag'),body:{locale:'ko'}});
  assert.equal(diagnostic.response.status, 201);
  const diagnosticId = diagnostic.payload.data.id;
  const diagnosticAnswer = await api(`/api/v1/diagnostics/${diagnosticId}/responses`, {
    method:'POST',key:key('formula-diag-answer'),body:{problem_item_id:problemId,response_value:{value:'1/2'}}
  });
  assert.equal(diagnosticAnswer.payload.data.outcome, 'INCORRECT');
  const diagnosticComplete = await api(`/api/v1/diagnostics/${diagnosticId}/complete`, {method:'POST',key:key('formula-diag-complete'),body:{}});
  const learning = await api('/api/v1/learning-sessions', {
    method:'POST',key:key('formula-learning'),body:{learning_path_item_id:diagnosticComplete.payload.data.learning_path_item_id,locale:'ko'}
  });
  assert.equal(learning.response.status, 201);

  const formula = await api(`/api/v1/learning-sessions/${learning.payload.data.id}/formula-lessons`, {
    method:'POST',key:key('formula-start'),body:{}
  });
  assert.equal(formula.response.status, 201);
  assert.equal(formula.payload.data.current_step.stage, 'UNDERSTAND');
  const formulaSessionId = formula.payload.data.id;

  const duplicateFormula = await api(`/api/v1/learning-sessions/${learning.payload.data.id}/formula-lessons`, {
    method:'POST',key:key('formula-start-duplicate'),body:{}
  });
  assert.equal(duplicateFormula.response.status, 409);
  assert.equal(duplicateFormula.payload.error.code, 'ACTIVE_FORMULA_LESSON_EXISTS');

  const submit = (responseValue, hintLevel=0) => api(`/api/v1/formula-lessons/${formulaSessionId}/responses`, {
    method:'POST',key:key('formula-response'),body:{response_value:responseValue,hint_level:hintLevel,duration_ms:500}
  });

  assert.equal((await submit({value:'same_size_pieces'})).payload.data.outcome, 'CORRECT');
  assert.equal((await submit({value:'common_denominator_6'})).payload.data.outcome, 'CORRECT');

  const earlyComplete = await api(`/api/v1/formula-lessons/${formulaSessionId}/complete`, {method:'POST',key:key('early-complete'),body:{}});
  assert.equal(earlyComplete.response.status, 409);
  assert.equal(earlyComplete.payload.error.code, 'FORMULA_LESSON_MASTERY_REQUIRED');

  const misconception = await submit({value:'2/5'}, 1);
  assert.equal(misconception.payload.data.outcome, 'INCORRECT');
  assert.equal(misconception.payload.data.misconception_code, 'ADD_DENOMINATORS');
  assert.ok(misconception.payload.data.hint);

  const tutorKey=key('formula-tutor');
  const tutor=await api(`/api/v1/formula-lessons/${formulaSessionId}/responses/${misconception.payload.data.id}/tutor-feedback`, {
    method:'POST',key:tutorKey,body:{}
  });
  assert.equal(tutor.response.status,201);
  assert.equal(tutor.payload.data.mode,'RULE_FALLBACK');
  assert.equal(tutor.payload.data.next_action,'RETRY');
  assert.ok(tutor.payload.data.chakchaki);
  assert.ok(tutor.payload.data.gongsickyi);
  assert.equal(JSON.stringify(tutor.payload).includes('response_value'),false);
  assert.equal(JSON.stringify(tutor.payload).includes('expected_response'),false);

  const tutorReplay=await api(`/api/v1/formula-lessons/${formulaSessionId}/responses/${misconception.payload.data.id}/tutor-feedback`, {
    method:'POST',key:tutorKey,body:{}
  });
  assert.equal(tutorReplay.response.status,200);
  assert.equal(tutorReplay.payload.meta.replayed,true);

  assert.equal((await submit({value:'5/6'})).payload.data.outcome, 'CORRECT');
  assert.equal((await submit({numerator_rule:'cross_products_sum',denominator_rule:'product'})).payload.data.outcome, 'CORRECT');
  assert.equal((await submit({numerator:7,denominator:10})).payload.data.outcome, 'CORRECT');

  const beforeComplete = await api(`/api/v1/formula-lessons/${formulaSessionId}`);
  assert.equal(beforeComplete.payload.data.current_step, null);
  assert.equal(beforeComplete.payload.data.response_summary.completed_steps, 5);
  assert.deepEqual(beforeComplete.payload.data.response_summary.misconceptions, ['ADD_DENOMINATORS']);

  const completed = await api(`/api/v1/formula-lessons/${formulaSessionId}/complete`, {method:'POST',key:key('formula-complete'),body:{}});
  assert.equal(completed.response.status, 200);
  assert.equal(completed.payload.data.status, 'COMPLETED');
  assert.equal(completed.payload.data.mastery_score, 1);

  const recommendation = await api(`/api/v1/students/${studentId}/adaptive-recommendation`);
  assert.equal(recommendation.response.status, 200);
  assert.equal(recommendation.payload.data.mastery_score, 1);
  assert.ok(recommendation.payload.data.evidence_count >= 1);
  assert.equal(recommendation.payload.data.scheduled_review_days, 1);
  assert.ok(recommendation.payload.data.scheduled_review_at);

  const learningComplete = await api(`/api/v1/learning-sessions/${learning.payload.data.id}/complete`, {method:'POST',key:key('learning-complete'),body:{}});
  assert.equal(learningComplete.response.status, 200);
  assert.equal(learningComplete.payload.data.status, 'COMPLETED');
});
