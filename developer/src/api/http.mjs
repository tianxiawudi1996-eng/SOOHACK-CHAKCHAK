import crypto from 'node:crypto';
import {ApiError, badRequest} from './errors.mjs';
import {normalizeLocale} from '../i18n/locale-resolver.mjs';

const MAX_BODY_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'error.payload_too_large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw badRequest('INVALID_JSON', 'error.invalid_json');
  }
}

export function requestContext(request) {
  const userId = request.headers['x-user-id'];
  const studentId = request.headers['x-student-id'];
  const role = request.headers['x-role'];
  if (!UUID_PATTERN.test(userId || '') || !UUID_PATTERN.test(studentId || '') || role !== 'STUDENT') {
    throw new ApiError(401, 'UNAUTHENTICATED', 'error.unauthenticated');
  }
  return {userId, studentId, role};
}

export function requireIdempotencyKey(request) {
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || key.length < 8 || key.length > 191) {
    throw badRequest('IDEMPOTENCY_KEY_REQUIRED', 'error.idempotency_key_required');
  }
  return key;
}

export function normalizeRequestedLocale(value) {
  const locale = normalizeLocale(value);
  if (!locale) throw badRequest('UNSUPPORTED_LOCALE', 'error.unsupported_locale');
  return locale;
}

export function requestHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function sendJson(response, status, payload, {requestId, locale = 'en'} = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Content-Language': locale,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Request-Id': requestId
  });
  response.end(body);
}

export function success(data, {requestId, locale = 'en', status = 200, extraMeta = {}} = {}) {
  return {
    status,
    payload: {data, meta: {request_id: requestId, locale, schema_version: '1.0', ...extraMeta}}
  };
}

export function failure(error, requestId) {
  const normalized = error instanceof ApiError
    ? error
    : new ApiError(500, 'INTERNAL_ERROR', 'error.internal', {retryable: true, cause: error});
  return {
    status: normalized.status,
    payload: {
      error: {code: normalized.code, message_key: normalized.messageKey, retryable: normalized.retryable},
      meta: {request_id: requestId}
    }
  };
}

export function newRequestId() {
  return `req_${crypto.randomUUID()}`;
}
