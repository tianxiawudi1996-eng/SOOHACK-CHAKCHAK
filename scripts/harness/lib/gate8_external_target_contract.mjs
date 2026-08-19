export const REQUIRED_EXTERNAL_TARGET_FIELDS = Object.freeze([
  'target_reference',
  'provider_code',
  'environment_code',
  'connection_reference',
]);

export const ALLOWED_EXTERNAL_TARGET_PROVIDERS = new Set([
  'CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL',
  'CLOUDFLARE_WORKERS_HYPERDRIVE_SUPABASE_POSTGRESQL',
  'CLOUDFLARE_WORKERS_HYPERDRIVE_AWS_RDS_POSTGRESQL',
]);

export const EXPECTED_FORWARD_MIGRATIONS = 41;

const REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9._:-]{7,127}$/;

export function validInternalReference(value) {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value.trim());
}

export function collectExternalTargetInput(env = process.env) {
  return {
    target_reference: env.MATHCHAKCHAK_EXTERNAL_TARGET_REFERENCE?.trim() || null,
    provider_code: env.MATHCHAKCHAK_EXTERNAL_PROVIDER_CODE?.trim() || null,
    environment_code: env.MATHCHAKCHAK_EXTERNAL_ENVIRONMENT_CODE?.trim() || null,
    connection_reference: env.MATHCHAKCHAK_EXTERNAL_CONNECTION_REFERENCE?.trim() || null,
  };
}

export function inspectExternalTargetInput(input) {
  const checks = {
    target_reference: validInternalReference(input?.target_reference),
    provider_code: ALLOWED_EXTERNAL_TARGET_PROVIDERS.has(input?.provider_code),
    environment_code: input?.environment_code === 'DEVELOPMENT',
    connection_reference: validInternalReference(input?.connection_reference),
  };
  const missingFields = REQUIRED_EXTERNAL_TARGET_FIELDS.filter((field) => checks[field] !== true);
  return {
    checks,
    complete: missingFields.length === 0,
    missing_fields: missingFields,
    next_input: missingFields[0]?.toUpperCase() || null,
  };
}

export function isFreshProviderAuthentication(evidence, now = Date.now(), maxAgeMs = 4 * 60 * 60 * 1000) {
  if (evidence?.status !== 'PASS' || evidence?.provider_account_authenticated !== true) return false;
  const checkedAt = Date.parse(evidence.checked_at);
  return Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= maxAgeMs;
}

export function inspectExternalTargetRuntimeEvidence(evidence, expectedTarget) {
  if (!evidence || !expectedTarget) return null;
  const targetMatches = REQUIRED_EXTERNAL_TARGET_FIELDS
    .every((field) => evidence.target?.[field] === expectedTarget[field]);
  const httpReady = ['root', 'curriculum_e4_ko', 'readyz', 'api_locales']
    .every((name) => evidence.http_checks?.[name] === 200);

  return {
    evidence_envelope_valid: evidence.schema_version === '1.0.0'
      && evidence.status === 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME'
      && evidence.environment_code === 'DEVELOPMENT',
    target_matches: targetMatches,
    hyperdrive_configuration_verified: evidence.cloudflare?.hyperdrive_configuration_verified === true,
    worker_deployed: evidence.cloudflare?.worker_deployed === true,
    managed_postgresql_connection_verified: evidence.database?.managed_postgresql_connection_verified === true,
    migrations_current: evidence.database?.forward_migrations_applied === EXPECTED_FORWARD_MIGRATIONS,
    schema_verified: Number.isInteger(evidence.database?.schema_table_count)
      && evidence.database.schema_table_count > 0
      && evidence.database?.first_table_present === true
      && evidence.database?.final_table_present === true,
    http_ready: httpReady,
    runtime_connected: evidence.runtime_truth?.api_connected === true
      && evidence.runtime_truth?.postgresql_connected === true
      && evidence.runtime_truth?.production_release === false,
    cpu_budget_measured: evidence.cpu_budget?.measured === true
      && Number.isInteger(evidence.cpu_budget?.sample_count)
      && evidence.cpu_budget.sample_count > 0
      && evidence.cpu_budget?.outcome_ok === evidence.cpu_budget.sample_count
      && evidence.cpu_budget?.outcome_exceeded_cpu === 0,
    credential_boundary_preserved: evidence.credential_boundary?.raw_connection_string_stored === false
      && evidence.credential_boundary?.credential_value_stored === false,
  };
}

export function verifyExternalTargetRuntimeEvidence(evidence, expectedTarget) {
  const checks=inspectExternalTargetRuntimeEvidence(evidence,expectedTarget);
  return checks !== null && Object.values(checks).every(Boolean);
}
