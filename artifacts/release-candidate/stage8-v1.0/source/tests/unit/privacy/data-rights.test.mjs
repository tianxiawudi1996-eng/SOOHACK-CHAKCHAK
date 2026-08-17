import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIVACY_REQUEST_TYPES,
  canRequesterCancel,
  canTransitionPrivacyRequest,
  isPrivacyRequestType,
  mapPrivacyRequest,
  privacyRequestBoundary
} from '../../../developer/src/privacy/data-rights.mjs';

test('data-right request types cover the supported self-service intents',()=>{
  assert.deepEqual(PRIVACY_REQUEST_TYPES,[
    'ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL'
  ]);
  assert.equal(isPrivacyRequestType('DELETION'),true);
  assert.equal(isPrivacyRequestType('DELETE_NOW'),false);
});

test('request state machine rejects unsafe shortcuts',()=>{
  assert.equal(canTransitionPrivacyRequest('RECEIVED','IDENTITY_VERIFIED'),true);
  assert.equal(canTransitionPrivacyRequest('RECEIVED','COMPLETED'),false);
  assert.equal(canTransitionPrivacyRequest('APPROVED','COMPLETED'),true);
  assert.equal(canTransitionPrivacyRequest('COMPLETED','RECEIVED'),false);
});

test('requester cancellation is limited to early workflow states',()=>{
  assert.equal(canRequesterCancel('RECEIVED'),true);
  assert.equal(canRequesterCancel('IDENTITY_VERIFIED'),true);
  assert.equal(canRequesterCancel('IN_REVIEW'),false);
  assert.equal(canRequesterCancel('COMPLETED'),false);
});

test('public request mapping removes internal user and student identifiers',()=>{
  const mapped=mapPrivacyRequest({
    id:'request-1',requester_user_id:'user-1',subject_user_id:'user-1',student_profile_id:'student-1',
    request_type:'ACCESS',status:'RECEIVED',locale:'ko',source_channel:'STUDENT_SELF_SERVICE',
    identity_assurance:'SESSION_AUTHENTICATED',policy_version:'privacy-rights-v1',submitted_at:'now',updated_at:'now'
  });
  assert.equal(mapped.id,'request-1');
  assert.equal(JSON.stringify(mapped).includes('user-1'),false);
  assert.equal(JSON.stringify(mapped).includes('student-1'),false);
  assert.equal(privacyRequestBoundary().direct_deletion_performed,false);
});
