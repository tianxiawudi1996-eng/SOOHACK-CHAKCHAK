import {formatFraction, fractionsEqual} from '../math/rational.mjs';

export const FORMULA_STAGES = Object.freeze(['UNDERSTAND', 'CONNECT', 'REPEAT', 'RECALL', 'APPLY']);

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function responseText(response) {
  return normalizeText(typeof response === 'string' ? response : response?.value);
}

export function validateFormulaLesson(lesson) {
  if (!lesson || !Array.isArray(lesson.steps) || lesson.steps.length !== FORMULA_STAGES.length) {
    throw new Error('FORMULA_LESSON_REQUIRES_FIVE_STEPS');
  }
  const ordered = [...lesson.steps].sort((a, b) => a.sequence_no - b.sequence_no);
  ordered.forEach((step, index) => {
    if (step.sequence_no !== index + 1 || step.stage !== FORMULA_STAGES[index]) {
      throw new Error('FORMULA_LESSON_STAGE_ORDER_INVALID');
    }
    if (!step.expected_response?.type) throw new Error('FORMULA_LESSON_EXPECTED_RESPONSE_REQUIRED');
  });
  return true;
}

export function detectMisconception(step, response) {
  for (const rule of step.scoring_rule?.misconceptions ?? []) {
    if (rule.type === 'fraction' && fractionsEqual(response, rule.value)) return rule.code;
    if (rule.type === 'choice' && responseText(response) === normalizeText(rule.value)) return rule.code;
  }
  return null;
}

export function evaluateFormulaResponse(step, response, {hintLevel = 0} = {}) {
  if (!Number.isInteger(hintLevel) || hintLevel < 0 || hintLevel > 3) throw new Error('INVALID_HINT_LEVEL');
  const expected = step.expected_response;
  let correct = false;
  if (expected.type === 'fraction') {
    correct = fractionsEqual(response, {numerator: expected.numerator, denominator: expected.denominator});
  } else if (expected.type === 'choice') {
    correct = responseText(response) === normalizeText(expected.value);
  } else if (expected.type === 'formula_terms') {
    correct = expected.fields.every((field) => normalizeText(response?.[field.name]) === normalizeText(field.value));
  } else {
    throw new Error('UNSUPPORTED_FORMULA_RESPONSE_TYPE');
  }

  const misconceptionCode = correct ? null : detectMisconception(step, response);
  const masteryCredit = correct ? Math.max(0.4, 1 - hintLevel * 0.2) : 0;
  return {
    outcome: correct ? 'CORRECT' : 'INCORRECT',
    misconception_code: misconceptionCode,
    mastery_credit: masteryCredit,
    normalized_response: expected.type === 'fraction' && correct ? formatFraction(response) : null
  };
}

export function calculateFormulaMastery(responses, stepCount = FORMULA_STAGES.length) {
  const bestByStep = new Map();
  for (const response of responses) {
    const credit = response.outcome === 'CORRECT'
      ? Math.max(0.4, 1 - Number(response.hint_level ?? 0) * 0.2)
      : 0;
    bestByStep.set(response.lesson_step_id, Math.max(bestByStep.get(response.lesson_step_id) ?? 0, credit));
  }
  const score = [...bestByStep.values()].reduce((sum, value) => sum + value, 0) / stepCount;
  return Math.round(score * 1000) / 1000;
}

export function canCompleteFormulaLesson({responses, masteryThreshold = 0.8, stepCount = FORMULA_STAGES.length}) {
  const correctSteps = new Set(responses.filter((item) => item.outcome === 'CORRECT').map((item) => item.lesson_step_id));
  const mastery = calculateFormulaMastery(responses, stepCount);
  return {allowed: correctSteps.size === stepCount && mastery >= masteryThreshold, mastery};
}
