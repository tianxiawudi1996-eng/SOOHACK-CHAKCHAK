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

test('teacher may assign only through linked scope while parent cannot write',()=>{
  assert.equal(authorize({role:'TEACHER',permission:'academy:assign:linked',studentId:'s1',linkedStudentIds:['s1']}).allowed,true);
  assert.equal(authorize({role:'TEACHER',permission:'academy:assign:linked',studentId:'s2',linkedStudentIds:['s1']}).reason,'ACTIVE_LINK_REQUIRED');
  assert.equal(authorize({role:'PARENT',permission:'academy:assign:linked',studentId:'s1',linkedStudentIds:['s1']}).reason,'PERMISSION_DENIED');
});

test('academy owner receives organization management without bypassing linked student scope',()=>{
  assert.equal(authorize({role:'ACADEMY_OWNER',permission:'academy:manage:organization'}).allowed,true);
  assert.equal(authorize({role:'ACADEMY_OWNER',permission:'progress:read:linked',studentId:'s2',linkedStudentIds:['s1']}).reason,'ACTIVE_LINK_REQUIRED');
});
