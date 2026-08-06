import {MathChakChakRepository} from './repository.mjs';
import {createMathChakChakServer} from './server.mjs';

const port = Number.parseInt(process.env.PORT || '8080', 10);
const host = process.env.HOST || '0.0.0.0';
const auth = {
  sessionSecret: process.env.SESSION_HMAC_SECRET,
  allowTrustedHeaders: process.env.ALLOW_TRUSTED_TEST_HEADERS === 'true'
};
if (!auth.allowTrustedHeaders && (!auth.sessionSecret || Buffer.byteLength(auth.sessionSecret) < 32)) {
  throw new Error('SESSION_HMAC_SECRET_REQUIRED');
}
const repository = new MathChakChakRepository({connectionString: process.env.DATABASE_URL});
const server = createMathChakChakServer({repository, auth});

server.listen(port, host, () => {
  console.log(JSON.stringify({event: 'api_started', host, port, environment: process.env.RUNTIME_ENV || 'local'}));
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
