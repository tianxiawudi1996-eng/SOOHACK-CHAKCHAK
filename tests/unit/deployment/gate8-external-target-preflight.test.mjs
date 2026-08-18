import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLOWED_EXTERNAL_TARGET_PROVIDERS,
  inspectExternalTargetInput,
  isFreshProviderAuthentication,
  validInternalReference,
} from '../../../scripts/harness/lib/gate8_external_target_contract.mjs';

test('external target accepts only metadata references and the development environment', () => {
  const inspected = inspectExternalTargetInput({
    target_reference: 'MCC-CF-CONTAINERS-DEV-2026-001',
    provider_code: 'CLOUDFLARE_CONTAINERS_NEON_POSTGRESQL',
    environment_code: 'DEVELOPMENT',
    connection_reference: 'MCC-PG-DEV-CONNECTION-2026-001',
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
