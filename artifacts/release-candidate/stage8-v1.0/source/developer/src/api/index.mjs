import {MathChakChakRepository} from './repository.mjs';
import {createMathChakChakServer} from './server.mjs';
import {parseAllowedOrigins, resolveTrustedHeaders} from './security.mjs';
import {createOpenAIResponsesProvider} from '../agent/openai-responses-provider.mjs';
import {createTutorKernel} from '../agent/tutor-kernel.mjs';
import {createTutorService} from '../agent/tutor-service.mjs';
import {createTutorOperations,resolveTutorOperationsPolicy} from '../agent/tutor-operations.mjs';

const port = Number.parseInt(process.env.PORT || '8080', 10);
const host = process.env.HOST || '0.0.0.0';
const runtimeEnv = process.env.RUNTIME_ENV || 'local';
const auth = {
  sessionSecret: process.env.SESSION_HMAC_SECRET,
  allowTrustedHeaders: resolveTrustedHeaders({
    requested: process.env.ALLOW_TRUSTED_TEST_HEADERS === 'true',
    runtimeEnv
  }),
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_BROWSER_ORIGINS),
  localDemoEnabled: runtimeEnv === 'staging-local-isolated' && process.env.ENABLE_LOCAL_DEMO_SESSION === 'true'
};
if (!auth.allowTrustedHeaders && (!auth.sessionSecret || Buffer.byteLength(auth.sessionSecret) < 32)) {
  throw new Error('SESSION_HMAC_SECRET_REQUIRED');
}
const repository = new MathChakChakRepository({
  connectionString: process.env.DATABASE_URL,
  fulfilmentPackageValiditySeconds:process.env.FULFILMENT_PACKAGE_VALIDITY_SECONDS
});
const tutorOperations=createTutorOperations({policy:resolveTutorOperationsPolicy(process.env)});
const tutorProvider=process.env.TUTOR_AI_ENABLED==='true'&&tutorOperations.isProviderConfigurationApproved()
  ? createOpenAIResponsesProvider({
      apiKey:process.env.OPENAI_API_KEY,
      model:tutorOperations.policy.modelReference,
      promptVersion:tutorOperations.policy.promptVersion
    })
  : null;
const tutorService=createTutorService({repository,kernel:createTutorKernel({
  provider:tutorProvider,operations:tutorOperations,timeoutMs:tutorOperations.policy.requestTimeoutMs
})});
const server = createMathChakChakServer({repository, auth, tutorService, tutorOperations});

server.listen(port, host, () => {
  console.log(JSON.stringify({event: 'api_started', host, port, environment: runtimeEnv}));
});

async function shutdown(signal) {
  console.log(JSON.stringify({event: 'api_stopping', signal}));
  server.close(async () => {
    await repository.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
