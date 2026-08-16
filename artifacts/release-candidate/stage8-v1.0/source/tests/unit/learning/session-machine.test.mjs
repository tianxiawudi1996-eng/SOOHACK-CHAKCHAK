import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLearningStep, createLearningSession, recordLearningAttempt, transitionLearningSession} from '../../../developer/src/learning/session-machine.mjs';

test('learning session follows valid transitions and sequences attempts', () => {
  let session = createLearningSession({id:'l1',studentId:'s1',pathItemId:'pi1',locale:'en'});
  session = transitionLearningSession(session, 'START', '2026-01-01T00:00:00Z');
  session = recordLearningAttempt(session, {problemItemId:'p1',outcome:'INCORRECT'});
  session = advanceLearningStep(session);
  assert.equal(session.attempts[0].sequenceNo, 1);
  assert.equal(session.currentStep, 2);
  session = transitionLearningSession(session, 'COMPLETE', '2026-01-01T00:05:00Z');
  assert.equal(session.status, 'COMPLETED');
  assert.throws(() => transitionLearningSession(session, 'START'), /INVALID/);
});
