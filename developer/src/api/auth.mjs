import crypto from 'node:crypto';
import {ApiError} from './errors.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_VERSION = 'mcs1';
const EXPECTED_ISSUER = 'mathchakchak-session-gateway';
const EXPECTED_AUDIENCE = 'mathchakchak-api';
const MAX_TOKEN_BYTES = 4096;
const SESSION_ROLES=new Set(['STUDENT','PARENT','ACADEMY_OWNER','TEACHER','ADMIN']);

function unauthenticated() {
  return new ApiError(401, 'UNAUTHENTICATED', 'error.unauthenticated');
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('SESSION_HMAC_SECRET_MINIMUM_32_BYTES');
}

function signature(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest('base64url');
}

export function createSessionToken({userId, studentId, role = 'STUDENT', expiresAt, issuedAt, issuer = EXPECTED_ISSUER, audience = EXPECTED_AUDIENCE}, secret) {
  assertSecret(secret);
  const now = issuedAt ?? Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    student_id: studentId,
    role,
    iss: issuer,
    aud: audience,
    iat: now,
    exp: expiresAt ?? now + 300
  })).toString('base64url');
  const input = `${TOKEN_VERSION}.${payload}`;
  return `${input}.${signature(input, secret)}`;
}

export function verifySessionToken(token, secret, {now = Math.floor(Date.now() / 1000)} = {}) {
  assertSecret(secret);
  if (typeof token !== 'string' || Buffer.byteLength(token) > MAX_TOKEN_BYTES) throw unauthenticated();
  const parts = token?.split('.') ?? [];
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) throw unauthenticated();
  const input = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(input, secret));
  const received = Buffer.from(parts[2]);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) throw unauthenticated();

  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw unauthenticated();
  }
  if (
    claims.iss !== EXPECTED_ISSUER ||
    claims.aud !== EXPECTED_AUDIENCE ||
    !SESSION_ROLES.has(claims.role) ||
    !UUID_PATTERN.test(claims.sub || '') ||
    (claims.role==='STUDENT'&&!UUID_PATTERN.test(claims.student_id || '')) ||
    (claims.role!=='STUDENT'&&claims.student_id!==undefined) ||
    !Number.isInteger(claims.iat) ||
    !Number.isInteger(claims.exp) ||
    claims.iat > now + 30 ||
    claims.exp <= now ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > 900
  ) throw unauthenticated();
  return claims.role==='STUDENT'
    ? {userId:claims.sub,studentId:claims.student_id,role:claims.role}
    : {userId:claims.sub,role:claims.role};
}

export function authenticatedRequestContext(request, {sessionSecret, allowTrustedHeaders = false, now} = {}) {
  const authorization = request.headers.authorization;
  const bearer = typeof authorization === 'string' ? authorization.match(/^Bearer ([^\s]+)$/i) : null;
  if (bearer) {
    return verifySessionToken(bearer[1], sessionSecret, {now});
  }
  if (allowTrustedHeaders) {
    const userId = request.headers['x-user-id'];
    const studentId = request.headers['x-student-id'];
    const role = request.headers['x-role'];
    if (UUID_PATTERN.test(userId || '') && UUID_PATTERN.test(studentId || '') && role === 'STUDENT') return {userId, studentId, role};
  }
  throw unauthenticated();
}
