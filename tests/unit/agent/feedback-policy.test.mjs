import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackFor} from '../../../developer/src/agent/feedback-policy.mjs';

test('feedback changes with outcome and repeated errors', () => {
  assert.equal(feedbackFor({outcome:'CORRECT'}).nextAction, 'EXPLAIN_REASONING');
  assert.equal(feedbackFor({outcome:'INCORRECT',incorrectCount:1}).event, 'answer.wrong.first');
  assert.equal(feedbackFor({outcome:'INCORRECT',incorrectCount:2}).nextAction, 'CHANGE_REPRESENTATION');
});
