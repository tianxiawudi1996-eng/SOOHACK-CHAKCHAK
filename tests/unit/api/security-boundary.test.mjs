import {Readable} from 'node:stream';
import test from 'node:test';
import assert from 'node:assert/strict';
import {isJsonMediaType, readJson, requireIdempotencyKey} from '../../../developer/src/api/http.mjs';
import {assertAllowedRequestOrigin, parseAllowedOrigins, resolveTrustedHeaders} from '../../../developer/src/api/security.mjs';

function request(body, headers = {}, method = 'POST') {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
  stream.headers = headers;
  stream.method = method;
  return stream;
}

test('JSON media types accept JSON and structured suffixes only', () => {
  assert.equal(isJsonMediaType('application/json; charset=utf-8'), true);
  assert.equal(isJsonMediaType('application/problem+json'), true);
  assert.equal(isJsonMediaType('text/plain'), false);
  assert.equal(isJsonMediaType(undefined), false);
});

test('request body rejects unsupported media type and declared oversize', async () => {
  await assert.rejects(readJson(request('{}', {'content-length':'2','content-type':'text/plain'})), /UNSUPPORTED_MEDIA_TYPE/);
  await assert.rejects(readJson(request('', {'content-length':String(64 * 1024 + 1),'content-type':'application/json'})), /PAYLOAD_TOO_LARGE/);
});

test('unsafe browser requests require an allowlisted origin when Origin is present', () => {
  const origins = parseAllowedOrigins('http://127.0.0.1:4180,https://study.example');
  assert.doesNotThrow(() => assertAllowedRequestOrigin({method:'POST',headers:{origin:'http://127.0.0.1:4180'}}, origins));
  assert.doesNotThrow(() => assertAllowedRequestOrigin({method:'POST',headers:{}}, origins));
  assert.throws(() => assertAllowedRequestOrigin({method:'POST',headers:{origin:'https://evil.example'}}, origins), /ORIGIN_FORBIDDEN/);
  assert.throws(() => assertAllowedRequestOrigin({method:'POST',headers:{origin:'null'}}, origins), /ORIGIN_FORBIDDEN/);
});

test('trusted identity headers are test-only and idempotency keys are bounded', () => {
  assert.equal(resolveTrustedHeaders({requested:true,runtimeEnv:'test'}), true);
  assert.throws(() => resolveTrustedHeaders({requested:true,runtimeEnv:'production'}), /TRUSTED_TEST_HEADERS_FORBIDDEN/);
  assert.equal(requireIdempotencyKey({headers:{'idempotency-key':'phase24-safe_key.01'}}), 'phase24-safe_key.01');
  assert.throws(() => requireIdempotencyKey({headers:{'idempotency-key':'bad key!'}}), /IDEMPOTENCY_KEY_REQUIRED/);
});
