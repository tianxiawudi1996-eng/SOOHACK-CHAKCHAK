import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAdaptiveRoute} from '../../../developer/src/learning/adaptive-routing.mjs';

test('adaptive routing assigns remediate, core, and extend from diagnostic accuracy', () => {
  assert.deepEqual(selectAdaptiveRoute({answered:3,correct:0}), {
    route:'REMEDIATE',accuracy:0,confidence:1,rationale_code:'FOUNDATION_GAP',
    starting_hint_level:2,target_difficulty:1,review_after_days:1
  });
  assert.equal(selectAdaptiveRoute({answered:3,correct:2}).route, 'CORE');
  assert.equal(selectAdaptiveRoute({answered:3,correct:3}).route, 'EXTEND');
});

test('adaptive routing validates evidence counts and threshold boundaries', () => {
  assert.equal(selectAdaptiveRoute({answered:2,correct:1}).route, 'CORE');
  assert.equal(selectAdaptiveRoute({answered:5,correct:4}).route, 'EXTEND');
  assert.throws(() => selectAdaptiveRoute({answered:0,correct:0}), /ADAPTIVE_ANSWER_COUNT_REQUIRED/);
  assert.throws(() => selectAdaptiveRoute({answered:2,correct:3}), /ADAPTIVE_CORRECT_COUNT_INVALID/);
});
