export function feedbackFor({outcome, incorrectCount = 0}) {
  if (outcome === 'CORRECT') return {event: 'answer.correct', tone: 'SPECIFIC_PRAISE', nextAction: 'EXPLAIN_REASONING'};
  if (outcome === 'INCORRECT' && incorrectCount <= 1) return {event: 'answer.wrong.first', tone: 'CALM_RETRY', nextAction: 'OFFER_HINT'};
  if (outcome === 'INCORRECT') return {event: 'answer.wrong.repeated', tone: 'SUPPORTIVE_REFRAME', nextAction: 'CHANGE_REPRESENTATION'};
  if (outcome === 'SKIPPED') return {event: 'answer.skipped', tone: 'NEUTRAL', nextAction: 'OFFER_FOUNDATION'};
  throw new Error('UNKNOWN_OUTCOME');
}
