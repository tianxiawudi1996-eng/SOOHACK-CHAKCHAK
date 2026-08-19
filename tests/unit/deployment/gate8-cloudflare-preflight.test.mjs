import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLOWED_DEPLOYMENT_ADAPTERS,
  inspectHttpsBaseUrl,
  runtimeContextBlocker,
  runtimeContextConfigured,
  verifyCloudflareRuntimeEvidence,
} from '../../../scripts/harness/lib/gate8_external_preflight_contract.mjs';

const publicUrl = 'https://dev.mathchakchak-product.workers.dev';
const inspected = inspectHttpsBaseUrl(publicUrl);
const runtimeEvidence = {
  schema_version: '1.0.0',
  status: 'PASS_EXTERNAL_FRONTEND_PREVIEW',
  endpoint: { public_https_url: publicUrl },
  http_checks: {
    root: 200,
    curriculum_e4_ko: 200,
    readyz: 200,
    api_not_connected: 503,
  },
  runtime_truth: {
    frontend_publicly_reachable: true,
    api_connected: false,
    postgresql_connected: false,
    production_release: false,
  },
};

test('Cloudflare Workers is an explicit Gate 8 deployment adapter', () => {
  assert.equal(ALLOWED_DEPLOYMENT_ADAPTERS.has('cloudflare_workers'), true);
  assert.equal(inspected.valid, true);
});

test('Cloudflare runtime evidence must match the configured public hostname', () => {
  assert.equal(verifyCloudflareRuntimeEvidence(runtimeEvidence, inspected.hostname_sha256), true);
  const other = inspectHttpsBaseUrl('https://other.workers.dev');
  assert.equal(verifyCloudflareRuntimeEvidence(runtimeEvidence, other.hostname_sha256), false);
});

test('Cloudflare full-stack runtime evidence is accepted when API and PostgreSQL are ready', () => {
  const fullStackEvidence = {
    schema_version: '1.0.0',
    status: 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME',
    endpoint: {public_https_url: publicUrl},
    http_checks: {root: 200, curriculum_e4_ko: 200, readyz: 200, api_locales: 200},
    runtime_truth: {
      frontend_publicly_reachable: true,
      api_connected: true,
      postgresql_connected: true,
      production_release: false,
    },
  };
  assert.equal(verifyCloudflareRuntimeEvidence(fullStackEvidence, inspected.hostname_sha256), true);
});

test('Cloudflare uses runtime evidence instead of a Docker context', () => {
  assert.equal(runtimeContextConfigured('cloudflare_workers', {
    deployment_adapter: true,
    external_docker_context: false,
    cloudflare_runtime_evidence: true,
  }), true);
  assert.equal(runtimeContextBlocker('cloudflare_workers'), 'CLOUDFLARE_RUNTIME_EVIDENCE');
});
