import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4181';

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return {response, payload:await response.json()};
}

test('API rejects hostile browser and malformed request boundaries', async () => {
  const allowedOrigin = 'http://127.0.0.1:4180';
  const issued = await json('/api/v1/local-demo/session', {
    method:'POST', headers:{origin:allowedOrigin,'content-type':'application/json'}, body:'{}'
  });
  assert.equal(issued.response.status, 201);
  const token = issued.payload.data.access_token;

  const hostileOrigin = await json('/api/v1/local-demo/session', {
    method:'POST', headers:{origin:'https://evil.example','content-type':'application/json'}, body:'{}'
  });
  assert.equal(hostileOrigin.response.status, 403);
  assert.equal(hostileOrigin.payload.error.code, 'ORIGIN_FORBIDDEN');

  const noToken = await json(`/api/v1/students/${issued.payload.data.student_id}/progress`);
  assert.equal(noToken.response.status, 401);
  assert.equal(noToken.payload.error.code, 'UNAUTHENTICATED');

  const baseHeaders = {authorization:`Bearer ${token}`,'idempotency-key':`phase24-${crypto.randomUUID()}`};
  const wrongType = await json('/api/v1/diagnostics', {
    method:'POST', headers:{...baseHeaders,'content-type':'text/plain'}, body:'{}'
  });
  assert.equal(wrongType.response.status, 415);
  assert.equal(wrongType.payload.error.code, 'UNSUPPORTED_MEDIA_TYPE');

  const oversized = await json('/api/v1/diagnostics', {
    method:'POST',
    headers:{...baseHeaders,'idempotency-key':`phase24-${crypto.randomUUID()}`,'content-type':'application/json'},
    body:`{"padding":"${'x'.repeat(64 * 1024)}"}`
  });
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.payload.error.code, 'PAYLOAD_TOO_LARGE');

  const invalidKey = await json('/api/v1/diagnostics', {
    method:'POST', headers:{authorization:`Bearer ${token}`,'idempotency-key':'bad key!','content-type':'application/json'}, body:'{}'
  });
  assert.equal(invalidKey.response.status, 400);
  assert.equal(invalidKey.payload.error.code, 'IDEMPOTENCY_KEY_REQUIRED');

  for (const name of [
    'content-security-policy','x-content-type-options','x-frame-options','referrer-policy',
    'permissions-policy','cross-origin-opener-policy','cross-origin-resource-policy',
    'x-permitted-cross-domain-policies','cache-control'
  ]) assert.ok(hostileOrigin.response.headers.get(name), `missing ${name}`);
  assert.equal(hostileOrigin.response.headers.get('strict-transport-security'), null);
});
