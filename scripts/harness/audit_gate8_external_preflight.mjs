import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const preflightPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json';
const auditPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT_v1.0.json';
const reportPath = 'docs/stage8/audits/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT.md';
const promptPath = 'docs/stage8/prompts/GATE8_AUTONOMOUS_EXTERNAL_COMPLETION_METAPROMPT_v1.0.md';
const readJson = async (relative) => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const sha256 = async (relative) => createHash('sha256').update(await fs.readFile(path.join(root, relative))).digest('hex');

const preflight = await readJson(preflightPath);
const harness = await readJson('harness/status.json');
const failures = [];

if (preflight.release_candidate_sha256 !== harness.release_candidate_sha256) failures.push('RELEASE_CANDIDATE_DRIFT');
if (!['HOLD', 'ALLOW_WITH_CONDITIONS'].includes(preflight.decision)) failures.push('DECISION_INVALID');
if (preflight.decision === 'HOLD' && (!preflight.blockers?.length || !preflight.next_input)) failures.push('HOLD_WITHOUT_NEXT_INPUT');
if (preflight.decision === 'ALLOW_WITH_CONDITIONS' && Object.values(preflight.gates || {}).some((value) => value !== true)) failures.push('UNSATISFIED_ALLOW_GATE');
if (preflight.provider_configuration?.deployment_adapter === 'cloudflare_workers') {
  if (preflight.provider_configuration?.https_base_url_configured !== true) failures.push('CLOUDFLARE_HTTPS_TARGET_MISSING');
  if (preflight.provider_configuration?.cloudflare_runtime_evidence_verified !== true) failures.push('CLOUDFLARE_RUNTIME_EVIDENCE_INVALID');
  if (preflight.gates?.deployment_runtime_context_configured !== true) failures.push('CLOUDFLARE_RUNTIME_CONTEXT_INVALID');
}
if (preflight.external_actions?.repository_write_performed !== false) failures.push('UNAUTHORIZED_REPOSITORY_WRITE_CLAIM');
for (const key of ['deployment_environment_created', 'pages_enabled', 'secret_created_or_read', 'deployment_performed', 'canary_performed', 'production_release_performed']) {
  if (preflight.external_actions?.[key] !== false) failures.push(`UNAUTHORIZED_EXTERNAL_ACTION:${key}`);
}
if (preflight.credential_boundary?.credential_value_accessed !== false
  || preflight.credential_boundary?.credential_value_stored !== false
  || preflight.credential_boundary?.raw_endpoint_stored !== false) {
  failures.push('CREDENTIAL_BOUNDARY_INVALID');
}
if (preflight.decision === 'HOLD' && harness.gate8?.status !== 'BLOCKED') failures.push('HARNESS_GATE8_SHOULD_REMAIN_BLOCKED');

const audit = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  audited_at: new Date().toISOString(),
  audit_status: failures.length ? 'FAIL' : 'PASS',
  execution_status: preflight.decision,
  release_candidate_sha256: preflight.release_candidate_sha256,
  preflight_sha256: await sha256(preflightPath),
  prompt_sha256: await sha256(promptPath),
  external_mutation_performed: false,
  blockers: preflight.blockers,
  next_input: preflight.next_input,
  failures,
};

await fs.writeFile(path.join(root, auditPath), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const report = `# Gate 8 외부 배포 사전점검 감사

## 결과

- 감사: **${audit.audit_status}**
- 실행 결정: **${audit.execution_status}**
- 릴리스 후보: \`${audit.release_candidate_sha256}\`
- 외부 변경 수행: \`${audit.external_mutation_performed}\`

## 확인된 공급자 상태

- 원격 저장소: \`${preflight.source_control.origin_repository}\`
- 인증 계정 참조: \`${preflight.source_control.authenticated_account_reference}\`
- push 권한: \`${preflight.gates.origin_push_permission}\`
- 배포 어댑터: \`${preflight.provider_configuration.deployment_adapter}\`
- 공개 HTTPS 주소 검증: \`${preflight.gates.https_base_url_configured}\`
- 런타임 증거 검증: \`${preflight.gates.deployment_runtime_context_configured}\`
- 공급자 제어 권한: \`${preflight.gates.provider_account_authenticated}\`
- 보호 배포 Environment 수: \`${preflight.provider_configuration.deployment_environment_count}\`

## 차단 항목

${audit.blockers.map((item) => `- \`${item}\``).join('\n')}

## 다음 입력

\`${audit.next_input || 'NONE'}\`

감사 PASS는 현재 HOLD 또는 ALLOW 판단이 증거와 일치한다는 뜻이다. 외부 배포 완료나 운영 승인을 의미하지 않는다.
`;
await fs.writeFile(path.join(root, reportPath), report, 'utf8');

console.log(`GATE8_EXTERNAL_PREFLIGHT_AUDIT_${audit.audit_status}`);
console.log(`execution=${audit.execution_status} blockers=${audit.blockers.length} next_input=${audit.next_input || 'NONE'}`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
