import test from 'node:test';
import assert from 'node:assert/strict';
import {gateAiPetBehavior} from '../../../developer/src/pet/behavior-gate.mjs';

test('AI pet behavior stays disabled without explicit manual approval', () => {
  assert.deepEqual(gateAiPetBehavior({automatedQaStatus:'PASS',manualDecision:null,featureFlag:true}), {enabled:false,gateStatus:'BLOCKED',reason:'MANUAL_APPROVAL_REQUIRED'});
  assert.equal(gateAiPetBehavior({automatedQaStatus:'PASS',manualDecision:'APPROVE',featureFlag:false}).enabled, false);
  assert.equal(gateAiPetBehavior({automatedQaStatus:'PASS',manualDecision:'APPROVE',featureFlag:true}).enabled, true);
});
