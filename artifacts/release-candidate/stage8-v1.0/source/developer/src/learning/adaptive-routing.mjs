export const ADAPTIVE_ROUTES = Object.freeze(['REMEDIATE', 'CORE', 'EXTEND']);

const ROUTE_PROFILE = Object.freeze({
  REMEDIATE: {starting_hint_level: 2, target_difficulty: 1, review_after_days: 1},
  CORE: {starting_hint_level: 1, target_difficulty: 3, review_after_days: 3},
  EXTEND: {starting_hint_level: 0, target_difficulty: 5, review_after_days: 7}
});

export function selectAdaptiveRoute({answered, correct}) {
  if (!Number.isInteger(answered) || answered < 1) throw new Error('ADAPTIVE_ANSWER_COUNT_REQUIRED');
  if (!Number.isInteger(correct) || correct < 0 || correct > answered) throw new Error('ADAPTIVE_CORRECT_COUNT_INVALID');

  const accuracy = Math.round((correct / answered) * 1000) / 1000;
  const route = accuracy < 0.5 ? 'REMEDIATE' : accuracy < 0.8 ? 'CORE' : 'EXTEND';
  const confidence = Math.round(Math.min(1, answered / 3) * 1000) / 1000;
  const rationale_code = route === 'REMEDIATE'
    ? 'FOUNDATION_GAP'
    : route === 'CORE'
      ? 'CORE_PRACTICE_NEEDED'
      : 'READY_FOR_CHALLENGE';

  return {route, accuracy, confidence, rationale_code, ...ROUTE_PROFILE[route]};
}
