import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLOWED_EXTERNAL_TARGET_PROVIDERS,
  inspectExternalTargetInput,
  inspectExternalTargetRuntimeEvidence,
  isFreshProviderAuthentication,
  validInternalReference,
  verifyExternalTargetRuntimeEvidence,
} from '../../../scripts/harness/lib/gate8_external_target_contract.mjs';

const verifiedTarget = {
  target_reference: 'MCC-CF-WORKER-FREE-DEV-2026-001',
  provider_code: 'CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL',
  environment_code: 'DEVELOPMENT',
  connection_reference: 'MCC-NEON-PG-DEV-2026-001',
};

test('external target accepts only metadata references and the development environment', () => {
  const inspected = inspectExternalTargetInput({
    target_reference: 'MCC-CF-WORKER-FREE-DEV-2026-001',
    provider_code: 'CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL',
    environment_code: 'DEVELOPMENT',
    connection_reference: 'MCC-NEON-PG-DEV-2026-001',
  });
  assert.equal(inspected.complete, true);
  assert.deepEqual(inspected.missing_fields, []);
  assert.equal(ALLOWED_EXTERNAL_TARGET_PROVIDERS.size, 3);
});

test('external target rejects endpoints, secrets, and unsupported providers', () => {
  assert.equal(validInternalReference('https://db.example.com'), false);
  assert.equal(validInternalReference('postgres://user:secret@host/db'), false);
  const inspected = inspectExternalTargetInput({
    target_reference: 'short',
    provider_code: 'UNVERIFIED_PROVIDER',
    environment_code: 'PRODUCTION',
    connection_reference: null,
  });
  assert.equal(inspected.complete, false);
  assert.deepEqual(inspected.missing_fields, [
    'target_reference', 'provider_code', 'environment_code', 'connection_reference',
  ]);
});

test('provider authentication must be successful and recent', () => {
  const now = Date.parse('2026-08-18T01:00:00.000Z');
  assert.equal(isFreshProviderAuthentication({
    status: 'PASS',
    provider_account_authenticated: true,
    checked_at: '2026-08-18T00:30:00.000Z',
  }, now), true);
  assert.equal(isFreshProviderAuthentication({
    status: 'PASS',
    provider_account_authenticated: true,
    checked_at: '2026-08-17T00:30:00.000Z',
  }, now), false);
  assert.equal(isFreshProviderAuthentication({
    status: 'BLOCKED_EXTERNAL',
    provider_account_authenticated: false,
    checked_at: '2026-08-18T00:30:00.000Z',
  }, now), false);
});

test('external target runtime evidence proves Hyperdrive, PostgreSQL migrations, and CPU measurement', () => {
  const evidence = {
    schema_version: '1.0.0',
    status: 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME',
    environment_code: 'DEVELOPMENT',
    target: verifiedTarget,
    cloudflare: {
      hyperdrive_configuration_verified: true,
      worker_deployed: true,
    },
    database: {
      managed_postgresql_connection_verified: true,
      forward_migrations_applied: 41,
      schema_table_count: 140,
      first_table_present: true,
      final_table_present: true,
    },
    http_checks: {root: 200, curriculum_e4_ko: 200, readyz: 200, api_locales: 200},
    runtime_truth: {api_connected: true, postgresql_connected: true, production_release: false},
    cpu_budget: {measured: true, sample_count: 15, outcome_ok: 15, outcome_exceeded_cpu: 0},
    credential_boundary: {raw_connection_string_stored: false, credential_value_stored: false},
  };

  assert.equal(verifyExternalTargetRuntimeEvidence(evidence, verifiedTarget), true);
  const staleMigrationEvidence={
    ...evidence,
    database: {...evidence.database, forward_migrations_applied: 40},
  };
  assert.equal(verifyExternalTargetRuntimeEvidence(staleMigrationEvidence, verifiedTarget), false);
  assert.deepEqual(inspectExternalTargetRuntimeEvidence(staleMigrationEvidence, verifiedTarget), {
    evidence_envelope_valid: true,
    target_matches: true,
    hyperdrive_configuration_verified: true,
    worker_deployed: true,
    managed_postgresql_connection_verified: true,
    migrations_current: false,
    schema_verified: true,
    http_ready: true,
    runtime_connected: true,
    cpu_budget_measured: true,
    credential_boundary_preserved: true,
  });
  assert.equal(verifyExternalTargetRuntimeEvidence({
    ...evidence,
    database: {...evidence.database, final_table_present: false},
  }, verifiedTarget), false);
  assert.equal(verifyExternalTargetRuntimeEvidence(evidence, {
    ...verifiedTarget,
    connection_reference: 'MCC-OTHER-PG-DEV-2026-001',
  }), false);
});
