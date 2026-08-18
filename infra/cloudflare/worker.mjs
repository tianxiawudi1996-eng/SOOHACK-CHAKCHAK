const SECURITY_HEADERS = Object.freeze({
  'content-security-policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none'
});

const JSON_HEADERS = Object.freeze({
  ...SECURITY_HEADERS,
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
});

const FORWARDED_HEADER_BLOCKLIST = Object.freeze([
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'host',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto'
]);

function forbiddenApiHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized === '0.0.0.0' || normalized.includes(':')) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) return true;
  if (/^127\./.test(normalized) || /^10\./.test(normalized) || /^192\.168\./.test(normalized)) return true;
  if (/^169\.254\./.test(normalized)) return true;
  const private172 = /^172\.(\d{1,2})\./.exec(normalized);
  return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : false;
}

export function inspectApiOrigin(rawValue, frontendOrigin) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return {valid: false, reason: 'MISSING'};
  }

  try {
    const parsed = new URL(rawValue.trim());
    const frontend = new URL(frontendOrigin);
    const valid = parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
      && parsed.pathname === '/'
      && !parsed.search
      && !parsed.hash
      && parsed.origin !== frontend.origin
      && parsed.hostname.includes('.')
      && !forbiddenApiHostname(parsed.hostname);
    return {valid, reason: valid ? null : 'INVALID'};
  } catch {
    return {valid: false, reason: 'INVALID'};
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {status, headers: JSON_HEADERS});
}

function secureApiResponse(upstream) {
  const response = new Response(upstream.body, upstream);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  response.headers.set('cache-control', 'no-store');
  response.headers.set('x-mathchakchak-edge', 'api-bridge');
  return response;
}

async function proxyApiRequest(request, env, url, fetchImpl) {
  const inspected = inspectApiOrigin(env.API_ORIGIN, url.origin);
  if (!inspected.valid) {
    const missing = inspected.reason === 'MISSING';
    return json({
      error: {
        code: missing ? 'API_NOT_CONNECTED' : 'API_CONFIGURATION_INVALID',
        message: missing
          ? 'The Cloudflare development frontend is available, but the API and PostgreSQL deployment are not connected.'
          : 'The configured API origin does not satisfy the HTTPS and origin-isolation requirements.'
      }
    }, 503);
  }

  const upstreamUrl = new URL(`${url.pathname}${url.search}`, env.API_ORIGIN.trim());
  const upstreamHeaders = new Headers(request.headers);
  for (const header of FORWARDED_HEADER_BLOCKLIST) upstreamHeaders.delete(header);
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body: request.body,
    redirect: 'manual',
    ...(request.body ? {duplex: 'half'} : {})
  });

  try {
    return secureApiResponse(await fetchImpl(upstreamRequest));
  } catch {
    return json({
      error: {
        code: 'API_UPSTREAM_UNAVAILABLE',
        message: 'The configured API deployment did not respond.'
      }
    }, 502);
  }
}

async function inspectBackendReadiness(env, frontendUrl, fetchImpl) {
  const inspected = inspectApiOrigin(env.API_ORIGIN, frontendUrl.origin);
  if (!inspected.valid) {
    return {
      bridge: inspected.reason === 'MISSING' ? 'NOT_CONFIGURED' : 'CONFIGURATION_INVALID',
      apiReady: false,
      databaseReady: false
    };
  }

  try {
    const response = await fetchImpl(new Request(new URL('/readyz', env.API_ORIGIN.trim()), {
      method: 'GET',
      headers: {accept: 'application/json'},
      redirect: 'manual'
    }));
    const payload = await response.json();
    return {
      bridge: response.status === 200 ? 'CONNECTED' : 'UPSTREAM_NOT_READY',
      apiReady: response.status === 200,
      databaseReady: response.status === 200 && payload?.data?.database?.ready === true
    };
  } catch {
    return {bridge: 'UPSTREAM_UNAVAILABLE', apiReady: false, databaseReady: false};
  }
}

export function createWorker({fetchImpl = globalThis.fetch} = {}) {
  return {
    async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/healthz' || url.pathname === '/readyz') {
      const configured = inspectApiOrigin(env.API_ORIGIN, url.origin);
      const readiness = url.pathname === '/readyz'
        ? await inspectBackendReadiness(env, url, fetchImpl)
        : {
          bridge: configured.valid
            ? 'CONFIGURED_UNVERIFIED'
            : configured.reason === 'MISSING' ? 'NOT_CONFIGURED' : 'CONFIGURATION_INVALID',
          apiReady: false,
          databaseReady: false
        };
      return json({
        status: readiness.apiReady && readiness.databaseReady
          ? 'DEVELOPMENT_RUNTIME_READY'
          : 'FRONTEND_PREVIEW_READY',
        environment: 'development',
        frontend: 'READY',
        api: readiness.apiReady ? 'READY' : 'BLOCKED_EXTERNAL',
        api_bridge: readiness.bridge,
        database: readiness.databaseReady ? 'READY' : 'BLOCKED_EXTERNAL',
        production_release: false
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyApiRequest(request, env, url, fetchImpl);
    }

    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
    }
  };
}

export default createWorker();
