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
if (status.project !== 'MathChakChak' || Object.keys(status.phases || {}).length !== 10) failures.push('PHASE_STATUS_INVALID');
if (status.stage8_dependency?.gate5_status !== 'BLOCKED' || status.stage8_dependency?.gate6_entry_allowed !== false) failures.push('STAGE8_GATE_BOUNDARY_INVALID');

if (failures.length) {
  console.error('PRODUCTIZATION_PHASE0_FAIL');
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.log('PRODUCTIZATION_PHASE0_PASS');
console.log(`required_paths=${required.length}/${required.length}`);
console.log('locale_rules=8/8');
console.log('stage8_gate_boundary=PASS');
