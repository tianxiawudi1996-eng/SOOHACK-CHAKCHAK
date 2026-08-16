import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITED_PRODUCTION_SAFETY_CONTROLS,
  createSyntheticAcceptedPhase57,
  evaluateLimitedProductionSafetyHandoff,
  hashLimitedProductionSafetySource,
  inspectLimitedProductionSafetyHandoffRegister
} from '../../../developer/src/agent/tutor-limited-production-safety-handoff.mjs';

const sourceBytes = fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_57_CONTROLLED_PRODUCTION_ROLLOUT_RESULT_REGISTER.json', import.meta.url));
const source = JSON.parse(sourceBytes);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const handoffSource = JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_58_LIMITED_PRODUCTION_SAFETY_HANDOFF_REGISTER.json', import.meta.url), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

function acceptedSourceAndHandoff() {
  const acceptedSource = createSyntheticAcceptedPhase57(source);
  const handoff = clone(handoffSource);
  const hash = hashLimitedProductionSafetySource(acceptedSource);
  handoff.source_results.register_sha256 = hash;
  return {acceptedSource, handoff, hash};
}

function verifyControls(handoff) {
  handoff.control_records = LIMITED_PRODUCTION_SAFETY_CONTROLS.map((controlId, index) => ({
    control_id: controlId,
    status: 'VERIFIED',
    evidence_reference: `SYNTHETIC-CONTROL-${index + 1}`,
    verified_at: '2026-08-13T10:10:00+09:00'
  }));
  return handoff;
}

function approveWindow(handoff) {
  handoff.execution_window = {
    status: 'APPROVED',
    window_reference: 'SYNTHETIC-WINDOW',
    starts_at: '2026-08-13T10:30:00+09:00',
    ends_at: '2026-08-13T10:45:00+09:00',
    approval_inferred: false
  };
  return handoff;
}

test('current Phase 58 remains blocked without accepted Phase 57 evidence', () => {
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:source, handoffRegister:handoffSource, expectedSourceHash:sourceHash});
  assert.equal(result.status, 'BLOCKED_EXTERNAL');
  assert.equal(result.controls_verified, 0);
  assert.equal(result.execution_authorized, false);
});

test('accepted Phase 57 with pending controls remains incomplete', () => {
  const {acceptedSource, handoff, hash} = acceptedSourceAndHandoff();
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource, handoffRegister:handoff, expectedSourceHash:hash});
  assert.equal(result.status, 'LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE');
  assert.ok(result.blockers.includes('SAFETY_CONTROLS_INCOMPLETE'));
});

test('missing and duplicate safety controls fail integrity', () => {
  const {handoff, hash} = acceptedSourceAndHandoff();
  handoff.control_records.pop();
  handoff.control_records[1].control_id = handoff.control_records[0].control_id;
  const failures = inspectLimitedProductionSafetyHandoffRegister(handoff, {expectedSourceHash:hash});
  assert.ok(failures.includes('CONTROL_COUNT_MISMATCH'));
  assert.ok(failures.includes('DUPLICATE_CONTROL_ID'));
});

test('verified controls without an approved window remain incomplete', () => {
  const {acceptedSource, handoff, hash} = acceptedSourceAndHandoff();
  verifyControls(handoff);
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource, handoffRegister:handoff, expectedSourceHash:hash});
  assert.equal(result.status, 'LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE');
  assert.equal(result.controls_verified, 16);
});

test('verified controls and window become ready for one product-owner review', () => {
  const {acceptedSource, handoff, hash} = acceptedSourceAndHandoff();
  approveWindow(verifyControls(handoff));
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource, handoffRegister:handoff, expectedSourceHash:hash});
  assert.equal(result.status, 'READY_FOR_LIMITED_PRODUCTION_SAFETY_REVIEW');
  assert.equal(result.recommendation, 'REQUEST_PRODUCT_OWNER_REVIEW');
});

test('single approval accepts only a non-executing observation handoff', () => {
  const {acceptedSource, handoff, hash} = acceptedSourceAndHandoff();
  approveWindow(verifyControls(handoff));
  handoff.review = {status:'APPROVED', review_reference:'SYNTHETIC-PO-APPROVAL', reviewed_at:'2026-08-13T10:20:00+09:00', approval_inferred:false};
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource, handoffRegister:handoff, expectedSourceHash:hash});
  assert.equal(result.status, 'LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED');
  assert.equal(result.execution_authorized, false);
  assert.equal(result.student_traffic_allowed, false);
  assert.equal(result.public_traffic_allowed, false);
});

test('one rejected safety control rejects the handoff and keeps flag off', () => {
  const {acceptedSource, handoff, hash} = acceptedSourceAndHandoff();
  approveWindow(verifyControls(handoff));
  handoff.control_records[5] = {...handoff.control_records[5], status:'REJECTED', evidence_reference:'SYNTHETIC-RAW-STORAGE-FAIL'};
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource, handoffRegister:handoff, expectedSourceHash:hash});
  assert.equal(result.status, 'LIMITED_PRODUCTION_SAFETY_HANDOFF_REJECTED');
  assert.equal(result.recommendation, 'KEEP_FEATURE_FLAG_OFF');
});

test('raw content secret source drift and false execution claims are rejected', () => {
  const handoff = clone(handoffSource);
  handoff.response_text = 'raw';
  handoff.secret_reference = 'sk-exampleSecretMaterial123456';
  handoff.execution_performed = true;
  const failures = inspectLimitedProductionSafetyHandoffRegister(handoff, {expectedSourceHash:'a'.repeat(64)});
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:response_text'));
  assert.ok(failures.includes('SECRET_MATERIAL_DETECTED'));
  assert.ok(failures.includes('SOURCE_HASH_MISMATCH'));
  assert.ok(failures.includes('EXECUTION_PERFORMED_MUST_REMAIN_FALSE'));
});
