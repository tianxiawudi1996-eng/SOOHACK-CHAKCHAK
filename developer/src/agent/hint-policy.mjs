const hints = Object.freeze({
  1: 'RESTATE_GOAL',
  2: 'SHOW_RELATED_CONCEPT',
  3: 'GUIDE_NEXT_OPERATION'
});

export function nextHint({currentLevel = 0, hasAttempted = false}) {
  if (!hasAttempted && currentLevel > 0) throw new Error('ATTEMPT_REQUIRED_FOR_DEEPER_HINT');
  const level = Math.min(3, currentLevel + 1);
  return {level, strategy: hints[level], revealAnswer: false};
}
