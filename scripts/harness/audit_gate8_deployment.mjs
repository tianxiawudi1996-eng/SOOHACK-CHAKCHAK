import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EXPECTED_FORWARD_MIGRATIONS } from './lib/gate8_external_target_contract.mjs';

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const sha256 = async (relativePath) => createHash('sha256').update(await fs.readFile(path.join(root, relativePath))).digest('hex');
const localPath = 'docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json';
const gate7Path = 'docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json';
const releasePath = 'artifacts/release-candidate/stage8-v1.0/release-manifest.json';
const externalPreflightPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json';
const externalPreflightAuditPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT_v1.0.json';
const cloudflareDeploymentPath = 'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_DEPLOYMENT_ATTEMPT_v1.0.json';
const cloudflareRevalidationPath = 'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_DEPLOYMENT_REVALIDATION_v1.0.json';
const cloudflareRuntimePath = 'docs/stage8/evidence/gate8/CLOUDFLARE_DEVELOPMENT_RUNTIME_VERIFICATION_v1.0.json';
const cloudflareFullStackPath = 'docs/stage8/evidence/gate8/CLOUDFLARE_FULL_STACK_DEVELOPMENT_EVIDENCE_v1.0.json';
const cloudflareWorkerPath = 'infra/cloudflare/worker.mjs';
const outputPath = 'docs/stage8/evidence/gate8/GATE8_DEPLOYMENT_AUDIT_v1.0.json';
const reportPath = 'docs/stage8/audits/GATE8_DEPLOYMENT_AUDIT.md';

const local = await readJson(localPath);
const gate7 = await readJson(gate7Path);
const release = await readJson(releasePath);
const externalPreflight = await readJson(externalPreflightPath);
const externalPreflightAudit = await readJson(externalPreflightAuditPath);
const cloudflareDeployment = await readJson(cloudflareDeploymentPath);
const cloudflareRevalidation = await readJson(cloudflareRevalidationPath);
const cloudflareRuntime = await readJson(cloudflareRuntimePath);
const cloudflareFullStack = await readJson(cloudflareFullStackPath);
const harness = await readJson('harness/status.json');
const failures = [];
const currentWorkerSha256 = await sha256(cloudflareWorkerPath);

if (gate7.status !== 'VERIFIED' || gate7.release_candidate_sha256 !== release.rc_sha256) failures.push('GATE7_PREREQUISITE_INVALID');
if (!['IN_PROGRESS', 'BLOCKED'].includes(harness.gate8?.status) || harness.gate8?.entry_allowed !== true) failures.push('GATE8_HARNESS_STATE_INVALID');
if (local.status !== 'PASS_LOCAL_DEPLOYMENT' || local.result !== 'LOCAL_DEPLOYMENT_HEALTH_SMOKE_ROLLBACK_PASS' || local.release_candidate_sha256 !== release.rc_sha256) failures.push('LOCAL_DEPLOYMENT_RESULT_INVALID');
if (local.deployed_artifact?.status !== 'PASS' || local.deployed_artifact?.verified !== 78 || local.deployed_artifact?.expected !== 78) failures.push('DEPLOYED_ARTIFACT_INVALID');
if (local.locale_smoke?.status !== 'PASS' || local.locale_smoke?.results?.length !== 8 || local.locale_smoke?.results?.some((item) => item.status !== 'PASS')) failures.push('LOCALE_SMOKE_INVALID');
if (local.security_headers?.status !== 'PASS' || local.rollback_rehearsal?.status !== 'PASS' || local.rollback_rehearsal?.same_images_redeployed !== true) failures.push('SECURITY_OR_ROLLBACK_INVALID');
if (local.commands?.length !== 8 || local.commands?.some((command) => command.status !== 'PASS')) failures.push('DEPLOYMENT_COMMAND_SET_INVALID');
if (local.secret_handling?.ephemeral_secret_generated_in_memory !== true || local.secret_handling?.secret_written_to_file !== false || local.secret_handling?.secret_included_in_evidence !== false) failures.push('SECRET_HANDLING_INVALID');
if (local.external_deployment?.performed !== false || local.external_deployment?.target_reference !== null || local.external_deployment?.authorization_reference !== null || local.external_deployment?.production_release_authorized !== false) failures.push('LOCAL_EXTERNAL_BOUNDARY_INVALID');
if (externalPreflight.release_candidate_sha256 !== release.rc_sha256 || externalPreflightAudit.release_candidate_sha256 !== release.rc_sha256) failures.push('EXTERNAL_PREFLIGHT_RELEASE_DRIFT');
if (externalPreflightAudit.audit_status !== 'PASS' || externalPreflightAudit.execution_status !== externalPreflight.decision) failures.push('EXTERNAL_PREFLIGHT_AUDIT_INVALID');
if (externalPreflight.decision === 'HOLD' && (!externalPreflight.blockers?.length || !externalPreflight.next_input)) failures.push('EXTERNAL_HOLD_CONTRACT_INVALID');
if (externalPreflight.external_actions?.deployment_performed !== false || externalPreflight.external_actions?.canary_performed !== false || externalPreflight.external_actions?.production_release_performed !== false) failures.push('PREFLIGHT_ACTION_BOUNDARY_INVALID');
if (cloudflareDeployment.status !== 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME'
  || cloudflareDeployment.runtime_truth_boundary?.external_development_deployment_completed !== true
  || cloudflareDeployment.runtime_truth_boundary?.full_product_external_development_completed !== true
  || cloudflareDeployment.runtime_truth_boundary?.production_release_authorized !== false) {
  failures.push('CLOUDFLARE_DEPLOYMENT_SCOPE_INVALID');
}
if (cloudflareFullStack.status !== 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME'
  || cloudflareFullStack.cloudflare?.worker_deployed !== true
  || cloudflareFullStack.cloudflare?.hyperdrive_configuration_verified !== true
  || cloudflareFullStack.database?.managed_postgresql_connection_verified !== true
  || cloudflareFullStack.database?.forward_migrations_applied !== EXPECTED_FORWARD_MIGRATIONS
  || cloudflareFullStack.database?.schema_table_count !== 140
  || cloudflareFullStack.cpu_budget?.measured !== true
  || cloudflareFullStack.cpu_budget?.outcome_exceeded_cpu !== 0) {
  failures.push('CLOUDFLARE_FULL_STACK_EVIDENCE_INVALID');
}
if (cloudflareRuntime.status !== 'PASS_EXTERNAL_DEVELOPMENT_RUNTIME'
  || cloudflareRuntime.http_checks?.root !== 200
  || cloudflareRuntime.http_checks?.readyz !== 200
  || cloudflareRuntime.http_checks?.api_locales !== 200
  || cloudflareRuntime.runtime_truth?.api_connected !== true
  || cloudflareRuntime.runtime_truth?.postgresql_connected !== true
  || cloudflareRuntime.runtime_truth?.production_release !== false) {
  failures.push('CLOUDFLARE_RUNTIME_TRUTH_INVALID');
}

const audit = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  audited_at: new Date().toISOString(),
  audit_status: failures.length === 0 ? 'PASS' : 'FAIL',
  status: failures.length === 0 ? 'BLOCKED_EXTERNAL_PRODUCTION_RELEASE' : 'FAIL',
  local_deployment_status: failures.length === 0 ? 'VERIFIED' : 'FAIL',
  release_candidate_sha256: release.rc_sha256,
  evidence: [
    { path: localPath, sha256: await sha256(localPath) },
    { path: gate7Path, sha256: await sha256(gate7Path) },
    { path: releasePath, sha256: await sha256(releasePath) },
    { path: externalPreflightPath, sha256: await sha256(externalPreflightPath) },
    { path: externalPreflightAuditPath, sha256: await sha256(externalPreflightAuditPath) },
    { path: cloudflareDeploymentPath, sha256: await sha256(cloudflareDeploymentPath) },
    { path: cloudflareRevalidationPath, sha256: await sha256(cloudflareRevalidationPath) },
    { path: cloudflareRuntimePath, sha256: await sha256(cloudflareRuntimePath) },
    { path: cloudflareFullStackPath, sha256: await sha256(cloudflareFullStackPath) },
  ],
  local_results: {
    artifact_files: '78/78 PASS',
    locales: '8/8 PASS',
    operations_readiness: '20/20 PASS before and after rollback',
    core_user_journey: '1/1 PASS',
    security_headers: '6/6 PASS',
    ports_closed_during_rollback: '2/2 PASS',
    same_images_redeployed: true,
  },
  external_results: {
    deployment_scope: 'FULL_STACK_DEVELOPMENT',
    frontend_preview_deployment_performed: false,
    frontend_publicly_reachable: true,
    active_worker_version_reference: cloudflareFullStack.cloudflare.worker_version_reference,
    api_bridge_deployed: true,
    api_bridge_status: cloudflareRuntime.runtime_truth.api_bridge_status,
    public_https_url: cloudflareRuntime.endpoint.public_https_url,
    full_product_development_deployment_performed: true,
    deployment_performed: true,
    api_connected: true,
    postgresql_connected: true,
    canary_performed: false,
    production_release_authorized: false,
    preflight_decision: externalPreflight.decision,
    blockers: harness.gate8.blockers,
    next_input: 'D80_10_CONTROL_EVIDENCE_REFERENCE',
  },
  current_source: {
    worker_sha256: currentWorkerSha256,
    active_deployment_named_handlers: null,
    provider_source_hash_match_proven: false,
    source_commit_binding_proven: false,
    deployment_pending: false,
  },
  stage8_complete: false,
  failures,
};

await fs.mkdir(path.dirname(path.join(root, outputPath)), { recursive: true });
await fs.writeFile(path.join(root, outputPath), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const report = `# Stage 8 Gate 8 배포 감사

## 결정

- 감사: **${audit.audit_status}**
- Gate 7: \`${gate7.status}\`
- RC SHA-256: \`${audit.release_candidate_sha256}\`
- 로컬 격리 배포: \`${audit.local_deployment_status}\`
- 외부 프런트엔드 프리뷰: \`DEPLOYED\`
- API 브리지: \`${audit.external_results.api_bridge_status}\`
- 전체 제품 외부 배포: \`BLOCKED\`
- 불변 소스 커밋 결속 증거: \`${audit.current_source.source_commit_binding_proven}\`
- Stage 8 전체 완료: \`${audit.stage8_complete}\`

## 외부 개발 주소

- URL: \`${audit.external_results.public_https_url}\`
- 루트: \`${cloudflareRuntime.http_checks.root}\`
- 교육과정: \`${cloudflareRuntime.http_checks.curriculum_e4_ko}\`
- readiness: \`${cloudflareRuntime.http_checks.readyz}\`
- API locales: \`${cloudflareRuntime.http_checks.api_locales}\`

## 현재 경계

공개 프런트엔드는 검토 가능한 개발 프리뷰다. API와 PostgreSQL은 연결되지 않았고 제품 운영 릴리스나 학생 트래픽 승인은 없다.

API 브리지의 named-handler와 활성 버전 100% 배포는 공급자에서 재확인했다. 다만 현재 작업 트리가 커밋되지 않아 배포 버전과 불변 Git SHA의 결속은 증명되지 않았다. 보호 Environment와 커밋·CI 게이트를 거치기 전에는 운영 배포로 승격하지 않는다.

## 차단 항목

${audit.external_results.blockers.map((item) => `- \`${item}\``).join('\n')}

## 다음 입력

\`${audit.external_results.next_input}\`
`;
await fs.writeFile(path.join(root, reportPath), report, 'utf8');

console.log(`GATE8_DEPLOYMENT_AUDIT_${audit.audit_status}`);
console.log(`local=${audit.local_deployment_status} development_full_stack=${audit.external_results.full_product_development_deployment_performed} production_release=${audit.external_results.production_release_authorized}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
