import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticatedRequestContext, createSessionToken, verifySessionToken} from '../../../developer/src/api/auth.mjs';

const secret = 'phase9-unit-test-secret-material-32-bytes-minimum';
const claims = {
  userId:'11111111-1111-4111-8111-111111111111',
  studentId:'22222222-2222-4222-8222-222222222222',
  issuedAt:1000,
  expiresAt:1300
};

test('signed session token verifies required claims', () => {
  const token = createSessionToken(claims, secret);
  assert.deepEqual(verifySessionToken(token, secret, {now:1100}), {
    userId:claims.userId,
    studentId:claims.studentId,
    role:'STUDENT'
  });
});

test('signed admin token omits student scope and rejects mixed admin claims',()=>{
  const adminClaims={userId:'33333333-3333-4333-8333-333333333333',role:'ADMIN',issuedAt:1000,expiresAt:1300};
  const token=createSessionToken(adminClaims,secret);
  assert.deepEqual(verifySessionToken(token,secret,{now:1100}),{userId:adminClaims.userId,role:'ADMIN'});
  const mixed=createSessionToken({...adminClaims,studentId:claims.studentId},secret);
  assert.throws(()=>verifySessionToken(mixed,secret,{now:1100}),/UNAUTHENTICATED/);
});

test('signed teacher and parent tokens are role scoped without student claims',()=>{
  for(const role of ['TEACHER','PARENT']){
    const roleClaims={userId:'33333333-3333-4333-8333-333333333333',role,issuedAt:1000,expiresAt:1300};
    const token=createSessionToken(roleClaims,secret);
    assert.deepEqual(verifySessionToken(token,secret,{now:1100}),{userId:roleClaims.userId,role});
    assert.throws(()=>verifySessionToken(createSessionToken({...roleClaims,studentId:claims.studentId},secret),secret,{now:1100}),/UNAUTHENTICATED/);
  }
});

test('signed session token rejects tampering and expiry', () => {
  const token = createSessionToken(claims, secret);
  assert.throws(() => verifySessionToken(`${token.slice(0,-1)}x`, secret, {now:1100}), /UNAUTHENTICATED/);
  assert.throws(() => verifySessionToken(token, secret, {now:1300}), /UNAUTHENTICATED/);
});

test('signed session token rejects invalid lifetime and oversized input', () => {
  const invalidLifetime = createSessionToken({...claims, issuedAt:1200, expiresAt:1199}, secret);
  assert.throws(() => verifySessionToken(invalidLifetime, secret, {now:1100}), /UNAUTHENTICATED/);
  assert.throws(() => verifySessionToken('x'.repeat(4097), secret, {now:1100}), /UNAUTHENTICATED/);
});

test('authorization scheme is exact, whitespace-safe, and case-insensitive', () => {
  const token = createSessionToken(claims, secret);
  assert.deepEqual(authenticatedRequestContext({headers:{authorization:`bearer ${token}`}}, {sessionSecret:secret, now:1100}), {
    userId:claims.userId, studentId:claims.studentId, role:'STUDENT'
  });
  assert.throws(() => authenticatedRequestContext({headers:{authorization:`Bearer ${token} extra`}}, {sessionSecret:secret, now:1100}), /UNAUTHENTICATED/);
});
