import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCloudflareFreeApiHandler,
  inspectCloudflareFreeBindings
} from '../../../infra/cloudflare/api-runtime.mjs';

const configuredEnv = {
  HYPERDRIVE: {connectionString: 'postgres://example.invalid/mathchakchak'},
  SESSION_HMAC_SECRET: 'a'.repeat(32)
};

test('Cloudflare free runtime validates bindings without exposing their values', () => {
  assert.deepEqual(inspectCloudflareFreeBindings({}), {
    ready: false,
    hyperdrive_ready: false,
    session_secret_ready: false,
    missing: ['HYPERDRIVE', 'SESSION_HMAC_SECRET']
  });
  assert.equal(inspectCloudflareFreeBindings(configuredEnv).ready, true);
});

test('Cloudflare free runtime fails closed before creating a server when bindings are missing', async () => {
  let created = false;
  const handler = createCloudflareFreeApiHandler({
    httpServerHandlerImpl() {
      throw new Error('must not be reached');
    },
    runtimeFactory() {
      created = true;
    }
  });
  const response = await handler.fetch(new Request('https://example.test/api/v1/locales'), {}, {});

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'CLOUDFLARE_FREE_RUNTIME_NOT_CONFIGURED');
  assert.equal(created, false);
});

test('Cloudflare free runtime wraps the existing Node server and schedules repository cleanup', async () => {
  const server = {kind: 'existing-node-server'};
  let closed = false;
  let scheduled;
  const handler = createCloudflareFreeApiHandler({
    runtimeFactory() {
      return {
        server,
        async close() { closed = true; }
      };
    },
    httpServerHandlerImpl(receivedServer) {
      assert.equal(receivedServer, server);
      return {
        async fetch(request) {
          return new Response(JSON.stringify({path: new URL(request.url).pathname}), {
            headers: {'content-type': 'application/json'}
          });
        }
      };
    }
  });
  const response = await handler.fetch(
    new Request('https://example.test/api/v1/locales'),
    configuredEnv,
    {waitUntil(promise) { scheduled = promise; }}
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {path: '/api/v1/locales'});
  assert.ok(scheduled instanceof Promise);
  await scheduled;
  assert.equal(closed, true);
});
