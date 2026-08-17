import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreResponse} from '../../../developer/src/api/scoring.mjs';

test('server scoring normalizes strings and object key order', () => {
  assert.equal(scoreResponse({correct:{unit:'fraction',value:'5/6'}}, {value:'5/6 ',unit:'fraction'}), 'CORRECT');
  assert.equal(scoreResponse({correct:{value:'5/6'}}, {value:'1/2'}), 'INCORRECT');
  assert.throws(() => scoreResponse({}, {value:'5/6'}), /UNSCORABLE_PROBLEM/);
});
