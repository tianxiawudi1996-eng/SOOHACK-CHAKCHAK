import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationReviewDays,evaluateFormulaApplication} from '../../../developer/src/learning/formula-application.mjs';

const item={answerSchema:{accepted_values:['30'],accepted_units:['cm²','㎠']},misconceptionRules:[{values:['60'],code:'MISSED_HALF'}]};

test('application evaluator requires both value and unit without exposing an answer',()=>{
  assert.deepEqual(evaluateFormulaApplication(item,{value:'30',unit:'cm2'}),{outcome:'CORRECT',misconception_code:null});
  assert.equal(evaluateFormulaApplication(item,{value:'30',unit:'cm'}).misconception_code,'UNIT_MISMATCH');
  assert.equal(evaluateFormulaApplication(item,{value:'60',unit:'cm²'}).misconception_code,'MISSED_HALF');
});

test('application review interval requires three distinct items for mastery',()=>{
  assert.equal(applicationReviewDays({attemptedItems:2,score:1,mastered:false}),3);
  assert.equal(applicationReviewDays({attemptedItems:3,score:0.83,mastered:true}),14);
  assert.equal(applicationReviewDays({attemptedItems:3,score:0.3,mastered:false}),1);
});
