import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXECUTION_READINESS_CONTROLS,evaluateExecutionReadiness,executionReadinessBoundary,
  mapExecutionReadinessReview,missingExternalControls
} from '../../../developer/src/privacy/execution-readiness.mjs';

const localReady={
  latest_package:true,package_not_expired:true,no_active_legal_hold:true,
  recovery_checkpoint_present:true,dual_approval_present:true,manifest_hash_bound:true
};

test('execution readiness exposes six external controls without invented evidence',()=>{
  assert.equal(EXECUTION_READINESS_CONTROLS.length,6);
  const controls=missingExternalControls();
  assert.deepEqual(controls.map(({control_key})=>control_key),EXECUTION_READINESS_CONTROLS);
  assert.equal(controls.every(({status,evidence_reference})=>status==='MISSING_EXTERNAL'&&evidence_reference===null),true);
});

test('legal hold, expiry, stale revision, or absent checkpoint blocks local readiness',()=>{
  const result=evaluateExecutionReadiness({...localReady,latest_package:false,package_not_expired:false,no_active_legal_hold:false,recovery_checkpoint_present:false});
  assert.equal(result.status,'BLOCKED_LOCAL_PREREQUISITE');
  assert.deepEqual(result.local_blockers,['latest_package','package_not_expired','no_active_legal_hold','recovery_checkpoint_present']);
  assert.equal(result.execution_authorized,false);
});

test('passing every local check remains blocked until real external evidence exists',()=>{
  const result=evaluateExecutionReadiness(localReady);
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.equal(result.external_controls.length,6);
  assert.equal(result.kill_switch_engaged,true);
  assert.equal(result.execution_authorized,false);
});

test('readiness projection removes evaluator identity and keeps every execution path disabled',()=>{
  const mapped=mapExecutionReadinessReview({
    id:'review-1',package_manifest_id:'manifest-1',revision:1,predecessor_review_id:null,
    evaluated_by_user_id:'security-user',status:'BLOCKED_EXTERNAL',package_manifest_sha256:'a'.repeat(64),
    local_checks:localReady,local_blockers:[],kill_switch_engaged:true,execution_authorized:false,
    evaluated_at:'2026-08-07T12:00:00Z'
  },{controls:missingExternalControls()});
  assert.equal(JSON.stringify(mapped).includes('security-user'),false);
  const boundary=executionReadinessBoundary();
  assert.equal(boundary.external_evidence_write_enabled,false);
  assert.equal(boundary.kill_switch_disengage_enabled,false);
  assert.equal(boundary.execution_authorization_enabled,false);
  assert.equal(boundary.destructive_executor_enabled,false);
});
