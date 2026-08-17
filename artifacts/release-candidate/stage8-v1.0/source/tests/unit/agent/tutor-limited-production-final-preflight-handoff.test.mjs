import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_PREFLIGHT_CONTROLS,
  createSyntheticAcceptedPhase61,
  evaluateFinalPreflightHandoff,
  hashFinalPreflightSource,
  inspectFinalPreflightRegister
} from '../../../developer/src/agent/tutor-limited-production-final-preflight-handoff.mjs';

const sourceBytes = fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_61_LIMITED_PRODUCTION_EXPANSION_PLAN_REGISTER.json', import.meta.url));
const source = JSON.parse(sourceBytes);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const handoffSource = JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_62_LIMITED_PRODUCTION_FINAL_PREFLIGHT_HANDOFF_REGISTER.json', import.meta.url), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

function pair() {
  const acceptedSource = createSyntheticAcceptedPhase61(source);
  const handoff = clone(handoffSource);
  const hash = hashFinalPreflightSource(acceptedSource);
  handoff.source_plan.register_sha256 = hash;
  return { acceptedSource, handoff, hash };
}

function verify(handoff) {
  handoff.preflight_records = FINAL_PREFLIGHT_CONTROLS.map((id, index) => ({
    control_id: id,
    status: 'VERIFIED',
    evidence_reference: `SYNTHETIC-PREFLIGHT-${index + 1}`,
    verified_at: '2026-08-17T10:10:00+09:00'
  }));
  return handoff;
}

function assign(handoff) {
  handoff.operator_assignment = {
    status: 'VERIFIED',
    operator_reference: 'SYNTHETIC-OPERATOR-REF',
    authorized_channel_reference: 'SYNTHETIC-CHANNEL-REF',
    assigned_at: '2026-08-17T10:15:00+09:00',
    acknowledged_at: '2026-08-17T10:20:00+09:00',
    conflict_declaration: 'NO_CONFLICT',
    approval_inferred: false
  };
  return handoff;
}

test('current Phase 62 remains blocked without accepted Phase 61', () => {
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: source, handoffRegister: handoffSource, expectedSourceHash: sourceHash });
  assert.equal(result.status, 'BLOCKED_EXTERNAL');
  assert.equal(result.preflight_verified, 0);
});

test('accepted source with pending preflight remains incomplete', () => {
  const value = pair();
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  assert.equal(result.status, 'FINAL_PREFLIGHT_INCOMPLETE');
});

test('handoff preserves eight locale packets and sixty-four request ceiling', () => {
  const failures = inspectFinalPreflightRegister(handoffSource, { expectedSourceHash: sourceHash });
  assert.equal(failures.length, 0);
  assert.equal(handoffSource.handoff_packets.length, 8);
  assert.equal(handoffSource.handoff_packets.reduce((sum, item) => sum + item.maximum_requests, 0), 64);
});

test('missing duplicate or relaxed handoff boundaries fail integrity', () => {
  const value = pair();
  value.handoff.handoff_packets.pop();
  value.handoff.handoff_packets[1].locale = 'ko';
  value.handoff.limits.maximum_concurrency = 3;
  const failures = inspectFinalPreflightRegister(value.handoff, { expectedSourceHash: value.hash });
  assert.ok(failures.includes('HANDOFF_PACKET_COUNT_MISMATCH'));
  assert.ok(failures.includes('DUPLICATE_PACKET_LOCALE'));
  assert.ok(failures.includes('LIMIT_MISMATCH:maximum_concurrency'));
});

test('verified preflight and operator become ready for one-person review', () => {
  const value = pair();
  assign(verify(value.handoff));
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  assert.equal(result.status, 'READY_FOR_FINAL_HANDOFF_REVIEW');
});

test('single approval creates only a non-dispatching external decision packet', () => {
  const value = pair();
  assign(verify(value.handoff));
  value.handoff.final_review = { status: 'APPROVED', review_reference: 'SYNTHETIC-PO', reviewed_at: '2026-08-17T10:25:00+09:00', approval_inferred: false };
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  assert.equal(result.status, 'FINAL_PREFLIGHT_ACCEPTED_FOR_EXTERNAL_EXECUTION_DECISION');
  assert.equal(result.execution_authorized, false);
  assert.equal(result.dispatch_allowed, false);
});

test('one rejected control keeps feature flag off', () => {
  const value = pair();
  assign(verify(value.handoff));
  value.handoff.preflight_records[5] = { ...value.handoff.preflight_records[5], status: 'REJECTED', evidence_reference: 'SPEND-CAP-FAIL' };
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  assert.equal(result.status, 'FINAL_HANDOFF_REJECTED');
  assert.equal(result.recommendation, 'KEEP_FEATURE_FLAG_OFF');
});

test('raw secret source drift false execution and personal identity are rejected', () => {
  const value = pair();
  value.handoff.response_text = 'raw';
  value.handoff.secret_reference = 'sk-exampleSecretMaterial123456';
  value.handoff.preflight_executed = true;
  value.handoff.operator_name = 'Synthetic Name';
  const failures = inspectFinalPreflightRegister(value.handoff, { expectedSourceHash: 'a'.repeat(64) });
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:response_text'));
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:operator_name'));
  assert.ok(failures.includes('SECRET_MATERIAL_DETECTED'));
  assert.ok(failures.includes('SOURCE_HASH_MISMATCH'));
  assert.ok(failures.includes('PREFLIGHT_EXECUTED_MUST_REMAIN_FALSE'));
});
