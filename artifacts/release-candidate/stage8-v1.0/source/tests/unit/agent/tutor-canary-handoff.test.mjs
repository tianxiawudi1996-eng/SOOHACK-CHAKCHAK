import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTutorCanaryDryRunPlan,
  evaluateTutorCanaryHandoff,
  inspectTutorCanaryHandoffRegister,
  TUTOR_CANARY_LOCALES
} from '../../../developer/src/agent/tutor-canary-handoff.mjs';

const readinessBytes=fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json',import.meta.url));
const readiness=JSON.parse(readinessBytes);
const readinessHash=crypto.createHash('sha256').update(readinessBytes).digest('hex');
const canary=JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json',import.meta.url),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const verifiedReadiness=()=>{
  const value=clone(readiness);
  value.controls=value.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:40:00+09:00'}));
  value.authorization={status:'APPROVED',approval_reference:'PO-CANARY-APPROVAL',approved_at:'2026-08-10T16:45:00+09:00',approval_inferred:false};
  return value;
};
const approvedWindow=()=>{
  const value=clone(canary);
  value.execution_window={status:'APPROVED',window_reference:'CANARY-WINDOW-REF',starts_at:'2026-08-10T17:00:00+09:00',ends_at:'2026-08-10T17:15:00+09:00'};
  return value;
};

test('current canary handoff is blocked by Phase 50 external readiness and execution window',()=>{
  const result=evaluateTutorCanaryHandoff({readinessRegister:readiness,canaryRegister:canary,expectedReadinessHash:readinessHash});
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.deepEqual(result.blockers,['PHASE50_READINESS_BLOCKED','EXECUTION_WINDOW_PENDING']);
  assert.equal(result.execution_authorized,false);
  assert.equal(result.provider_live_tested,false);
});

test('verified Phase 50 readiness still waits for an approved execution window',()=>{
  const result=evaluateTutorCanaryHandoff({readinessRegister:verifiedReadiness(),canaryRegister:canary,expectedReadinessHash:readinessHash});
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.deepEqual(result.blockers,['EXECUTION_WINDOW_PENDING']);
});

test('synthetic complete references produce an eight-locale dry-run handoff without dispatch',()=>{
  const register=approvedWindow();
  const result=evaluateTutorCanaryHandoff({readinessRegister:verifiedReadiness(),canaryRegister:register,expectedReadinessHash:readinessHash});
  assert.equal(result.status,'READY_FOR_CANARY_HANDOFF');
  assert.equal(result.handoff_ready,true);
  assert.equal(result.execution_authorized,false);
  const plan=buildTutorCanaryDryRunPlan({readinessRegister:verifiedReadiness(),canaryRegister:register,expectedReadinessHash:readinessHash});
  assert.deepEqual(plan.slots.map((slot)=>slot.locale),TUTOR_CANARY_LOCALES);
  assert.equal(plan.dispatch_performed,false);
});

test('expanded budgets, parallelism, or retries are rejected',()=>{
  const register=clone(canary);
  register.plan.max_requests=9;
  register.plan.concurrency=2;
  register.plan.max_retries_per_request=1;
  const failures=inspectTutorCanaryHandoffRegister(register,{expectedReadinessHash:readinessHash});
  assert.ok(failures.includes('LIMIT_MISMATCH:max_requests'));
  assert.ok(failures.includes('LIMIT_MISMATCH:concurrency'));
  assert.ok(failures.includes('LIMIT_MISMATCH:max_retries_per_request'));
});

test('secret material and raw response content fields are rejected',()=>{
  const register=clone(canary);
  register.secret_reference='sk-exampleSecretMaterial123456';
  register.response_text='unsafe raw response';
  const failures=inspectTutorCanaryHandoffRegister(register,{expectedReadinessHash:readinessHash});
  assert.ok(failures.includes('SECRET_MATERIAL_DETECTED'));
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:response_text'));
});

test('source readiness hash drift is rejected before handoff',()=>{
  const failures=inspectTutorCanaryHandoffRegister(canary,{expectedReadinessHash:'a'.repeat(64)});
  assert.ok(failures.includes('SOURCE_HASH_MISMATCH'));
});
