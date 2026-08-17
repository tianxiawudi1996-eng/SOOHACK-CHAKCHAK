import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVAL_ROLES,fulfilmentControlBoundary,isApprovalRole,mapFulfilmentPlan} from '../../../developer/src/privacy/fulfilment-controls.mjs';

test('fulfilment controls require two distinct approval roles',()=>{
  assert.deepEqual(APPROVAL_ROLES,['PRIVACY_APPROVER','SECURITY_APPROVER']);
  assert.equal(isApprovalRole('PRIVACY_APPROVER'),true);
  assert.equal(isApprovalRole('OPERATOR'),false);
});

test('fulfilment plan projection contains aggregate impact without actor identifiers',()=>{
  const plan=mapFulfilmentPlan({
    id:'plan-1',privacy_request_id:'request-1',request_type:'DELETION',status:'IMPACT_ASSESSED',execution_mode:'DRY_RUN_ONLY',
    policy_version:'fulfilment-controls-v1',created_by_user_id:'operator-1',profile_rows:1,diagnostic_sessions:2,
    learning_sessions:3,review_items:4,formula_sessions:5,preserved_privacy_records:6,active_legal_hold:false,
    assessment_sha256:'a'.repeat(64)
  },{approvals:[{approval_role:'PRIVACY_APPROVER',decision:'APPROVE',reason_code:'SCOPE_VERIFIED'}]});
  assert.equal(plan.impact.learning_sessions,3);
  assert.equal(plan.approvals.length,1);
  assert.equal(JSON.stringify(plan).includes('operator-1'),false);
});

test('fulfilment boundary keeps every destructive path disabled',()=>{
  const boundary=fulfilmentControlBoundary();
  assert.equal(boundary.execution_mode,'DRY_RUN_ONLY');
  assert.equal(boundary.destructive_executor_enabled,false);
  assert.equal(boundary.completion_transition_enabled,false);
  assert.equal(boundary.dual_approval_required,true);
});
