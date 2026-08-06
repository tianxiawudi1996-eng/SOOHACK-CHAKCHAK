import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`INTEGRATION_EVIDENCE_FAIL: ${message}`);
  process.exit(1);
};
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const requireFile = (relative) => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) fail(`required runtime file missing: ${relative}`);
  return fs.readFileSync(absolute, 'utf8');
};

const evidence = readJson('docs/productization/evidence/PHASE_8_INTEGRATION_QA.json');
const status = readJson('docs/productization/STATUS.json');
const contract = readJson('infra/deployment/staging-contract.json');
const packageJson = readJson('package.json');
const compose = requireFile('infra/deployment/compose.api-staging.yaml');
const server = requireFile('developer/src/api/server.mjs');
requireFile('developer/src/api/repository.mjs');
requireFile('infra/database/seeds/0001_staging_seed.sql');
requireFile('tests/integration/api-core-journey.test.mjs');

if (evidence.project !== 'MathChakChak' || evidence.release !== '0.1.0') fail('identity mismatch');
if (evidence.status !== 'PASS' || evidence.result !== 'FULL_INTEGRATION_PASS_LOCAL_ISOLATED') fail('full integration result missing');
if (evidence.environment.api_health !== 'healthy' || evidence.environment.database_health !== 'healthy') fail('runtime health evidence invalid');
if (evidence.environment.database_external_port_exposed !== false || evidence.environment.production_data_used !== false) fail('runtime isolation evidence invalid');

const frontend = evidence.frontend_checks;
if (frontend.artifact_hashes !== 'PASS' || frontend.locale_rendering !== '8/8 PASS') fail('frontend integration failed');
if (frontend.missing_translation_keys !== 0 || frontend.horizontal_overflow !== 0 || frontend.console_errors_or_warnings !== 0) fail('frontend regression recorded');
if (frontend.approved_character_images !== '2/2 PASS' || frontend.security_headers !== '6/6 PASS') fail('frontend asset or security integration failed');

const runtime = evidence.runtime_integration;
for (const key of ['api_deployed','database_connected_through_api','synthetic_seed_only']) if (runtime[key] !== true) fail(`runtime evidence failed: ${key}`);
for (const key of ['core_user_journey','server_side_scoring','idempotent_replay','idempotency_payload_mismatch_rejected','missing_idempotency_key_rejected','ownership_denial','invalid_locale_rejected','api_restart_database_persistence','api_log_sensitive_value_scan','status']) {
  if (runtime[key] !== 'PASS') fail(`runtime check failed: ${key}`);
}
if (runtime.postgres_version !== '16' || runtime.schema_tables !== '18/18' || runtime.journey_steps.length !== 9) fail('database or journey coverage invalid');
if (evidence.defects_fixed.length !== 2 || evidence.defects_fixed.some((item) => item.retest !== 'PASS')) fail('defect retest evidence invalid');
if (evidence.phase8_complete !== true || evidence.phase9_entry_allowed !== true || evidence.blockers.length !== 0) fail('phase boundary invalid');

if (contract.scope.api_runtime !== true || contract.scope.database_runtime !== true || contract.scope.database_external_port !== false) fail('runtime contract invalid');
if (!compose.includes('127.0.0.1:4181:8080') || /^\s+ports:\s*\n\s+-.*5432/m.test(compose)) fail('API loopback or database exposure policy invalid');
if (!server.includes('/api/v1/diagnostics') || !server.includes('/api/v1/learning-sessions') || !server.includes('/progress')) fail('core API surface missing');
if (packageJson.dependencies?.pg !== '^8.16.3' || !packageJson.scripts['test:integration:api']) fail('runtime dependency or test command missing');
if (status.phases['8'].status !== 'VERIFIED' || status.phases['9'].status !== 'READY') fail('productization status boundary invalid');

console.log('INTEGRATION_FULL_STACK_PASS');
console.log('frontend_locales=8/8');
console.log('api_core_journey=PASS');
console.log('postgres_api_path=PASS');
console.log('idempotency_and_ownership=PASS');
console.log('restart_persistence=PASS');
console.log('phase9_entry=ALLOWED');
