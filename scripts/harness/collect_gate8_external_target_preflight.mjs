import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_EXTERNAL_TARGET_PROVIDERS,
  collectExternalTargetInput,
  inspectExternalTargetInput,
  isFreshProviderAuthentication,
} from './lib/gate8_external_target_contract.mjs';

const root = process.cwd();
const outputPath = path.join(root, 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_API_POSTGRES_TARGET_PREFLIGHT_v1.0.json');
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const readJsonOrNull = async (relativePath) => {
  try { return await readJson(relativePath); } catch { return null; }
};

const input = collectExternalTargetInput();
const inspected = inspectExternalTargetInput(input);
const authEvidence = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_CONTROL_PLANE_AUTHENTICATION_REVALIDATION_v1.0.json',
);
const migrations = (await fs.readdir(path.join(root, 'infra/database/migrations')))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.includes('_rollback'))
  .sort();
const providerAuthenticationFresh = isFreshProviderAuthentication(authEvidence);

const blockers = [];
if (!inspected.complete) blockers.push('EXTERNAL_DEPLOYMENT_TARGET_REFERENCE');
if (!providerAuthenticationFresh) blockers.push('CLOUDFLARE_PROVIDER_AUTHENTICATION_REFRESH');
blockers.push('CLOUDFLARE_WORKERS_PAID_PLAN_CAPABILITY_NOT_VERIFIED');
blockers.push('MANAGED_POSTGRESQL_TARGET_NOT_CONNECTED');

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  workstream_id: 'D80-10',
  collected_at: new Date().toISOString(),
  decision: 'HOLD',
  status: 'CANDIDATE_ARCHITECTURE_SELECTED_EXTERNAL_TARGET_INPUT_PENDING',
  candidate_architecture: {
    api_runtime: 'CLOUDFLARE_CONTAINERS',
    database: 'EXTERNAL_MANAGED_POSTGRESQL',
    database_connection: 'DIRECT_TLS_FROM_CONTAINER',
    frontend_bridge: 'CLOUDFLARE_WORKER_API_ORIGIN',
    environment_code: 'DEVELOPMENT',
    rationale: 'PRESERVE_EXISTING_NODE_HTTP_AND_PG_RUNTIME_WITH_MINIMAL_REWRITE',
    provider_code_allowlist: [...ALLOWED_EXTERNAL_TARGET_PROVIDERS],
  },
  input_validation: {
    complete: inspected.complete,
    checks: inspected.checks,
    missing_fields: inspected.missing_fields,
    values_stored: false,
  },
  local_compatibility: {
    node_api_container_present: true,
    container_port: 8080,
    node_runtime: '24-alpine',
    postgresql_driver: 'pg@^8.16.3',
    forward_migrations_present: migrations.length,
    expected_forward_migrations: 40,
    migration_range_complete: migrations.length === 40
      && migrations[0]?.startsWith('0001_')
      && migrations.at(-1)?.startsWith('0040_'),
  },
  provider_preflight: {
    authentication_fresh: providerAuthenticationFresh,
    latest_authentication_status: authEvidence?.status || 'MISSING',
    workers_paid_plan_verified: false,
    containers_capability_verified: false,
    managed_postgresql_connection_verified: false,
  },
  blockers,
  next_input: inspected.complete
    ? 'CLOUDFLARE_PROVIDER_AUTHENTICATION_REFRESH'
    : 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE',
  required_fields: [
    'target_reference',
    'provider_code',
    'environment_code',
    'connection_reference',
  ],
  external_actions: {
    account_plan_changed: false,
    container_created: false,
    database_created: false,
    secret_created_or_read: false,
    deployment_performed: false,
  },
  credential_boundary: {
    raw_target_stored: false,
    raw_connection_string_stored: false,
    credential_value_accessed: false,
    credential_value_stored: false,
  },
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log('GATE8_EXTERNAL_API_POSTGRES_TARGET_PREFLIGHT_HOLD');
console.log(`target_input=${inspected.complete ? 'COMPLETE' : 'INCOMPLETE'} missing_fields=${inspected.missing_fields.length}`);
console.log(`migrations=${migrations.length}/40 provider_auth_fresh=${providerAuthenticationFresh}`);
console.log(`next_input=${evidence.next_input}`);
process.exitCode = 1;
