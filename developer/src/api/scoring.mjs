import {badRequest} from './errors.mjs';

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return typeof value === 'string' ? value.trim() : value;
}

export function scoreResponse(answerSchema, responseValue) {
  if (!answerSchema || !Object.hasOwn(answerSchema, 'correct')) {
    throw badRequest('UNSCORABLE_PROBLEM', 'error.problem_unscorable');
  }
  if (responseValue === undefined || responseValue === null || responseValue === '') {
    throw badRequest('RESPONSE_REQUIRED', 'error.response_required');
  }
  return JSON.stringify(stableValue(responseValue)) === JSON.stringify(stableValue(answerSchema.correct))
    ? 'CORRECT'
    : 'INCORRECT';
}
