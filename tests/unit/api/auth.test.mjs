import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken, verifySessionToken} from '../../../developer/src/api/auth.mjs';

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

test('signed session token rejects tampering and expiry', () => {
  const token = createSessionToken(claims, secret);
  assert.throws(() => verifySessionToken(`${token.slice(0,-1)}x`, secret, {now:1100}), /UNAUTHENTICATED/);
  assert.throws(() => verifySessionToken(token, secret, {now:1300}), /UNAUTHENTICATED/);
});
