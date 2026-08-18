import assert from 'node:assert/strict';
import test from 'node:test';
import worker, {
  createWorker,
  inspectApiOrigin,
} from '../../../infra/cloudflare/worker.mjs';

const assets = {
  fetch(request) {
    return new Response(`asset:${new URL(request.url).pathname}`, {status: 200});
  }
};

test('Cloudflare development health is honest about API and database gates', async () => {
  const response = await worker.fetch(new Request('https://example.test/readyz'), {ASSETS: assets});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'FRONTEND_PREVIEW_READY');
  assert.equal(body.api, 'BLOCKED_EXTERNAL');
  assert.equal(body.database, 'BLOCKED_EXTERNAL');
  assert.equal(body.production_release, false);
});

test('Cloudflare readiness only promotes API and PostgreSQL after a real backend health response', async () => {
  let readinessRequest;
  const bridge = createWorker({
    async fetchImpl(request) {
      readinessRequest = request;
      return new Response(JSON.stringify({
        data: {status: 'ok', database: {ready: true}}
      }), {
        status: 200,
        headers: {'content-type': 'application/json'}
      });
    }
  });

  const response = await bridge.fetch(
    new Request('https://dev.mathchakchak.test/readyz'),
    {ASSETS: assets, API_ORIGIN: 'https://api.mathchakchak.test'}
  );
  const body = await response.json();

  assert.equal(readinessRequest.url, 'https://api.mathchakchak.test/readyz');
  assert.equal(body.status, 'DEVELOPMENT_RUNTIME_READY');
  assert.equal(body.api_bridge, 'CONNECTED');
  assert.equal(body.api, 'READY');
  assert.equal(body.database, 'READY');
  assert.equal(body.production_release, false);
});

test('Cloudflare development preview refuses API requests until backend connection', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/v1/locales'), {ASSETS: assets});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'API_NOT_CONNECTED');
});

test('Cloudflare API origin only accepts a separate pathless HTTPS origin', () => {
  assert.equal(inspectApiOrigin('https://api.mathchakchak.test', 'https://dev.mathchakchak.test').valid, true);
  assert.equal(inspectApiOrigin('http://api.mathchakchak.test', 'https://dev.mathchakchak.test').valid, false);
  assert.equal(inspectApiOrigin('https://user:pass@api.mathchakchak.test', 'https://dev.mathchakchak.test').valid, false);
  assert.equal(inspectApiOrigin('https://api.mathchakchak.test/base', 'https://dev.mathchakchak.test').valid, false);
  assert.equal(inspectApiOrigin('https://dev.mathchakchak.test', 'https://dev.mathchakchak.test').valid, false);
});

test('Cloudflare API bridge forwards same-origin API traffic to the configured backend', async () => {
  let upstreamRequest;
  const bridge = createWorker({
    async fetchImpl(request) {
      upstreamRequest = request;
      return new Response(JSON.stringify({data: {locales: ['ko', 'en']}}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      });
    }
  });
  const request = new Request('https://dev.mathchakchak.test/api/v1/locales?active=true', {
    headers: {
      authorization: 'Bearer test-token',
      'cf-connecting-ip': '192.0.2.10',
      'x-forwarded-for': '192.0.2.10'
    }
  });

  const response = await bridge.fetch(request, {
    ASSETS: assets,
    API_ORIGIN: 'https://api.mathchakchak.test'
  });

  assert.equal(response.status, 200);
  assert.equal(upstreamRequest.url, 'https://api.mathchakchak.test/api/v1/locales?active=true');
  assert.equal(upstreamRequest.headers.get('authorization'), 'Bearer test-token');
  assert.equal(upstreamRequest.headers.has('cf-connecting-ip'), false);
  assert.equal(upstreamRequest.headers.has('x-forwarded-for'), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-mathchakchak-edge'), 'api-bridge');
});

test('Cloudflare API bridge preserves mutation body and idempotency key without following redirects', async () => {
  let upstreamRequest;
  const bridge = createWorker({
    async fetchImpl(request) {
      upstreamRequest = request;
      return new Response(JSON.stringify({data: {created: true}}), {
        status: 201,
        headers: {'content-type': 'application/json'}
      });
    }
  });
  const response = await bridge.fetch(new Request('https://dev.mathchakchak.test/api/v1/diagnostics', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': 'diagnostic-test-001'
    },
    body: JSON.stringify({grade_code: 'E4'})
  }), {
    ASSETS: assets,
    API_ORIGIN: 'https://api.mathchakchak.test'
  });

  assert.equal(response.status, 201);
  assert.equal(upstreamRequest.method, 'POST');
  assert.equal(upstreamRequest.redirect, 'manual');
  assert.equal(upstreamRequest.headers.get('idempotency-key'), 'diagnostic-test-001');
  assert.deepEqual(await upstreamRequest.json(), {grade_code: 'E4'});
});

test('Cloudflare API bridge fails closed when backend configuration or transport fails', async () => {
  const invalid = await worker.fetch(
    new Request('https://dev.mathchakchak.test/api/v1/locales'),
    {ASSETS: assets, API_ORIGIN: 'http://api.mathchakchak.test'}
  );
  assert.equal(invalid.status, 503);
  assert.equal((await invalid.json()).error.code, 'API_CONFIGURATION_INVALID');

  const unavailableWorker = createWorker({
    async fetchImpl() {
      throw new Error('simulated upstream failure');
    }
  });
  const unavailable = await unavailableWorker.fetch(
    new Request('https://dev.mathchakchak.test/api/v1/locales'),
    {ASSETS: assets, API_ORIGIN: 'https://api.mathchakchak.test'}
  );
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).error.code, 'API_UPSTREAM_UNAVAILABLE');
});

test('Cloudflare worker delegates non-API requests to static assets', async () => {
  const response = await worker.fetch(new Request('https://example.test/curriculum/?locale=ko'), {ASSETS: assets});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset:/curriculum/');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('Cloudflare free worker routes API requests to the embedded runtime without API_ORIGIN', async () => {
  let received;
  const embedded = createWorker({
    apiHandler: {
      async fetch(request) {
        received = request;
        return new Response(JSON.stringify({data: {locales: ['ko', 'en']}}), {
          status: 200,
          headers: {'content-type': 'application/json'}
        });
      }
    }
  });
  const response = await embedded.fetch(
    new Request('https://dev.mathchakchak.test/api/v1/locales'),
    {ASSETS: assets},
    {waitUntil() {}}
  );

  assert.equal(received.url, 'https://dev.mathchakchak.test/api/v1/locales');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-mathchakchak-edge'), 'embedded-worker-api');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Cloudflare free worker promotes readiness only after embedded PostgreSQL health succeeds', async () => {
  const embedded = createWorker({
    apiHandler: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, '/readyz');
        return new Response(JSON.stringify({data: {database: {ready: true}}}), {
          status: 200,
          headers: {'content-type': 'application/json'}
        });
      }
    }
  });
  const response = await embedded.fetch(
    new Request('https://dev.mathchakchak.test/readyz'),
    {ASSETS: assets},
    {waitUntil() {}}
  );
  const body = await response.json();

  assert.equal(body.status, 'DEVELOPMENT_RUNTIME_READY');
  assert.equal(body.api_bridge, 'EMBEDDED_CONNECTED');
  assert.equal(body.api, 'READY');
  assert.equal(body.database, 'READY');
});
