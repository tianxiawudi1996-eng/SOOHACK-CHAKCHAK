import test from 'node:test';
import assert from 'node:assert/strict';
import {IdempotencyStore} from '../../../developer/src/resilience/idempotency.mjs';

test('same idempotency key replays once and rejects changed requests', () => {
  const store = new IdempotencyStore();
  const input = {actorId:'u1',scope:'diagnostic.complete',key:'k1',requestHash:'a'.repeat(64),now:100};
  let calls = 0;
  assert.equal(store.execute(input, () => ({id:++calls})).replayed, false);
  assert.deepEqual(store.execute(input, () => ({id:++calls})), {id:1,replayed:true});
  assert.equal(calls, 1);
  assert.throws(() => store.execute({...input,requestHash:'b'.repeat(64)}, () => ({id:2})), /DIFFERENT_REQUEST/);
});
