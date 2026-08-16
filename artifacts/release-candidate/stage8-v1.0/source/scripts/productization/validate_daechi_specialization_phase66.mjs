import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const required = [
  'docs/productization/DAECHI_80_PRODUCT_REQUIREMENTS_v1.0.md',
  'docs/productization/DAECHI_80_PHASE_CHAIN_v1.0.md',
  'docs/developer/productization/DAECHI_SPECIALIZATION_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_66_DAECHI_SPECIALIZATION_FOUNDATION_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_66_DAECHI_SPECIALIZATION_QA.json',
  'docs/productization/reports/PHASE_66_DAECHI_SPECIALIZATION_FOUNDATION_REPORT.md',
  'developer/src/learning/academy-readiness.mjs',
  'client/academy/index.html',
  'client/academy/app.js',
  'client/academy/styles.css',
  'client/academy/messages.mjs',
  'tests/unit/learning/academy-readiness.test.mjs',
  'tests/unit/client/academy-readiness-app.test.mjs',
  'tests/integration/api-academy-readiness.test.mjs'
];

const missing = required.filter((path) => !existsSync(resolve(root, path)));
if (missing.length) throw new Error(`missing files: ${missing.join(', ')}`);

const requirements = readFileSync(resolve(root, required[0]), 'utf8');
for (let number = 1; number <= 10; number += 1) {
  const id = `D80-${String(number).padStart(2, '0')}`;
  if (!requirements.includes(id)) throw new Error(`missing requirement ${id}`);
}

const domain = readFileSync(resolve(root, 'developer/src/learning/academy-readiness.mjs'), 'utf8');
for (const track of ['CONCEPT_RECOVERY', 'SCHOOL_EXAM', 'ADVANCED_REASONING', 'CONTEST_BRIDGE']) {
  if (!domain.includes(track)) throw new Error(`missing track ${track}`);
}
for (const signal of ['accuracy', 'durable_recall', 'application_mastery', 'independence']) {
  if (!domain.includes(signal)) throw new Error(`missing evidence signal ${signal}`);
}

const messages = readFileSync(resolve(root, 'client/academy/messages.mjs'), 'utf8');
for (const locale of ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru']) {
  if (!messages.includes(`'${locale}'`) && !messages.includes(`${locale}:`)) {
    throw new Error(`missing locale ${locale}`);
  }
}

console.log('DAECHI_SPECIALIZATION_PHASE66: PASS');
console.log('requirements: 10/10');
console.log('tracks: 4/4');
console.log('locales: 8/8');
console.log('field_evidence: BLOCKED_EXTERNAL');
console.log('market_score_80_confirmed: false');
