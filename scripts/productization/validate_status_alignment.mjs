import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readText = (relativePath) => fs.readFile(path.resolve(root, relativePath), 'utf8');
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));
const failures = [];
const status = await readJson('docs/productization/STATUS.json');
const harness = await readJson('harness/status.json');
const register = await readJson('docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json');
const routeEvidence = await readJson('docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json');
const roadmap = await readText('docs/productization/PHASE_ROADMAP.md');
const readme = await readText('README.md');
const harnessReadme = await readText('harness/README.md');
const masterPlan = await readText('docs/stage8/00_MASTER_PLAN.md');
const remaining = await readText('docs/stage8/audits/REMAINING_WORK_REPORT_v1.0.md');
const daechiChain = await readText('docs/productization/DAECHI_80_PHASE_CHAIN_v1.0.md');
const legacyGate6Blockers = [
  'GATE6_RESPONSIVE_MANUAL_REVIEW_360_768_1024_1200_PENDING',
  'GATE6_LINT_AND_TYPECHECK_EVIDENCE_MISSING',
  'GATE6_RELEASE_CANDIDATE_BASELINE_NOT_FIXED',
];
const expectedNextFields = ['target_reference', 'provider_code', 'environment_code', 'connection_reference'];

const phaseIds = Object.keys(status.phases || {}).map(Number).sort((a, b) => a - b);
if (phaseIds.length !== 76 || phaseIds.some((id, index) => id !== index)) failures.push('STATUS_PHASE_0_75_INCOMPLETE');
if (status.current_phase !== 75 || status.phases?.['75']?.status !== 'LOCAL_COMMERCIAL_OPERATIONS_PLATFORM_PASS_EXTERNAL_RELEASE_BLOCKED') failures.push('CURRENT_PHASE_INVALID');
if (status.workflow_state !== 'IN_PROGRESS' || status.local_completion_scope !== 'PHASE_75_LOCAL_PLATFORM_PASS' || status.release_state !== 'BLOCKED_EXTERNAL') failures.push('PRODUCT_STATUS_SCOPE_INVALID');
const roadmapIds = [...roadmap.matchAll(/^\| (\d+) \| `/gm)].map((match) => Number(match[1]));
if (roadmapIds.length !== 76 || roadmapIds.some((id, index) => id !== index)) failures.push('ROADMAP_PHASE_0_75_INCOMPLETE');
if (roadmap.includes('Phase 66 생성 금지') || daechiChain.includes('| 66 | D80-01, D80-04, D80-08 | 전문 학습 전략·근거 게이트·보호 API·화면 기반 | IN_PROGRESS |')) failures.push('PHASE66_STALE_TERMINAL_RULE');

const gate6Status = harness.gate6?.status;
const gate7Status = harness.gate7?.status;
const gate8Status = harness.gate8?.status;
const validStage8States = harness.gate5?.status === 'VERIFIED' && (
  (gate6Status === 'IN_PROGRESS' && gate7Status === 'NOT_STARTED' && gate8Status === 'NOT_STARTED')
  || (gate6Status === 'VERIFIED' && gate7Status === 'IN_PROGRESS' && gate8Status === 'NOT_STARTED')
  || (gate6Status === 'VERIFIED' && gate7Status === 'VERIFIED' && ['IN_PROGRESS', 'BLOCKED', 'VERIFIED'].includes(gate8Status))
);
if (!validStage8States) failures.push('HARNESS_GATE_STATE_INVALID');
if (gate6Status === 'IN_PROGRESS' && (JSON.stringify(harness.gate6?.blockers) !== JSON.stringify(legacyGate6Blockers) || harness.gate7?.entry_allowed !== false)) failures.push('HARNESS_GATE6_IN_PROGRESS_BOUNDARY_INVALID');
if (gate6Status === 'VERIFIED' && (harness.gate6?.blockers?.length !== 0 || harness.gate7?.entry_allowed !== true || harness.release_candidate_fixed !== true)) failures.push('HARNESS_GATE6_VERIFIED_BOUNDARY_INVALID');
if (gate7Status !== 'VERIFIED' && harness.gate8?.entry_allowed !== false) failures.push('HARNESS_GATE8_PREMATURE_ENTRY');
if (gate7Status === 'VERIFIED' && harness.gate8?.entry_allowed !== true) failures.push('HARNESS_GATE8_ENTRY_INVALID');
if (
  status.stage8_dependency?.gate5_status !== harness.gate5?.status
  || status.stage8_dependency?.gate5_approval !== '1/1'
  || status.stage8_dependency?.gate6_status !== gate6Status
  || JSON.stringify(status.stage8_dependency?.gate6_blockers) !== JSON.stringify(harness.gate6?.blockers)
  || status.stage8_dependency?.gate7_status !== gate7Status
  || status.stage8_dependency?.gate8_status !== gate8Status
) failures.push('PRODUCT_STAGE8_DEPENDENCY_DRIFT');

const nextInput = register.next_authorized_input;
if (nextInput?.type !== 'EXTERNAL_DEPLOYMENT_TARGET_REFERENCE' || nextInput?.workstream_id !== 'D80-10' || JSON.stringify(nextInput?.required_fields) !== JSON.stringify(expectedNextFields) || nextInput?.required_environment_code !== 'DEVELOPMENT' || nextInput?.accepted_evidence_count !== 0) failures.push('EXTERNAL_NEXT_INPUT_INVALID');
if (routeEvidence.status !== 'VERIFIED_READ_ONLY_ROUTE_CONNECTION' || routeEvidence.actual_connection_evidence !== 1 || routeEvidence.connection_verified !== true) failures.push('EXTERNAL_ROUTE_CONNECTION_NOT_VERIFIED');
if (routeEvidence.next_required_input?.type !== nextInput?.type || JSON.stringify(routeEvidence.next_required_input?.fields) !== JSON.stringify(expectedNextFields)) failures.push('EXTERNAL_ROUTE_EVIDENCE_DRIFT');
if (status.external_execution_preparation?.next_input !== nextInput?.type || JSON.stringify(status.external_execution_preparation?.next_input_fields) !== JSON.stringify(expectedNextFields)) failures.push('PRODUCT_EXTERNAL_NEXT_INPUT_DRIFT');
for (const key of ['dispatch_performed', 'evidence_submission_enabled', 'verification_enabled', 'production_release_authorized']) {
  if (register[key] !== false || routeEvidence[key] !== false) failures.push(`UNSAFE_EXTERNAL_FLAG:${key}`);
}

for (const [name, text] of [['README', readme], ['HARNESS_README', harnessReadme], ['MASTER_PLAN', masterPlan], ['REMAINING_REPORT', remaining]]) {
  for (const marker of ['Gate 5', 'VERIFIED', 'Gate 6', gate6Status, 'Gate 7', gate7Status]) {
    if (!text.includes(marker)) failures.push(`${name}_MISSING_MARKER:${marker}`);
  }
}
if (masterPlan.includes('Gate 5: AI Behavior 상태·이벤트·말풍선 연결 — `BLOCKED`') || remaining.includes('| Gate 5 AI Behavior | `BLOCKED`')) failures.push('CURRENT_STAGE8_DOCS_STALE_GATE5');
if (!readme.includes('Phase 75 로컬 플랫폼 PASS') || !readme.includes('외부 출시 `BLOCKED_EXTERNAL`')) failures.push('README_PRODUCT_SCOPE_INVALID');

console.log(`STATUS_ALIGNMENT_${failures.length ? 'FAIL' : 'PASS'}`);
console.log(`roadmap_phases=${roadmapIds.length}/76 product_phase=${status.current_phase} product_release=${status.release_state}`);
console.log(`gate5=${harness.gate5?.status} gate6=${harness.gate6?.status} gate7=${harness.gate7?.status} gate8=${harness.gate8?.status}`);
console.log(`next_input=${nextInput?.type || 'MISSING'} accepted_external_evidence=${nextInput?.accepted_evidence_count}`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
