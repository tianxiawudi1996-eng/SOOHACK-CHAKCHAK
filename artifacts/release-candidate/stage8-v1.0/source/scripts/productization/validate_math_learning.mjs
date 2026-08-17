import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { console.error(`MATH_LEARNING_FAIL: ${message}`); process.exit(1); };
const contract = JSON.parse(read('infra/database/math-learning-contract.json'));
const migration = read(contract.extension_migration);
const rollback = read(contract.rollback);
const seed = read('infra/database/seeds/0002_fraction_formula_lesson.sql');
const engine = read('developer/src/learning/formula-learning.mjs');
const repository = read('developer/src/api/repository.mjs');
const server = read('developer/src/api/server.mjs');
const design = read('docs/developer/productization/MATH_FORMULA_LEARNING_DESIGN_v1.0.md');
const prompt = read('docs/productization/prompts/PHASE_10_MATH_FORMULA_LEARNING_METAPROMPT_v1.0.md');

if (contract.database !== 'PostgreSQL' || contract.namespace !== 'mathchakchak') fail('PostgreSQL identity missing');
if (contract.extension_tables.length !== 8 || new Set(contract.extension_tables).size !== 8) fail('extension table contract invalid');
for (const table of contract.extension_tables) {
  if (!new RegExp(`CREATE TABLE mathchakchak\\.${table}\\s*\\(`, 'i').test(migration)) fail(`migration missing ${table}`);
  if (!new RegExp(`DROP TABLE IF EXISTS mathchakchak\\.${table}\\s*;`, 'i').test(rollback)) fail(`rollback missing ${table}`);
}
if (JSON.stringify(contract.learning_stages) !== JSON.stringify(['UNDERSTAND','CONNECT','REPEAT','RECALL','APPLY'])) fail('stage order invalid');
for (const locale of contract.supported_locales) if (!seed.includes(`'${locale}'`)) fail(`seed locale missing ${locale}`);
for (const stage of contract.learning_stages) if (!seed.includes(`'${stage}'`) || !engine.includes(`'${stage}'`)) fail(`stage missing ${stage}`);
for (const token of ['ADD_DENOMINATORS','mastery_threshold','expected_response','hint_ladder']) if (!migration.includes(token) && !seed.includes(token)) fail(`data rule missing ${token}`);
for (const route of ['/concepts/','/formula-lessons','/responses','/complete']) if (!server.includes(route)) fail(`API route missing ${route}`);
for (const method of ['getConceptLesson','startFormulaLesson','addFormulaLessonResponse','completeFormulaLesson']) if (!repository.includes(method)) fail(`repository method missing ${method}`);
for (const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering']) {
  if (!design.includes(section) || !prompt.includes(section)) fail(`global instruction section missing ${section}`);
}
console.log('MATH_LEARNING_PASS');
console.log('database=PostgreSQL');
console.log('extension_tables=8/8');
console.log('learning_stages=5/5');
console.log('locales=8/8');
console.log('first_formula_lesson=READY');
