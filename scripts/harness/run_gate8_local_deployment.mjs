#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPOSE_FILE = 'infra/deployment/compose.api-staging.yaml';
const OUTPUT_PATH = path.join(ROOT, 'docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json');
const WEB_URL = 'http://127.0.0.1:4180';
const API_URL = 'http://127.0.0.1:4181';
const LOCALES = ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru'];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function commandRecord(id, executable, args, env) {
  const started = performance.now();
  const execution = spawnSync(executable, args, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${execution.stdout || ''}${execution.stderr || ''}`;
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return {
    id,
    command: [executable, ...args].join(' '),
    duration_ms: Math.round(performance.now() - started),
    exit_code: execution.status ?? 1,
    status: execution.status === 0 ? 'PASS' : 'FAIL',
    output_sha256: sha256(Buffer.from(output)),
    output_tail: lines.slice(-10),
    spawn_error: execution.error?.message || null,
  };
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(4000) });
}

async function waitForStack() {
  const attempts = [];
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const [api, web] = await Promise.all([
        fetchWithTimeout(`${API_URL}/readyz`),
        fetchWithTimeout(`${WEB_URL}/?locale=ko`),
      ]);
      attempts.push({ attempt, api: api.status, web: web.status });
      if (api.ok && web.ok) return { status: 'PASS', attempts };
    } catch (error) {
      attempts.push({ attempt, error: error.name });
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
  }
  return { status: 'FAIL', attempts };
}

async function verifyPortsClosed() {
  const observations = {};
  for (const [name, url] of Object.entries({ web: `${WEB_URL}/`, api: `${API_URL}/readyz` })) {
    try {
      const response = await fetchWithTimeout(url);
      observations[name] = { closed: false, status: response.status };
    } catch (error) {
      observations[name] = { closed: true, error: error.name };
    }
  }
  return observations;
}

async function waitForContainerHealth(env) {
  const names = [
    'mathchakchak-staging-v010',
    'mathchakchak-api-staging-api-1',
    'mathchakchak-api-staging-database-1',
  ];
  const attempts = [];
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const containers = names.map((name) => inspectContainer(name, env));
    attempts.push({ attempt, containers });
    if (containers.every((container) => container.status === 'PASS' && container.health === 'healthy')) {
      return { status: 'PASS', attempts, containers };
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return { status: 'FAIL', attempts, containers: names.map((name) => inspectContainer(name, env)) };
}

function inspectContainer(name, env) {
  const result = spawnSync('docker', ['inspect', '--format', '{{.Id}}|{{.Image}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', name], {
    cwd: ROOT, env, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) return { name, status: 'MISSING' };
  const [containerId, imageId, health] = result.stdout.trim().split('|');
  return { name, container_id: containerId, image_id: imageId, health, status: 'PASS' };
}

async function deployedArtifactAudit(manifest) {
  const failures = [];
  for (const file of manifest.files) {
    const urlPath = file.path.replace(/^site\//, '/');
    const response = await fetchWithTimeout(`${WEB_URL}${urlPath}`);
    if (!response.ok) {
      failures.push({ path: file.path, status: response.status });
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      failures.push({ path: file.path, status: response.status, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
  return { status: failures.length === 0 ? 'PASS' : 'FAIL', verified: manifest.file_count - failures.length, expected: manifest.file_count, failures };
}

const release = JSON.parse(await fs.readFile(path.join(ROOT, 'artifacts/release-candidate/stage8-v1.0/release-manifest.json'), 'utf8'));
const artifactManifest = JSON.parse(await fs.readFile(path.join(ROOT, 'artifacts/staging/v0.1.0/manifest.json'), 'utf8'));
const gate7 = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json'), 'utf8'));
const ephemeralSecret = randomBytes(48).toString('base64');
const env = {
  ...process.env,
  MATHCHAKCHAK_STAGE_SESSION_SECRET: ephemeralSecret,
  TEST_SESSION_HMAC_SECRET: ephemeralSecret,
  API_BASE_URL: API_URL,
};
const commands = [];
const failures = [];

if (gate7.status !== 'VERIFIED' || gate7.release_candidate_sha256 !== release.rc_sha256) failures.push('GATE7_PREREQUISITE_INVALID');
if (release.status !== 'FROZEN') failures.push('RELEASE_CANDIDATE_NOT_FROZEN');

const initialDown = commandRecord('initial_isolated_reset', 'docker', ['compose', '-f', COMPOSE_FILE, 'down'], env);
commands.push(initialDown);
if (initialDown.status !== 'PASS') failures.push('INITIAL_RESET_FAILED');

const deploy = commandRecord('local_deploy', 'docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d'], env);
commands.push(deploy);
if (deploy.status !== 'PASS') failures.push('LOCAL_DEPLOY_FAILED');

const firstHealth = failures.length === 0 ? await waitForStack() : { status: 'SKIPPED', attempts: [] };
if (firstHealth.status !== 'PASS') failures.push('INITIAL_HEALTH_FAILED');
const firstContainerHealth = firstHealth.status === 'PASS' ? await waitForContainerHealth(env) : { status: 'SKIPPED', attempts: [], containers: [] };
const containersBefore = firstContainerHealth.containers;
if (firstContainerHealth.status !== 'PASS') failures.push('CONTAINER_HEALTH_INVALID');

const localeResults = [];
for (const locale of LOCALES) {
  const response = await fetchWithTimeout(`${WEB_URL}/?locale=${encodeURIComponent(locale)}`);
  localeResults.push({ locale, status_code: response.status, status: response.ok ? 'PASS' : 'FAIL' });
}
if (localeResults.some((item) => item.status !== 'PASS')) failures.push('LOCALE_SMOKE_FAILED');

const webResponse = await fetchWithTimeout(`${WEB_URL}/?locale=ko`);
const securityHeaders = {
  content_security_policy: Boolean(webResponse.headers.get('content-security-policy')),
  x_content_type_options: webResponse.headers.get('x-content-type-options'),
  x_frame_options: webResponse.headers.get('x-frame-options'),
  referrer_policy: webResponse.headers.get('referrer-policy'),
  permissions_policy: Boolean(webResponse.headers.get('permissions-policy')),
  cross_origin_opener_policy: webResponse.headers.get('cross-origin-opener-policy'),
};
const securityHeadersPass = securityHeaders.content_security_policy
  && securityHeaders.x_content_type_options === 'nosniff'
  && securityHeaders.x_frame_options === 'DENY'
  && securityHeaders.referrer_policy === 'strict-origin-when-cross-origin'
  && securityHeaders.permissions_policy
  && securityHeaders.cross_origin_opener_policy === 'same-origin';
if (!securityHeadersPass) failures.push('SECURITY_HEADERS_FAILED');

const artifactAudit = await deployedArtifactAudit(artifactManifest);
if (artifactAudit.status !== 'PASS') failures.push('DEPLOYED_ARTIFACT_HASH_FAILED');

for (const [id, executable, args] of [
  ['operations_runtime', process.execPath, ['scripts/productization/check_operations_runtime.mjs']],
  ['core_user_journey', process.execPath, ['--test', 'tests/integration/api-core-journey.test.mjs']],
  ['rc_integrity', process.execPath, ['scripts/harness/audit_gate6_release_candidate.mjs']],
]) {
  const result = commandRecord(id, executable, args, env);
  commands.push(result);
  if (result.status !== 'PASS') failures.push(`SMOKE_COMMAND_FAILED:${id}`);
}

const imagesBefore = Object.fromEntries(containersBefore.map((container) => [container.name, container.image_id]));
const rollbackDown = commandRecord('rollback_remove_local_stack', 'docker', ['compose', '-f', COMPOSE_FILE, 'down'], env);
commands.push(rollbackDown);
if (rollbackDown.status !== 'PASS') failures.push('ROLLBACK_DOWN_FAILED');
const portsAfterDown = await verifyPortsClosed();
if (!Object.values(portsAfterDown).every((item) => item.closed === true)) failures.push('ROLLBACK_PORT_CLOSURE_FAILED');

const redeploy = commandRecord('rollback_redeploy_same_images', 'docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d'], env);
commands.push(redeploy);
if (redeploy.status !== 'PASS') failures.push('ROLLBACK_REDEPLOY_FAILED');
const postHealth = redeploy.status === 'PASS' ? await waitForStack() : { status: 'SKIPPED', attempts: [] };
if (postHealth.status !== 'PASS') failures.push('POST_ROLLBACK_HEALTH_FAILED');
const postContainerHealth = postHealth.status === 'PASS' ? await waitForContainerHealth(env) : { status: 'SKIPPED', attempts: [], containers: [] };
const containersAfter = postContainerHealth.containers;
const sameImages = containersAfter.every((container) => imagesBefore[container.name] === container.image_id);
if (!sameImages || postContainerHealth.status !== 'PASS') failures.push('ROLLBACK_IMAGE_OR_HEALTH_MISMATCH');

const postSmoke = commandRecord('post_rollback_operations_runtime', process.execPath, ['scripts/productization/check_operations_runtime.mjs'], env);
commands.push(postSmoke);
if (postSmoke.status !== 'PASS') failures.push('POST_ROLLBACK_SMOKE_FAILED');

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  tested_at: new Date().toISOString(),
  status: failures.length === 0 ? 'PASS_LOCAL_DEPLOYMENT' : 'FAIL',
  result: failures.length === 0 ? 'LOCAL_DEPLOYMENT_HEALTH_SMOKE_ROLLBACK_PASS' : 'LOCAL_DEPLOYMENT_FAIL',
  release_candidate_sha256: release.rc_sha256,
  target: {
    type: 'DOCKER_LOCAL_ISOLATED',
    web_url: `${WEB_URL}/?locale=ko`,
    api_url: API_URL,
    production_data_used: false,
    production_traffic_used: false,
  },
  commands,
  initial_health: { http: firstHealth, containers: firstContainerHealth },
  containers_before_rollback: containersBefore,
  locale_smoke: { status: localeResults.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL', results: localeResults },
  security_headers: { status: securityHeadersPass ? 'PASS' : 'FAIL', ...securityHeaders },
  deployed_artifact: artifactAudit,
  rollback_rehearsal: {
    status: rollbackDown.status === 'PASS' && Object.values(portsAfterDown).every((item) => item.closed) && redeploy.status === 'PASS' && postHealth.status === 'PASS' && postContainerHealth.status === 'PASS' && sameImages && postSmoke.status === 'PASS' ? 'PASS' : 'FAIL',
    ports_after_down: portsAfterDown,
    same_images_redeployed: sameImages,
    post_redeploy_health: { http: postHealth.status, containers: postContainerHealth.status },
    containers_after_redeploy: containersAfter,
  },
  external_deployment: {
    performed: false,
    target_reference: null,
    authorization_reference: null,
    canary_result: null,
    production_release_authorized: false,
    blocker: 'EXTERNAL_DEPLOYMENT_TARGET_AND_AUTHORIZATION_NOT_CONFIGURED',
  },
  secret_handling: {
    ephemeral_secret_generated_in_memory: true,
    secret_written_to_file: false,
    secret_included_in_evidence: false,
  },
  failures,
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`GATE8_LOCAL_DEPLOYMENT_${evidence.status}`);
console.log(`artifact=${artifactAudit.verified}/${artifactAudit.expected} locales=${localeResults.filter((item) => item.status === 'PASS').length}/${LOCALES.length}`);
console.log(`rollback=${evidence.rollback_rehearsal.status} external_deployment=false`);
process.exitCode = evidence.status === 'PASS_LOCAL_DEPLOYMENT' ? 0 : 1;
