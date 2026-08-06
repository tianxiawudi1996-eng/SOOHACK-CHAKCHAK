import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStepResponse,createIdempotencyKey,stageProgress} from '../../../client/math-learning/model.mjs';

test('math learning UI maps all five stages to visible progress', () => {
  assert.equal(stageProgress('UNDERSTAND'), 1);
  assert.equal(stageProgress('APPLY'), 5);
  assert.equal(stageProgress('UNKNOWN'), 0);
});

test('math learning UI builds typed server responses', () => {
  assert.deepEqual(buildStepResponse('CONCEPT_CHOICE',{choice:'same_size_pieces'}), {value:'same_size_pieces'});
  assert.deepEqual(buildStepResponse('GUIDED_FRACTION',{numerator:'5',denominator:'6'}), {numerator:5,denominator:6});
  assert.deepEqual(buildStepResponse('FORMULA_RECALL',{numerator_rule:'cross_products_sum',denominator_rule:'product'}), {numerator_rule:'cross_products_sum',denominator_rule:'product'});
  assert.throws(() => buildStepResponse('APPLICATION_FRACTION',{numerator:'1',denominator:'0'}), /VALID_FRACTION/);
  assert.match(createIdempotencyKey('lesson','00000000-0000-4000-8000-000000000000'), /^lesson-/);
});
