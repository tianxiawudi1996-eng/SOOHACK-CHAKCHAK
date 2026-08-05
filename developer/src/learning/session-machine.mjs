export function createLearningSession({id, studentId, pathItemId, locale, createdAt = new Date().toISOString()}) {
  if (!id || !studentId || !pathItemId) throw new Error('LEARNING_SESSION_INPUT_REQUIRED');
  return {id, studentId, pathItemId, locale, status: 'CREATED', currentStep: 1, attempts: [], createdAt, startedAt: null, completedAt: null};
}

export function transitionLearningSession(session, event, at = new Date().toISOString()) {
  const transitions = {
    CREATED: {START: 'IN_PROGRESS', ABANDON: 'ABANDONED'},
    IN_PROGRESS: {COMPLETE: 'COMPLETED', ABANDON: 'ABANDONED'}
  };
  const next = transitions[session.status]?.[event];
  if (!next) throw new Error('INVALID_LEARNING_TRANSITION');
  return {
    ...session,
    status: next,
    startedAt: event === 'START' ? at : session.startedAt,
    completedAt: event === 'COMPLETE' ? at : session.completedAt
  };
}

export function recordLearningAttempt(session, attempt) {
  if (session.status !== 'IN_PROGRESS') throw new Error('LEARNING_SESSION_NOT_ACTIVE');
  if (!attempt.problemItemId || !['CORRECT', 'INCORRECT', 'SKIPPED'].includes(attempt.outcome)) throw new Error('INVALID_LEARNING_ATTEMPT');
  return {...session, attempts: [...session.attempts, {...attempt, sequenceNo: session.attempts.length + 1}]};
}

export function advanceLearningStep(session) {
  if (session.status !== 'IN_PROGRESS') throw new Error('LEARNING_SESSION_NOT_ACTIVE');
  return {...session, currentStep: session.currentStep + 1};
}
