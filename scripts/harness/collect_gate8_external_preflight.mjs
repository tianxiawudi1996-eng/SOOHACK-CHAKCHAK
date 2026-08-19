import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_DEPLOYMENT_ADAPTERS,
  inspectHttpsBaseUrl,
  runtimeContextBlocker,
  runtimeContextConfigured,
  verifyCloudflareRuntimeEvidence,
} from './lib/gate8_external_preflight_contract.mjs';
import { isFreshProviderAuthentication } from './lib/gate8_external_target_contract.mjs';

const root = process.cwd();
const outputPath = path.join(root, 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    env: process.env,
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: String(result.stdout || '').trim(),
  };
}

function parseRepoSlug(remoteUrl) {
  const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return match?.[1] || null;
}

function present(name) {
  return typeof process.env[name] === 'string' && process.env[name].trim().length > 0;
}

function validReference(name) {
  return present(name) && /^[A-Z0-9][A-Z0-9._:-]{7,127}$/.test(process.env[name].trim());
}

async function readJsonOrNull(relativePath) {
  try {
    return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
  } catch {
    return null;
  }
}

const adapter = process.env.MATHCHAKCHAK_EXTERNAL_DEPLOYMENT_ADAPTER?.trim() || null;
const httpsBaseUrl = inspectHttpsBaseUrl(process.env.MATHCHAKCHAK_EXTERNAL_BASE_URL);

const gitRemote = run('git', ['remote', 'get-url', 'origin']);
const gitBranch = run('git', ['branch', '--show-current']);
const gitHead = run('git', ['rev-parse', 'HEAD']);
const repoSlug = gitRemote.ok ? parseRepoSlug(gitRemote.stdout) : null;

const ghAuthStatus = run('gh', ['auth', 'status', '--active', '--json', 'hosts']);
const ghRepo = repoSlug
  ? run('gh', ['api', `repos/${repoSlug}`, '--jq', '{visibility,default_branch,has_pages,permissions}'])
  : { ok: false, status: 1, stdout: '' };
const ghEnvironments = repoSlug
  ? run('gh', ['api', `repos/${repoSlug}/environments`, '--jq', '{total_count,environments:[.environments[].name]}'])
  : { ok: false, status: 1, stdout: '' };
const ghPages = repoSlug
  ? run('gh', ['api', `repos/${repoSlug}/pages`, '--jq', '{status,html_url,build_type}'])
  : { ok: false, status: 1, stdout: '' };

let repo = null;
let environments = null;
let authenticatedAccount = null;
try { repo = ghRepo.ok ? JSON.parse(ghRepo.stdout) : null; } catch { repo = null; }
try { environments = ghEnvironments.ok ? JSON.parse(ghEnvironments.stdout) : null; } catch { environments = null; }
try {
  const auth = ghAuthStatus.ok ? JSON.parse(ghAuthStatus.stdout) : null;
  authenticatedAccount = auth?.hosts?.['github.com']?.find((item) => item.active && item.state === 'success')?.login || null;
} catch {
  authenticatedAccount = null;
}

const routeEvidence = JSON.parse(await fs.readFile(
  path.join(root, 'docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json'),
  'utf8',
));
const release = JSON.parse(await fs.readFile(
  path.join(root, 'artifacts/release-candidate/stage8-v1.0/release-manifest.json'),
  'utf8',
));
const gate7 = JSON.parse(await fs.readFile(
  path.join(root, 'docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json'),
  'utf8',
));
const gate8Local = JSON.parse(await fs.readFile(
  path.join(root, 'docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json'),
  'utf8',
));
const cloudflareRuntime = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_RUNTIME_VERIFICATION_v1.0.json',
);
const cloudflareDeployment = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_DEPLOYMENT_ATTEMPT_v1.0.json',
);
const cloudflareAuthentication = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_CONTROL_PLANE_AUTHENTICATION_CHECK_v1.0.json',
);
const cloudflareAuthenticationRevalidation = await readJsonOrNull(
  'docs/stage8/evidence/gate8/CLOUDFLARE_CONTROL_PLANE_AUTHENTICATION_REVALIDATION_v1.0.json',
);
const externalTargetPreflight = await readJsonOrNull(
  'docs/stage8/evidence/gate8/GATE8_EXTERNAL_API_POSTGRES_TARGET_PREFLIGHT_v1.0.json',
);

const configured = {
  target_reference: validReference('MATHCHAKCHAK_EXTERNAL_TARGET_REFERENCE'),
  authorization_reference: validReference('MATHCHAKCHAK_EXTERNAL_AUTHORIZATION_REFERENCE'),
  deployment_adapter: present('MATHCHAKCHAK_EXTERNAL_DEPLOYMENT_ADAPTER')
    && ALLOWED_DEPLOYMENT_ADAPTERS.has(adapter),
  https_base_url: httpsBaseUrl.valid,
  external_docker_context: present('MATHCHAKCHAK_DOCKER_CONTEXT')
    && !['default', 'desktop-linux'].includes(process.env.MATHCHAKCHAK_DOCKER_CONTEXT.trim())
    && run('docker', ['context', 'inspect', process.env.MATHCHAKCHAK_DOCKER_CONTEXT.trim(), '--format', '{{json .Endpoints.docker.Host}}']).ok,
  cloudflare_runtime_evidence: adapter === 'cloudflare_workers'
    && verifyCloudflareRuntimeEvidence(cloudflareRuntime, httpsBaseUrl.hostname_sha256),
};

const providerAccountAuthenticated = adapter === 'cloudflare_workers'
  ? isFreshProviderAuthentication(cloudflareAuthenticationRevalidation)
  : Boolean(authenticatedAccount);
const providerAuditMetadataReadable = adapter === 'cloudflare_workers'
  ? cloudflareDeployment?.verification?.cloudflare_deployment_record_present === true
    && typeof cloudflareDeployment?.verification?.worker_version_reference === 'string'
  : ghRepo.ok && ghEnvironments.ok;

const gates = {
  release_candidate_fixed: gate7.status === 'VERIFIED' && gate7.release_candidate_sha256 === release.rc_sha256,
  local_gate8_verified: gate8Local.status === 'PASS_LOCAL_DEPLOYMENT',
  route_connection_verified: routeEvidence.connection_verified === true && routeEvidence.actual_connection_evidence > 0,
  external_api_postgres_target_intake_ready: externalTargetPreflight?.input_validation?.complete === true,
  target_reference_configured: configured.target_reference,
  authorization_reference_configured: configured.authorization_reference,
  deployment_adapter_configured: configured.deployment_adapter,
  https_base_url_configured: configured.https_base_url,
  deployment_runtime_context_configured: runtimeContextConfigured(adapter, configured),
  source_control_account_authenticated: Boolean(authenticatedAccount),
  provider_account_authenticated: providerAccountAuthenticated,
  origin_repository_resolved: Boolean(repoSlug && repo),
  origin_push_permission: repo?.permissions?.push === true,
  deployment_environment_configured: Number(environments?.total_count || 0) > 0,
  provider_audit_metadata_readable: providerAuditMetadataReadable,
};

const blockerPriority = [
  ['route_connection_verified', 'EXTERNAL_ROUTE_CONNECTION_EVIDENCE_REFERENCE'],
  ['external_api_postgres_target_intake_ready', 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE'],
  ['target_reference_configured', 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE'],
  ['authorization_reference_configured', 'EXTERNAL_DEPLOYMENT_AUTHORIZATION_REFERENCE'],
  ['deployment_adapter_configured', 'EXTERNAL_DEPLOYMENT_ADAPTER'],
  ['https_base_url_configured', 'EXTERNAL_HTTPS_BASE_URL'],
  ['deployment_runtime_context_configured', runtimeContextBlocker(adapter)],
  ['source_control_account_authenticated', 'SOURCE_CONTROL_ACCOUNT_AUTHENTICATION'],
  ['provider_account_authenticated', adapter === 'cloudflare_workers'
    ? 'CLOUDFLARE_PROVIDER_AUTHENTICATION_REFRESH'
    : 'PROVIDER_ACCOUNT_AUTHENTICATION'],
  ['origin_repository_resolved', 'ORIGIN_REPOSITORY_ACCESS'],
  ['origin_push_permission', 'ORIGIN_REPOSITORY_WRITE_PERMISSION'],
  ['deployment_environment_configured', 'PROTECTED_DEPLOYMENT_ENVIRONMENT'],
  ['provider_audit_metadata_readable', 'PROVIDER_AUDIT_METADATA_ACCESS'],
];
const blockers = [...new Set(
  blockerPriority.filter(([gate]) => gates[gate] !== true).map(([, blocker]) => blocker),
)];
const allReady = Object.values(gates).every(Boolean);

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  collected_at: new Date().toISOString(),
  decision: allReady ? 'ALLOW_WITH_CONDITIONS' : 'HOLD',
  status: allReady ? 'READY_FOR_APPROVED_EXTERNAL_DEPLOYMENT' : 'HOLD_EXTERNAL_DEPLOYMENT_GATES',
  release_candidate_sha256: release.rc_sha256,
  source_control: {
    origin_repository: repoSlug,
    branch: gitBranch.ok ? gitBranch.stdout : null,
    head_commit: gitHead.ok ? gitHead.stdout : null,
    authenticated_account_reference: authenticatedAccount ? `github:${authenticatedAccount}` : null,
    repository_visibility: repo?.visibility || null,
    default_branch: repo?.default_branch || null,
    permissions: repo?.permissions || null,
  },
  provider_configuration: {
    deployment_adapter: adapter,
    pages_configured: ghPages.ok,
    pages_probe_status: ghPages.status,
    deployment_environment_count: Number(environments?.total_count || 0),
    deployment_environment_names: environments?.environments || [],
    target_reference_configured: configured.target_reference,
    authorization_reference_configured: configured.authorization_reference,
    deployment_adapter_configured: configured.deployment_adapter,
    https_base_url_configured: configured.https_base_url,
    https_hostname_sha256: httpsBaseUrl.hostname_sha256,
    external_docker_context_configured: configured.external_docker_context,
    cloudflare_runtime_evidence_verified: configured.cloudflare_runtime_evidence,
    cloudflare_control_plane_status: adapter === 'cloudflare_workers'
      ? cloudflareAuthenticationRevalidation?.status || cloudflareAuthentication?.status || 'MISSING'
      : 'NOT_APPLICABLE',
    external_api_postgres_target_intake_ready: gates.external_api_postgres_target_intake_ready,
  },
  gates,
  blockers,
  next_input: blockers[0] || null,
  external_actions: {
    repository_write_performed: false,
    deployment_environment_created: false,
    pages_enabled: false,
    secret_created_or_read: false,
    deployment_performed: false,
    canary_performed: false,
    production_release_performed: false,
  },
  credential_boundary: {
    credential_value_accessed: false,
    credential_value_stored: false,
    raw_endpoint_stored: false,
  },
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(`GATE8_EXTERNAL_PREFLIGHT_${evidence.decision}`);
console.log(`repository=${repoSlug || 'MISSING'} push=${String(gates.origin_push_permission)} environments=${evidence.provider_configuration.deployment_environment_count}`);
console.log(`adapter=${adapter || 'MISSING'} route=${String(gates.route_connection_verified)} target=${String(configured.target_reference)} authorization=${String(configured.authorization_reference)}`);
console.log(`https=${String(configured.https_base_url)} runtime=${String(gates.deployment_runtime_context_configured)} provider_auth=${String(gates.provider_account_authenticated)}`);
console.log(`next_input=${evidence.next_input || 'NONE'}`);
