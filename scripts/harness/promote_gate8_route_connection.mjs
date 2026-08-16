import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registerPath = path.join(root, 'docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json');
const routePath = path.join(root, 'docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json');
const statusPath = path.join(root, 'docs/productization/STATUS.json');
const harnessPath = path.join(root, 'harness/status.json');
const reportPath = path.join(root, 'docs/productization/reports/EXTERNAL_ROUTE_CONNECTION_VALIDATION_REPORT.md');
const readJson = async (absolutePath) => JSON.parse(await fs.readFile(absolutePath, 'utf8'));

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

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const register = await readJson(registerPath);
const route = await readJson(routePath);
const status = await readJson(statusPath);
const harness = await readJson(harnessPath);

if (route.connection_verified === true && route.evidence_references?.length === 1) {
  const existing = route.evidence_references[0];
  const sourceBytes = await fs.readFile(path.join(root, existing.source_path));
  if (sha256(sourceBytes) !== existing.evidence_sha256) throw new Error('EXISTING_ROUTE_EVIDENCE_HASH_MISMATCH');
  console.log('GATE8_ROUTE_CONNECTION_ALREADY_VERIFIED');
  console.log(`internal_reference=${existing.internal_reference}`);
  console.log(`next_input=${route.next_required_input?.type}`);
  process.exit(0);
}

const expectedRepository = 'tianxiawudi1996-eng/SOOHACK-CHAKCHAK';
const accountResult = run('gh', ['api', 'user', '--jq', '.login']);
const repoResult = run('gh', ['api', `repos/${expectedRepository}`, '--jq', '{full_name,visibility,default_branch,permissions}']);
if (!accountResult.ok || !repoResult.ok) throw new Error('LIVE_GITHUB_ROUTE_PROBE_FAILED');
const repo = JSON.parse(repoResult.stdout);
if (repo.full_name !== expectedRepository || repo.permissions?.pull !== true) throw new Error('GITHUB_ROUTE_RESOURCE_OR_READ_PERMISSION_INVALID');
if (register.input_confirmations?.approved_submission_route_reference?.reference !== 'OPS-EVIDENCE-ROUTE-2026-001') throw new Error('APPROVED_ROUTE_REFERENCE_DRIFT');
if (register.input_confirmations?.review_role_confirmation?.role_code !== 'SECURITY_AND_PRODUCT_REVIEW_BOARD') throw new Error('REVIEW_ROLE_CONFIRMATION_DRIFT');

const verifiedAt = new Date().toISOString();
const compact = verifiedAt.replace(/[-:.]/g, '').replace('Z', 'Z');
const relativeProbePath = `docs/productization/evidence/route-connections/GITHUB_ROUTE_CONNECTION_PROBE_${compact}.json`;
const absoluteProbePath = path.join(root, relativeProbePath);
const probe = {
  schema_version: '1.0.0',
  evidence_kind: 'EXTERNAL_ROUTE_CONNECTION_PROBE',
  provider: 'github',
  route_reference: 'OPS-EVIDENCE-ROUTE-2026-001',
  workstream_id: 'D80-10',
  verified_at: verifiedAt,
  authenticated_account_reference: `github:${accountResult.stdout}`,
  resource_reference: `github:${repo.full_name}`,
  connection_scope: 'READ_ONLY_REPOSITORY_METADATA',
  result: 'CONNECTED_READ_ONLY',
  observed_capabilities: {
    repository_metadata_read: true,
    repository_pull: repo.permissions.pull === true,
    repository_push: repo.permissions.push === true,
    repository_admin: repo.permissions.admin === true,
  },
  resource_metadata: {
    visibility: repo.visibility,
    default_branch: repo.default_branch,
  },
  external_mutation_performed: false,
  secret_value_accessed: false,
  secret_value_stored: false,
  raw_endpoint_stored: false,
};
const probeBytes = Buffer.from(`${JSON.stringify(probe, null, 2)}\n`, 'utf8');
const evidenceSha256 = sha256(probeBytes);
const evidenceReference = {
  internal_reference: `GITHUB-ROUTE-CONNECTION-${compact}`,
  evidence_sha256: evidenceSha256,
  verified_at: verifiedAt,
  review_role_code: 'SECURITY_AND_PRODUCT_REVIEW_BOARD',
  source_path: relativeProbePath,
  provider: 'github',
  connection_scope: 'READ_ONLY_REPOSITORY_METADATA',
  status: 'VERIFIED_READ_ONLY_CONNECTION',
};

await fs.mkdir(path.dirname(absoluteProbePath), { recursive: true });
await fs.writeFile(absoluteProbePath, probeBytes);

const targetFields = ['target_reference', 'provider_code', 'environment_code', 'connection_reference'];
route.status = 'VERIFIED_READ_ONLY_ROUTE_CONNECTION';
route.actual_connection_evidence = 1;
route.connection_verified = true;
route.evidence_references = [evidenceReference];
route.next_required_input = {
  type: 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE',
  fields: targetFields,
  required_environment_code: 'DEVELOPMENT',
  raw_endpoint_stored: false,
  secret_stored: false,
  personal_contact_stored: false,
};

register.status = 'D80_10_ROUTE_CONNECTED_PENDING_DEPLOYMENT_TARGET';
register.input_confirmations.approved_submission_route_reference.status = 'READ_ONLY_CONNECTION_VERIFIED_SUBMISSION_DISABLED';
register.route_validation = {
  status: 'VERIFIED_READ_ONLY_ROUTE_CONNECTION',
  reference_format_valid: true,
  workstream_binding_valid: true,
  actual_connection_evidence: 1,
  connection_verified: true,
  evidence_references: [evidenceReference],
  next_required_input: 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE',
};
register.submission_policy.external_submission_route = 'READ_ONLY_CONNECTION_VERIFIED_SUBMISSION_DISABLED';
register.next_authorized_input = {
  type: 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE',
  workstream_id: 'D80-10',
  required_fields: targetFields,
  required_environment_code: 'DEVELOPMENT',
  accepted_evidence_count: 0,
  not_required_in_repository: ['raw_endpoint', 'token', 'secret', 'personal_contact'],
};

status.external_execution_preparation.status = 'D80_10_ROUTE_CONNECTED_PENDING_DEPLOYMENT_TARGET';
status.external_execution_preparation.route_validation_status = 'VERIFIED_READ_ONLY_ROUTE_CONNECTION';
status.external_execution_preparation.actual_external_evidence = 1;
status.external_execution_preparation.next_input = 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE';
status.external_execution_preparation.next_input_fields = targetFields;
delete status.external_execution_preparation.required_review_role_code;
status.stage8_dependency.gate8_next_input = 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE';
status.last_updated = verifiedAt;

harness.gate8.blockers = harness.gate8.blockers.filter((item) => item !== 'EXTERNAL_ROUTE_CONNECTION_EVIDENCE_REFERENCE');
harness.updated_at = verifiedAt;

const report = `# 외부 제출 경로 연결 검증 보고서\n\n## 결과\n\n- 상태: \`VERIFIED_READ_ONLY_ROUTE_CONNECTION\`\n- 경로 참조: \`OPS-EVIDENCE-ROUTE-2026-001\`\n- 연결 범위: \`READ_ONLY_REPOSITORY_METADATA\`\n- 내부 증거 참조: \`${evidenceReference.internal_reference}\`\n- 증거 SHA-256: \`${evidenceReference.evidence_sha256}\`\n- 검증 시각: \`${evidenceReference.verified_at}\`\n- 검토 역할 코드: \`${evidenceReference.review_role_code}\`\n\n## 권한 경계\n\nGitHub 저장소 메타데이터 읽기와 pull 권한만 실제 호출로 확인했다. push·Pages·Environment·Secret·배포·발송은 수행하거나 승인하지 않았다. 읽기 연결 검증은 제출 또는 출시 승인이 아니다.\n\n## 다음 입력\n\n\`EXTERNAL_DEPLOYMENT_TARGET_REFERENCE\`\n`;

await fs.writeFile(routePath, `${JSON.stringify(route, null, 2)}\n`, 'utf8');
await fs.writeFile(registerPath, `${JSON.stringify(register, null, 2)}\n`, 'utf8');
await fs.writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
await fs.writeFile(harnessPath, `${JSON.stringify(harness, null, 2)}\n`, 'utf8');
await fs.writeFile(reportPath, report, 'utf8');

console.log('GATE8_ROUTE_CONNECTION_VERIFIED_READ_ONLY');
console.log(`internal_reference=${evidenceReference.internal_reference}`);
console.log(`evidence_sha256=${evidenceReference.evidence_sha256}`);
console.log('external_mutation=false push=false deployment=false');
console.log('next_input=EXTERNAL_DEPLOYMENT_TARGET_REFERENCE');
