import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMULA_STAGES,
  calculateFormulaMastery,
  canCompleteFormulaLesson,
  evaluateFormulaResponse,
  validateFormulaLesson
} from '../../../developer/src/learning/formula-learning.mjs';

const steps = FORMULA_STAGES.map((stage, index) => ({
  id: `step-${index + 1}`,
  sequence_no: index + 1,
  stage,
  expected_response: index === 2
    ? {type:'fraction',numerator:5,denominator:6}
    : {type:'choice',value:`answer-${index + 1}`},
  scoring_rule: index === 2
    ? {misconceptions:[{type:'fraction',value:'2/5',code:'ADD_DENOMINATORS'}]}
    : {}
}));

test('lesson requires the five pedagogical stages in order', () => {
  assert.equal(validateFormulaLesson({steps}), true);
  assert.throws(() => validateFormulaLesson({steps:steps.slice(1)}), /FIVE_STEPS/);
});

test('fraction response detects the add-denominators misconception', () => {
  const wrong = evaluateFormulaResponse(steps[2], {value:'2/5'});
  assert.equal(wrong.outcome, 'INCORRECT');
  assert.equal(wrong.misconception_code, 'ADD_DENOMINATORS');
  const correct = evaluateFormulaResponse(steps[2], {numerator:10,denominator:12});
  assert.equal(correct.outcome, 'CORRECT');
  assert.equal(correct.normalized_response, '5/6');
});

test('mastery requires every stage and discounts hints', () => {
  const responses = steps.map((step) => ({lesson_step_id:step.id,outcome:'CORRECT',hint_level:0}));
  assert.equal(calculateFormulaMastery(responses), 1);
  assert.deepEqual(canCompleteFormulaLesson({responses}), {allowed:true,mastery:1});
  responses[4].hint_level = 3;
  assert.deepEqual(canCompleteFormulaLesson({responses}), {allowed:true,mastery:0.88});
  assert.equal(canCompleteFormulaLesson({responses:responses.slice(0,4)}).allowed, false);
  const heavilyHinted = responses.map((response) => ({...response,hint_level:3}));
  assert.deepEqual(canCompleteFormulaLesson({responses:heavilyHinted}), {allowed:false,mastery:0.4});
});
