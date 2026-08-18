import {MathChakChakRepository} from '../../developer/src/api/repository.mjs';
import {createMathChakChakServer} from '../../developer/src/api/server.mjs';
import {parseAllowedOrigins} from '../../developer/src/api/security.mjs';
import {createTutorKernel} from '../../developer/src/agent/tutor-kernel.mjs';
import {createTutorOperations, resolveTutorOperationsPolicy} from '../../developer/src/agent/tutor-operations.mjs';
import {createTutorService} from '../../developer/src/agent/tutor-service.mjs';

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
});

function json(payload, status) {
  return new Response(JSON.stringify(payload), {status, headers: JSON_HEADERS});
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).byteLength;
}

export function inspectCloudflareFreeBindings(env = {}) {
  const hyperdriveReady = typeof env.HYPERDRIVE?.connectionString === 'string'
    && env.HYPERDRIVE.connectionString.length > 0;
  const sessionSecretReady = byteLength(env.SESSION_HMAC_SECRET) >= 32;
  const missing = [];
  if (!hyperdriveReady) missing.push('HYPERDRIVE');
  if (!sessionSecretReady) missing.push('SESSION_HMAC_SECRET');
  return {
    ready: missing.length === 0,
    hyperdrive_ready: hyperdriveReady,
    session_secret_ready: sessionSecretReady,
    missing
  };
}

function allowedOriginsFor(request, env) {
  const configured = parseAllowedOrigins(env.ALLOWED_BROWSER_ORIGINS || '');
  configured.add(new URL(request.url).origin);
  return configured;
}

export function createCloudflareApiRuntime({env, request}) {
  const repository = new MathChakChakRepository({
    connectionString: env.HYPERDRIVE.connectionString,
    fulfilmentPackageValiditySeconds: env.FULFILMENT_PACKAGE_VALIDITY_SECONDS
  });
  const tutorEnvironment = {
    ...env,
    TUTOR_AI_ENABLED: 'false',
    TUTOR_AI_KILL_SWITCH: 'true'
  };
  const tutorOperations = createTutorOperations({
    policy: resolveTutorOperationsPolicy(tutorEnvironment)
  });
  const tutorService = createTutorService({
    repository,
    kernel: createTutorKernel({
      operations: tutorOperations,
      timeoutMs: tutorOperations.policy.requestTimeoutMs
    })
  });
  const server = createMathChakChakServer({
    repository,
    auth: {
      sessionSecret: env.SESSION_HMAC_SECRET,
      allowTrustedHeaders: false,
      allowedOrigins: allowedOriginsFor(request, env),
      localDemoEnabled: false
    },
    tutorService,
    tutorOperations
  });
  return {
    server,
    close: () => repository.close()
  };
}

export function createCloudflareFreeApiHandler({
  httpServerHandlerImpl,
  runtimeFactory = createCloudflareApiRuntime
}) {
  if (typeof httpServerHandlerImpl !== 'function') {
    throw new Error('CLOUDFLARE_HTTP_SERVER_HANDLER_REQUIRED');
  }
  return {
    async fetch(request, env, ctx) {
      const inspected = inspectCloudflareFreeBindings(env);
      if (!inspected.ready) {
        return json({
          error: {
            code: 'CLOUDFLARE_FREE_RUNTIME_NOT_CONFIGURED',
            message: 'Hyperdrive and the session secret must be configured before the API can start.',
            missing: inspected.missing
          }
        }, 503);
      }

      let runtime;
      try {
        runtime = runtimeFactory({env, request});
        const handler = httpServerHandlerImpl(runtime.server);
        const response = await handler.fetch(request, env, ctx);
        const cleanup = Promise.resolve().then(() => runtime.close());
        if (typeof ctx?.waitUntil === 'function') ctx.waitUntil(cleanup);
        else await cleanup;
        return response;
      } catch {
        if (runtime) await runtime.close().catch(() => {});
        return json({
          error: {
            code: 'CLOUDFLARE_FREE_RUNTIME_UNAVAILABLE',
            message: 'The Cloudflare development API runtime could not serve the request.'
          }
        }, 503);
      }
    }
  };
}
