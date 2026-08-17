import test from 'node:test';
import assert from 'node:assert/strict';
import {nextHint} from '../../../developer/src/agent/hint-policy.mjs';

test('hints deepen to level three without revealing the answer', () => {
  assert.deepEqual(nextHint({currentLevel:0}), {level:1,strategy:'RESTATE_GOAL',revealAnswer:false});
  assert.equal(nextHint({currentLevel:2,hasAttempted:true}).level, 3);
  assert.equal(nextHint({currentLevel:3,hasAttempted:true}).level, 3);
  assert.throws(() => nextHint({currentLevel:1,hasAttempted:false}), /ATTEMPT_REQUIRED/);
});
