import test from 'node:test';
import assert from 'node:assert/strict';
import {addFractions, fractionsEqual, normalizeFraction, parseFraction} from '../../../developer/src/math/rational.mjs';

test('fraction arithmetic is exact and normalized without floating point', () => {
  assert.deepEqual(addFractions('1/2', '1/3'), {numerator: 5, denominator: 6});
  assert.deepEqual(normalizeFraction(6, -8), {numerator: -3, denominator: 4});
  assert.deepEqual(parseFraction({numerator: 10, denominator: 15}), {numerator: 2, denominator: 3});
  assert.equal(fractionsEqual('2/4', '1/2'), true);
  assert.throws(() => parseFraction('1/0'), /ZERO_DENOMINATOR/);
});
