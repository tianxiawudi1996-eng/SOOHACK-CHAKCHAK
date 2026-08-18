export const REQUIRED_EXTERNAL_TARGET_FIELDS = Object.freeze([
  'target_reference',
  'provider_code',
  'environment_code',
  'connection_reference',
]);

export const ALLOWED_EXTERNAL_TARGET_PROVIDERS = new Set([
  'CLOUDFLARE_CONTAINERS_NEON_POSTGRESQL',
  'CLOUDFLARE_CONTAINERS_SUPABASE_POSTGRESQL',
  'CLOUDFLARE_CONTAINERS_AWS_RDS_POSTGRESQL',
]);

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
