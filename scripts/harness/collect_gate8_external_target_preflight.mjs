import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_EXTERNAL_TARGET_PROVIDERS,
  EXPECTED_FORWARD_MIGRATIONS,
  collectExternalTargetInput,
  inspectExternalTargetInput,
  inspectExternalTargetRuntimeEvidence,
  isFreshProviderAuthentication,
  verifyExternalTargetRuntimeEvidence,
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
const runtimeEvidence = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_FULL_STACK_DEVELOPMENT_EVIDENCE_v1.0.json',
);
const migrations = (await fs.readdir(path.join(root, 'infra/database/migrations')))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.includes('_rollback'))
  .sort();
const providerAuthenticationFresh = isFreshProviderAuthentication(authEvidence);
const runtimeChecks = inspectExternalTargetRuntimeEvidence(runtimeEvidence, input);
const runtimeEvidenceVerified = verifyExternalTargetRuntimeEvidence(runtimeEvidence, input);

const blockers = [];
if (!inspected.complete) blockers.push('EXTERNAL_DEPLOYMENT_TARGET_REFERENCE');
if (!providerAuthenticationFresh) blockers.push('CLOUDFLARE_PROVIDER_AUTHENTICATION_REFRESH');
if (runtimeChecks?.hyperdrive_configuration_verified !== true) {
  blockers.push('CLOUDFLARE_HYPERDRIVE_CONFIGURATION_NOT_VERIFIED');
}
if (runtimeChecks?.managed_postgresql_connection_verified !== true) {
  blockers.push('MANAGED_POSTGRESQL_TARGET_NOT_CONNECTED');
}
if (runtimeChecks?.migrations_current !== true) {
  blockers.push('EXTERNAL_DATABASE_MIGRATION_0041_NOT_APPLIED');
}
if (runtimeChecks?.cpu_budget_measured !== true) {
  blockers.push('CLOUDFLARE_WORKERS_FREE_CPU_BUDGET_NOT_MEASURED');
}
if (runtimeChecks && [
  runtimeChecks.evidence_envelope_valid,
  runtimeChecks.target_matches,
  runtimeChecks.worker_deployed,
  runtimeChecks.schema_verified,
  runtimeChecks.http_ready,
  runtimeChecks.runtime_connected,
  runtimeChecks.credential_boundary_preserved,
].some((check) => check !== true)) blockers.push('EXTERNAL_RUNTIME_REVALIDATION_REQUIRED');
const allReady = blockers.length === 0;

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  workstream_id: 'D80-10',
  collected_at: new Date().toISOString(),
  decision: allReady ? 'PASS' : 'HOLD',
  status: allReady
    ? 'PASS_EXTERNAL_API_POSTGRES_TARGET_VERIFIED'
    : inspected.complete
      ? 'HOLD_EXTERNAL_API_POSTGRES_RUNTIME_GATES'
      : 'FREE_TIER_CANDIDATE_ARCHITECTURE_SELECTED_EXTERNAL_TARGET_INPUT_PENDING',
  candidate_architecture: {
    api_runtime: 'CLOUDFLARE_WORKERS_FREE',
    database: 'EXTERNAL_MANAGED_POSTGRESQL',
    database_connection: 'CLOUDFLARE_HYPERDRIVE_FREE',
    frontend_bridge: 'SAME_WORKER_EMBEDDED_API',
    environment_code: 'DEVELOPMENT',
    rationale: 'REUSE_EXISTING_NODE_HTTP_SERVER_WITH_CLOUDFLARE_NODE_COMPATIBILITY_AND_HYPERDRIVE',
    provider_code_allowlist: [...ALLOWED_EXTERNAL_TARGET_PROVIDERS],
  },
  input_validation: {
    complete: inspected.complete,
    checks: inspected.checks,
    missing_fields: inspected.missing_fields,
    values_stored: false,
  },
  local_compatibility: {
    existing_node_api_reused: true,
    node_http_adapter: 'cloudflare:node/httpServerHandler',
    node_compatibility_flag: 'nodejs_compat',
    postgresql_driver: 'pg@^8.16.3',
    forward_migrations_present: migrations.length,
    expected_forward_migrations: EXPECTED_FORWARD_MIGRATIONS,
    migration_range_complete: migrations.length === EXPECTED_FORWARD_MIGRATIONS
      && migrations[0]?.startsWith('0001_')
      && migrations.at(-1)?.startsWith('0041_'),
  },
  provider_preflight: {
    authentication_fresh: providerAuthenticationFresh,
    latest_authentication_status: authEvidence?.status || 'MISSING',
    workers_free_runtime_selected: true,
    workers_free_cpu_budget_measured: runtimeChecks?.cpu_budget_measured === true,
    workers_free_cpu_budget_risk: runtimeChecks?.cpu_budget_measured === true
      ? runtimeEvidence?.cpu_budget?.risk || null
      : null,
    hyperdrive_free_configuration_verified: runtimeChecks?.hyperdrive_configuration_verified === true,
    managed_postgresql_connection_verified: runtimeChecks?.managed_postgresql_connection_verified === true,
    migrations_current: runtimeChecks?.migrations_current === true,
    runtime_evidence_verified: runtimeEvidenceVerified,
  },
  blockers,
  next_input: !inspected.complete
    ? 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE'
    : !providerAuthenticationFresh
      ? 'CLOUDFLARE_PROVIDER_AUTHENTICATION_REFRESH'
      : blockers[0] || null,
  required_fields: [
    'target_reference',
    'provider_code',
    'environment_code',
    'connection_reference',
  ],
  external_actions: {
    account_plan_changed: false,
    worker_created: runtimeEvidenceVerified,
    hyperdrive_configuration_created: runtimeEvidenceVerified,
    database_created: runtimeEvidenceVerified,
    secret_created_or_read: runtimeEvidenceVerified,
    deployment_performed: runtimeEvidenceVerified,
  },
  credential_boundary: {
    raw_target_stored: false,
    raw_connection_string_stored: false,
    credential_value_accessed: runtimeEvidenceVerified,
    credential_value_stored: false,
  },
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(`GATE8_EXTERNAL_API_POSTGRES_TARGET_PREFLIGHT_${allReady ? 'PASS' : 'HOLD'}`);
console.log(`target_input=${inspected.complete ? 'COMPLETE' : 'INCOMPLETE'} missing_fields=${inspected.missing_fields.length}`);
console.log(`migrations=${migrations.length}/${EXPECTED_FORWARD_MIGRATIONS} provider_auth_fresh=${providerAuthenticationFresh}`);
console.log(`next_input=${evidence.next_input}`);
if (!allReady) process.exitCode = 1;
