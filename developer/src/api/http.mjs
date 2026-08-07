import crypto from 'node:crypto';
import {ApiError, badRequest} from './errors.mjs';
import {normalizeLocale} from '../i18n/locale-resolver.mjs';
import {authenticatedRequestContext} from './auth.mjs';

const MAX_BODY_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const JSON_MEDIA_TYPE_PATTERN = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/i;
const API_SECURITY_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none'
});

export function isJsonMediaType(value) {
  if (typeof value !== 'string') return false;
  return JSON_MEDIA_TYPE_PATTERN.test(value.split(';', 1)[0].trim());
}

export async function readJson(request) {
  const rawLength = request.headers['content-length'];
  const declaredLength = rawLength === undefined ? null : Number(rawLength);
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength < 0)) {
    throw badRequest('INVALID_CONTENT_LENGTH', 'error.invalid_content_length');
  }
  if (declaredLength !== null && declaredLength > MAX_BODY_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'error.payload_too_large');
  }
  const hasBody = (declaredLength !== null && declaredLength > 0) || request.headers['transfer-encoding'] !== undefined;
  if (hasBody && !isJsonMediaType(request.headers['content-type'])) {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'error.unsupported_media_type');
  }
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

export function requestContext(request, auth) {
  const context = authenticatedRequestContext(request, auth);
  if (
    !UUID_PATTERN.test(context.userId) ||
    !['STUDENT','ADMIN'].includes(context.role) ||
    (context.role==='STUDENT'&&!UUID_PATTERN.test(context.studentId)) ||
    (context.role==='ADMIN'&&context.studentId!==undefined)
  ) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'error.unauthenticated');
  }
  return context;
}

export function requireIdempotencyKey(request) {
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
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
    ...API_SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Content-Language': locale,
    'X-Request-Id': requestId
  });
  response.end(body);
}

export function sendText(response, status, body, {requestId, contentType = 'text/plain; charset=utf-8'} = {}) {
  response.writeHead(status, {
    ...API_SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
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
