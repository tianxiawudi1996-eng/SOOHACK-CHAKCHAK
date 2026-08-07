import fs from 'node:fs';
import path from 'node:path';
import {
  CURRICULUM_RUNTIME_LOCALES,
  CURRICULUM_REFERENCE_TRANSLATIONS,
  COLLABORATION_TRANSLATIONS,
  buildGradeTranslations,
  assertCurriculumRuntimeTranslations
} from './curriculum-runtime-locales.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`CURRICULUM_COLLABORATION_I18N_FAIL: ${message}`);
  process.exit(1);
};

const contract = JSON.parse(read('infra/database/curriculum-collaboration-i18n-contract.json'));
const migration = read(contract.migration);
const rollback = read(contract.rollback);
const seed = read(contract.seed);
const repository = read('developer/src/api/repository.mjs');
const server = read('developer/src/api/server.mjs');
const client = read('client/curriculum/app.js');
const clientHtml = read('client/curriculum/index.html');
const messages = read('client/curriculum/messages.mjs');
const compose = read('infra/deployment/compose.api-staging.yaml');
const register = JSON.parse(read('docs/productization/evidence/PHASE_20_TRANSLATION_REGISTER.json'));

try {
  assertCurriculumRuntimeTranslations();
} catch (error) {
  fail(error.message);
}

const grades = buildGradeTranslations();
const translated = CURRICULUM_RUNTIME_LOCALES.filter((locale) => locale !== 'ko');
const hasHangul = (value) => /[\uAC00-\uD7A3]/u.test(
  Array.isArray(value) ? value.flat(Infinity).join(' ') : String(value)
);

if (
  contract.database !== 'PostgreSQL'
  || grades.length !== 96
  || contract.reference_translation_rows !== 8
  || contract.collaboration_role_rows !== 8
  || contract.collaboration_phase_rows !== 40
) fail('coverage contract');

for (const locale of translated) {
  if (grades.filter((row) => row.locale === locale).some((row) => hasHangul([
    row.label,
    row.official_band,
    row.course_path
  ]))) fail(`grade Hangul ${locale}`);
  if (hasHangul(Object.values(CURRICULUM_REFERENCE_TRANSLATIONS[locale]))) {
    fail(`reference Hangul ${locale}`);
  }
  if (hasHangul([
    Object.values(COLLABORATION_TRANSLATIONS[locale].roles),
    COLLABORATION_TRANSLATIONS[locale].phases
  ])) fail(`collaboration Hangul ${locale}`);
}

for (const table of [
  'curriculum_grade_translation',
  'curriculum_reference_translation',
  'character_collaboration_policy_definition',
  'character_collaboration_role_translation',
  'character_collaboration_phase_translation'
]) {
  if (!migration.includes(`CREATE TABLE mathchakchak.${table}`)) fail(`migration table ${table}`);
}

for (const token of [
  'PRIMARY KEY (grade_code,locale)',
  'PRIMARY KEY (curriculum_reference_id,locale)',
  'PRIMARY KEY (policy_version,locale)',
  'PRIMARY KEY (policy_version,phase_no,locale)',
  'FOREIGN KEY (policy_version,phase_no)'
]) {
  if (!migration.includes(token)) fail(`index or FK ${token}`);
}

for (const table of [
  'character_collaboration_phase_translation',
  'character_collaboration_role_translation',
  'character_collaboration_policy_definition',
  'curriculum_reference_translation',
  'curriculum_grade_translation'
]) {
  if (!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`)) fail(`rollback table ${table}`);
}

for (const locale of CURRICULUM_RUNTIME_LOCALES) {
  if (!seed.includes(`'${locale}'`)) fail(`seed locale ${locale}`);
}
for (const token of [
  'curriculum_grade_translation',
  'curriculum_reference_translation',
  'character_collaboration_role_translation',
  'character_collaboration_phase_translation'
]) {
  if (!repository.includes(token)) fail(`repository query ${token}`);
}
if (
  !server.includes('getCurriculumGrades({actor,requestedLocale})')
  || !client.includes('/api/v1/curriculum/grades?locale=')
  || !client.includes('data.plan.role_descriptions')
  || !client.includes('phase.title')
  || !client.includes('source_citation')
) fail('runtime locale wiring');
if (!client.includes('runtimeMessages[state.locale]?.[key]??state.messages[key]')) {
  fail('curriculum metadata message priority');
}
if (!client.includes("./messages.mjs?v=0.1.0-phase20") || !clientHtml.includes('app.js?v=0.1.0-phase22')) {
  fail('curriculum module cache version');
}

for (const locale of translated) {
  const marker = locale === 'en'
    ? "step:'Step {current} of 5'"
    : `  ${locale.includes('-') ? `'${locale}'` : locale}:{step:`;
  if (!client.includes(marker)) fail(`client collaboration copy ${locale}`);
}
for (const locale of CURRICULUM_RUNTIME_LOCALES) {
  const marker = `${locale.includes('-') ? `'${locale}'` : locale}:{canonical:`;
  if (!messages.includes(marker)) fail(`metadata copy ${locale}`);
}
for (const mount of [
  '0011_curriculum_collaboration_i18n.sql',
  '0009_curriculum_collaboration_i18n.sql'
]) {
  if (!compose.includes(mount)) fail(`compose mount ${mount}`);
}

for (const doc of [
  'docs/developer/productization/CURRICULUM_COLLABORATION_I18N_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_20_CURRICULUM_COLLABORATION_I18N_METAPROMPT_v1.0.md'
]) {
  for (const section of [
    'Goal Framing',
    'Specification Engineering',
    'Context Engineering',
    'Harness Engineering',
    'Prompt Engineering',
    'Workflow Engineering',
    'Memory Engineering',
    'Loop Engineering'
  ]) {
    if (!read(doc).includes(section)) fail(`doc section ${section}`);
  }
}

if (register.manual_translation_approvals !== '0/7' || register.human_approval_inferred !== false) {
  fail('manual review boundary');
}

console.log('CURRICULUM_COLLABORATION_I18N_STATIC_PASS');
console.log('grade_rows=96/96');
console.log('reference_rows=8/8');
console.log('role_rows=8/8');
console.log('phase_rows=40/40');
console.log('locales=8/8');
console.log('human_review_required=7/7');
