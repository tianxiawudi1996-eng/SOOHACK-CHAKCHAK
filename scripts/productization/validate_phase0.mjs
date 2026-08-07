import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const required = [
  'AGENTS.md', 'README.md', 'package.json', '.editorconfig',
  'client/README.md', 'developer/README.md', 'agent/README.md',
  'docs/client', 'docs/developer', 'docs/agent',
  'docs/productization/PHASE_ROADMAP.md', 'docs/productization/STATUS.json',
  'scripts/productization/validate_phase0.mjs'
];
const failures = [];
for (const item of required) {
  try { await access(resolve(root, item)); } catch { failures.push(`MISSING:${item}`); }
}

const agents = await readFile(resolve(root, 'AGENTS.md'), 'utf8');
for (const marker of ['수학착착', 'client/', 'developer/', 'agent/', 'ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru', '단위 테스트']) {
  if (!agents.includes(marker)) failures.push(`AGENTS_RULE_MISSING:${marker}`);
}

const status = JSON.parse(await readFile(resolve(root, 'docs/productization/STATUS.json'), 'utf8'));
const phaseKeys = Object.keys(status.phases || {}).map(Number).sort((a,b) => a-b);
const expectedPhaseKeys = Array.from({length:Number(status.current_phase) + 1}, (_,index) => index);
const validCurrentStatuses = new Set([
  'VERIFIED',
  'AUTO_VERIFIED_HUMAN_REVIEW_REQUIRED',
  'AUTO_VERIFIED_LOCAL_LAB',
  'AUTO_VERIFIED_LOCAL_SECURITY',
  'AUTO_VERIFIED_LOCAL_ANALYTICS',
  'AUTO_VERIFIED_LOCAL_DATA_RIGHTS',
  'AUTO_VERIFIED_LOCAL_PRIVACY_OPERATIONS'
]);
if (
  status.project !== 'MathChakChak' ||
  !Number.isInteger(status.current_phase) ||
  JSON.stringify(phaseKeys) !== JSON.stringify(expectedPhaseKeys) ||
  !validCurrentStatuses.has(status.phases?.[String(status.current_phase)]?.status)
) failures.push('PHASE_STATUS_INVALID');
const gate5Review = JSON.parse(await readFile(resolve(root, 'docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_MANUAL_REVIEW_v1.0.json'), 'utf8'));
const gate5Approved = gate5Review.status === 'APPROVED' && gate5Review.decision === 'APPROVE' && gate5Review.approval_applied === true;
if (gate5Approved) {
  if (status.stage8_dependency?.gate5_status !== 'VERIFIED' || status.stage8_dependency?.gate5_approval !== '1/1' || status.stage8_dependency?.gate6_entry_allowed !== true) failures.push('STAGE8_GATE_BOUNDARY_INVALID');
} else if (status.stage8_dependency?.gate5_status !== 'BLOCKED' || status.stage8_dependency?.gate5_approval !== '0/1' || status.stage8_dependency?.gate6_entry_allowed !== false) {
  failures.push('STAGE8_GATE_BOUNDARY_INVALID');
}

if (failures.length) {
  console.error('PRODUCTIZATION_PHASE0_FAIL');
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.log('PRODUCTIZATION_PHASE0_PASS');
console.log(`required_paths=${required.length}/${required.length}`);
console.log('locale_rules=8/8');
console.log('stage8_gate_boundary=PASS');
