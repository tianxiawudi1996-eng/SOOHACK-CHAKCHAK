import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTutorStagingReadiness,
  inspectStagingReadinessRegister,
  STAGING_READINESS_CONTROL_IDS
} from '../../../developer/src/agent/tutor-staging-readiness.mjs';

const source=JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json',import.meta.url),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));

test('current staging register is truthfully blocked with ten external controls pending',()=>{
  const result=evaluateTutorStagingReadiness(source);
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.equal(result.verified_controls,0);
  assert.equal(result.required_controls,10);
  assert.deepEqual(result.pending_controls,STAGING_READINESS_CONTROL_IDS);
  assert.equal(result.execution_authorized,false);
});

test('verified evidence without explicit authorization remains blocked',()=>{
  const register=clone(source);
  register.controls=register.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  const result=evaluateTutorStagingReadiness(register);
  assert.equal(result.verified_controls,10);
  assert.equal(result.authorization_valid,false);
  assert.equal(result.ready_for_canary,false);
});

test('complete synthetic references and authorization reach canary readiness without authorizing execution',()=>{
  const register=clone(source);
  register.controls=register.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  register.authorization={status:'APPROVED',approval_reference:'PO-APPROVAL-REF',approved_at:'2026-08-10T16:20:00+09:00',approval_inferred:false};
  const result=evaluateTutorStagingReadiness(register);
  assert.equal(result.status,'READY_FOR_CONTROLLED_STAGING_CANARY');
  assert.equal(result.ready_for_canary,true);
  assert.equal(result.execution_authorized,false);
});

test('duplicate or missing controls fail register integrity',()=>{
  const register=clone(source);
  register.controls[1].id=register.controls[0].id;
  const failures=inspectStagingReadinessRegister(register);
  assert.ok(failures.includes('DUPLICATE_CONTROL_ID'));
  assert.ok(failures.includes('MISSING_CONTROL:SECRET_MANAGER_BINDING'));
});

test('secret-like evidence is rejected even when every control is marked verified',()=>{
  const register=clone(source);
  register.controls=register.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  register.controls[1].evidence_reference='sk-exampleSecretMaterial123456';
  assert.ok(inspectStagingReadinessRegister(register).includes('SECRET_MATERIAL_DETECTED'));
});

test('unverified controls cannot carry fabricated evidence or timestamps',()=>{
  const register=clone(source);
  register.controls[0].evidence_reference='UNVERIFIED-REF';
  register.controls[0].verified_at='2026-08-10T16:10:00+09:00';
  assert.ok(inspectStagingReadinessRegister(register).includes('UNVERIFIED_EVIDENCE_MUST_BE_NULL:STAGING_PROJECT_SEPARATION'));
});
