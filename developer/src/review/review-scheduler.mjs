const intervals = [1, 3, 7, 14, 30];

export function scheduleNextReview({outcome, currentIntervalDays = 1, attemptedAt}) {
  const base = new Date(attemptedAt);
  if (Number.isNaN(base.valueOf())) throw new Error('INVALID_ATTEMPT_TIME');
  let intervalDays;
  if (outcome === 'MISSED') intervalDays = 1;
  else if (outcome === 'PARTIAL') intervalDays = Math.max(1, currentIntervalDays);
  else if (outcome === 'RECALLED') intervalDays = intervals.find((days) => days > currentIntervalDays) ?? 30;
  else throw new Error('INVALID_REVIEW_OUTCOME');
  const nextDueAt = new Date(base.valueOf() + intervalDays * 86400000).toISOString();
  return {intervalDays, nextDueAt};
}
