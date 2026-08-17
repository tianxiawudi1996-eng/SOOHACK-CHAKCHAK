import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPrivacyOperationsItem,privacyOperationsBoundary,validateOperatorTransition} from '../../../developer/src/privacy/privacy-operations.mjs';

const evidence={evidenceReference:'LOCAL-EVIDENCE/identity-001',evidenceSha256:'a'.repeat(64)};

test('operator workflow requires identity evidence and decision reason',()=>{
  assert.equal(validateOperatorTransition({fromStatus:'RECEIVED',toStatus:'IDENTITY_VERIFIED',...evidence}).allowed,true);
  assert.equal(validateOperatorTransition({fromStatus:'RECEIVED',toStatus:'IDENTITY_VERIFIED'}).reason,'IDENTITY_EVIDENCE_REQUIRED');
  assert.equal(validateOperatorTransition({fromStatus:'IN_REVIEW',toStatus:'APPROVED'}).reason,'DECISION_REASON_REQUIRED');
  assert.equal(validateOperatorTransition({fromStatus:'IN_REVIEW',toStatus:'APPROVED',reasonCode:'REQUEST_VERIFIED'}).allowed,true);
});

test('operator workflow blocks completion while fulfilment executor is disabled',()=>{
  assert.equal(validateOperatorTransition({fromStatus:'APPROVED',toStatus:'COMPLETED',reasonCode:'DONE',...evidence}).reason,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
  assert.equal(privacyOperationsBoundary().destructive_fulfilment_enabled,false);
  assert.equal(privacyOperationsBoundary().production_access,'BLOCKED_EXTERNAL_IDENTITY_POLICY');
});

test('operator queue projection excludes requester and operator identifiers',()=>{
  const mapped=mapPrivacyOperationsItem({
    id:'request-1',requester_user_id:'user-1',subject_user_id:'user-1',student_profile_id:'student-1',operator_user_id:'operator-1',
    request_type:'ACCESS',status:'IN_REVIEW',locale:'ko',policy_version:'privacy-rights-v1',assigned_to_current_operator:true
  });
  const rendered=JSON.stringify(mapped);
  assert.equal(rendered.includes('user-1'),false);
  assert.equal(rendered.includes('student-1'),false);
  assert.equal(rendered.includes('operator-1'),false);
  assert.equal(mapped.assigned_to_current_operator,true);
});
