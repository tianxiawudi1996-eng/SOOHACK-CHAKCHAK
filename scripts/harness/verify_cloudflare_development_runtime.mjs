import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  hostnameSha256,
  inspectHttpsBaseUrl,
} from './lib/gate8_external_preflight_contract.mjs';

const root = process.cwd();
const outputPath = path.join(
  root,
  'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_RUNTIME_VERIFICATION_v1.0.json',
);
const rawBaseUrl = process.env.MATHCHAKCHAK_EXTERNAL_BASE_URL;
const inspected = inspectHttpsBaseUrl(rawBaseUrl);

if (!inspected.valid) {
  console.error('CLOUDFLARE_DEVELOPMENT_RUNTIME_VERIFY_FAIL invalid_https_base_url');
  process.exit(1);
}

const baseUrl = new URL(rawBaseUrl.trim());
baseUrl.pathname = '/';
baseUrl.search = '';
baseUrl.hash = '';

const checkDefinitions = [
  ['root', '/', 200],
  ['curriculum_e4_ko', '/curriculum/?locale=ko&grade=E4', 200],
  ['readyz', '/readyz', 200],
  ['api_not_connected', '/api/v1/locales', 503],
];

const checks = {};
const responses = {};
let networkFailure = null;

for (const [name, relativeUrl, expectedStatus] of checkDefinitions) {
  try {
    const response = await fetch(new URL(relativeUrl, baseUrl), {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    checks[name] = response.status;
    responses[name] = {
      expected_status: expectedStatus,
      passed: response.status === expectedStatus,
      headers: {
        x_frame_options: response.headers.get('x-frame-options'),
        x_content_type_options: response.headers.get('x-content-type-options'),
        content_security_policy: response.headers.get('content-security-policy'),
      },
    };
    if (name === 'readyz' || name === 'api_not_connected') {
      responses[name].json = await response.json();
    }
  } catch (error) {
    networkFailure = `${name}:${error?.name || 'Error'}`;
    checks[name] = null;
    responses[name] = { expected_status: expectedStatus, passed: false };
    break;
  }
}

const readyz = responses.readyz?.json || {};
const apiError = responses.api_not_connected?.json?.error || {};
const securityHeadersPass = ['root', 'curriculum_e4_ko', 'readyz', 'api_not_connected']
  .every((name) => responses[name]?.headers?.x_frame_options === 'DENY'
    && responses[name]?.headers?.x_content_type_options === 'nosniff'
    && /frame-ancestors\s+'none'/.test(responses[name]?.headers?.content_security_policy || ''));
const statusPass = checkDefinitions.every(([name, , expectedStatus]) => checks[name] === expectedStatus);
const truthPass = readyz.status === 'FRONTEND_PREVIEW_READY'
  && readyz.frontend === 'READY'
  && readyz.api === 'BLOCKED_EXTERNAL'
  && readyz.api_bridge === 'NOT_CONFIGURED'
  && readyz.database === 'BLOCKED_EXTERNAL'
  && readyz.production_release === false
  && apiError.code === 'API_NOT_CONNECTED';
const passed = !networkFailure && statusPass && truthPass && securityHeadersPass;

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  environment: 'development',
  checked_at: new Date().toISOString(),
  status: passed ? 'PASS_EXTERNAL_FRONTEND_PREVIEW' : 'FAIL_EXTERNAL_RUNTIME_VERIFICATION',
  source_reference: 'USER_CONFIRMED_EXTERNAL_DEVELOPMENT_URL',
  endpoint: {
    public_https_url: baseUrl.toString().replace(/\/$/, ''),
    hostname_sha256: hostnameSha256(baseUrl.hostname),
  },
  http_checks: checks,
  security_headers: {
    status: securityHeadersPass ? 'PASS' : 'FAIL',
    x_frame_options_deny: securityHeadersPass,
    x_content_type_options_nosniff: securityHeadersPass,
    csp_frame_ancestors_none: securityHeadersPass,
  },
  runtime_truth: {
    frontend_publicly_reachable: statusPass,
    api_bridge_deployed: readyz.api_bridge === 'NOT_CONFIGURED',
    api_bridge_status: readyz.api_bridge || null,
    api_connected: false,
    postgresql_connected: false,
    production_release: false,
  },
  failures: [networkFailure, statusPass ? null : 'HTTP_STATUS_MISMATCH', truthPass ? null : 'RUNTIME_TRUTH_MISMATCH', securityHeadersPass ? null : 'SECURITY_HEADERS_MISMATCH'].filter(Boolean),
  credential_boundary: {
    credential_value_accessed: false,
    credential_value_stored: false,
  },
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(`CLOUDFLARE_DEVELOPMENT_RUNTIME_VERIFY_${passed ? 'PASS' : 'FAIL'}`);
console.log(`root=${checks.root} curriculum=${checks.curriculum_e4_ko} readyz=${checks.readyz} api=${checks.api_not_connected}`);
console.log(`full_product_ready=${String(evidence.runtime_truth.api_connected && evidence.runtime_truth.postgresql_connected)}`);
if (!passed) process.exit(1);
