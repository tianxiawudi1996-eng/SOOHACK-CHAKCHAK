import {ApiError} from './errors.mjs';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function parseAllowedOrigins(value = '') {
  const origins = new Set();
  for (const item of String(value).split(',')) {
    const candidate = item.trim();
    if (!candidate) continue;
    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error('ALLOWED_BROWSER_ORIGINS_INVALID');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== candidate.replace(/\/$/, '')) {
      throw new Error('ALLOWED_BROWSER_ORIGINS_INVALID');
    }
    origins.add(parsed.origin);
  }
  return origins;
}

export function resolveTrustedHeaders({requested = false, runtimeEnv = 'local'} = {}) {
  if (!requested) return false;
  if (runtimeEnv !== 'test') throw new Error('TRUSTED_TEST_HEADERS_FORBIDDEN_OUTSIDE_TEST');
  return true;
}

export function assertAllowedRequestOrigin(request, allowedOrigins = new Set()) {
  if (!UNSAFE_METHODS.has(request.method)) return;
  const origin = request.headers.origin;
  if (origin === undefined) return;
  if (typeof origin !== 'string' || origin === 'null' || !allowedOrigins.has(origin)) {
    throw new ApiError(403, 'ORIGIN_FORBIDDEN', 'error.origin_forbidden');
  }
}
