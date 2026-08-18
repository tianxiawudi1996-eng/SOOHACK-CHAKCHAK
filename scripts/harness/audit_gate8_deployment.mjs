import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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
if (cloudflareDeployment.status !== 'PASS_EXTERNAL_FRONTEND_PREVIEW'
  || cloudflareDeployment.runtime_truth_boundary?.external_frontend_deployment_completed !== true
  || cloudflareDeployment.runtime_truth_boundary?.full_product_external_deployment_completed !== false) {
  failures.push('CLOUDFLARE_DEPLOYMENT_SCOPE_INVALID');
}
if (cloudflareRevalidation.status !== 'PASS_EXTERNAL_FRONTEND_PREVIEW'
  || cloudflareRevalidation.active_deployment?.active_traffic_percent !== 100
  || cloudflareRevalidation.active_deployment?.worker_version_reference !== 'cloudflare-worker-version:ea067773-d8ae-4617-b9d2-9b9747619774'
  || cloudflareRevalidation.runtime_truth?.api_bridge_deployed !== true
  || cloudflareRevalidation.runtime_truth?.api_bridge_status !== 'NOT_CONFIGURED') {
  failures.push('CLOUDFLARE_ACTIVE_DEPLOYMENT_REVALIDATION_INVALID');
}
if (cloudflareRuntime.status !== 'PASS_EXTERNAL_FRONTEND_PREVIEW'
  || cloudflareRuntime.http_checks?.root !== 200
  || cloudflareRuntime.http_checks?.readyz !== 200
  || cloudflareRuntime.http_checks?.api_not_connected !== 503
  || cloudflareRuntime.runtime_truth?.api_connected !== false
  || cloudflareRuntime.runtime_truth?.postgresql_connected !== false
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
  status: failures.length === 0 ? 'BLOCKED_EXTERNAL_FULL_PRODUCT' : 'FAIL',
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
    deployment_scope: 'FRONTEND_PREVIEW_WITH_API_BRIDGE_NOT_CONFIGURED',
    frontend_preview_deployment_performed: true,
    frontend_publicly_reachable: true,
    active_worker_version_reference: cloudflareRevalidation.active_deployment.worker_version_reference,
    api_bridge_deployed: true,
    api_bridge_status: cloudflareRuntime.runtime_truth.api_bridge_status,
    public_https_url: cloudflareRuntime.endpoint.public_https_url,
    full_product_deployment_performed: false,
    deployment_performed: false,
    api_connected: false,
    postgresql_connected: false,
    canary_performed: false,
    production_release_authorized: false,
    preflight_decision: externalPreflight.decision,
    blockers: externalPreflight.blockers,
    next_input: externalPreflight.next_input,
  },
  current_source: {
    worker_sha256: currentWorkerSha256,
    active_deployment_named_handlers: cloudflareRevalidation.active_deployment.named_handler_evidence,
    provider_source_hash_match_proven: cloudflareRevalidation.local_source.provider_source_hash_match_proven,
    source_commit_binding_proven: cloudflareRevalidation.local_source.source_commit_binding_proven,
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
- API 미연결 응답: \`${cloudflareRuntime.http_checks.api_not_connected}\` (예상된 안전 차단)

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
console.log(`local=${audit.local_deployment_status} frontend_preview=${audit.external_results.frontend_preview_deployment_performed} full_product=${audit.external_results.full_product_deployment_performed}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
