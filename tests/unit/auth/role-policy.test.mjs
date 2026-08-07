import test from 'node:test';
import assert from 'node:assert/strict';
import {authorize} from '../../../developer/src/auth/role-policy.mjs';

test('student access is limited to owned records', () => {
  assert.equal(authorize({role:'STUDENT',permission:'progress:read:self',actorUserId:'u1',ownerUserId:'u1'}).allowed, true);
  assert.equal(authorize({role:'STUDENT',permission:'progress:read:self',actorUserId:'u1',ownerUserId:'u2'}).reason, 'OWNERSHIP_REQUIRED');
  assert.equal(authorize({role:'STUDENT',permission:'privacy:request:self',actorUserId:'u1',ownerUserId:'u1'}).allowed, true);
});

test('parent report requires active link and consent', () => {
  const base = {role:'PARENT',permission:'report:read:linked',studentId:'s1',linkedStudentIds:['s1']};
  assert.equal(authorize({...base,consentActive:false}).reason, 'CONSENT_REQUIRED');
  assert.equal(authorize({...base,consentActive:true}).allowed, true);
});

test('privacy operations permission is exclusive to admin',()=>{
  assert.equal(authorize({role:'ADMIN',permission:'privacy:operate'}).allowed,true);
  assert.equal(authorize({role:'STUDENT',permission:'privacy:operate'}).reason,'PERMISSION_DENIED');
});
