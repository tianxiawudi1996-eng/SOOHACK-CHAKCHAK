import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { console.error(`MATH_LEARNING_UI_FAIL: ${message}`); process.exit(1); };

const required = [
  'client/math-learning/index.html', 'client/math-learning/styles.css',
  'client/math-learning/app.js', 'client/math-learning/model.mjs',
  'client/math-learning/messages.mjs', 'tests/integration/web-formula-learning.test.mjs',
  'docs/client/design/MATH_FORMULA_LESSON_SCREEN_v1.0.md',
  'docs/productization/prompts/PHASE_11_STUDENT_FORMULA_UI_METAPROMPT_v1.0.md',
  'docs/productization/reports/PHASE_11_STUDENT_FORMULA_UI_REPORT.md',
  'docs/productization/evidence/PHASE_11_STUDENT_FORMULA_UI_QA.json'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

const html = read(required[0]);
const css = read(required[1]);
const app = read(required[2]);
const model = read(required[3]);
const messages = read(required[4]);
const nginx = read('infra/deployment/nginx.staging.conf');
const compose = read('infra/deployment/compose.api-staging.yaml');
const seed = read('infra/database/seeds/0002_fraction_formula_lesson.sql');

for (const id of ['localeSelect','stageList','startButton','lessonPanel','answerForm','feedback','continueButton','completePanel']) {
  if (!html.includes(`id="${id}"`)) fail(`screen control missing ${id}`);
}
for (const stage of ['UNDERSTAND','CONNECT','REPEAT','RECALL','APPLY']) if (!model.includes(`'${stage}'`)) fail(`stage missing ${stage}`);
for (const locale of ['ko','zh-CN','ja','en','es','fr','it','ru']) if (!messages.includes(`${locale}:`) && !messages.includes(`'${locale}':`)) fail(`UI locale missing ${locale}`);
if (!app.includes('/api/v1/local-demo/session') || !app.includes('/formula-lessons') || !app.includes('/learning-sessions')) fail('PostgreSQL API journey missing');
if (/localStorage|sessionStorage|document\.cookie/.test(app)) fail('session token persistence is forbidden');
if (app.includes("addEventListener('submit'") || !app.includes('elements.form.onsubmit=null')) fail('step submit handler replacement missing');
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css) || !/@media\s*\(max-width:\s*560px\)/.test(css)) fail('accessibility or mobile fallback missing');
if (
  !nginx.includes('location /api/') ||
  !nginx.includes('application/javascript') ||
  !(nginx.includes('\\.mjs$') || nginx.includes('(?:mjs|js)'))
) fail('same-origin API or module MIME policy missing');
if (!compose.includes('127.0.0.1:4180:80') || !compose.includes('ENABLE_LOCAL_DEMO_SESSION: "true"')) fail('local-isolated deployment boundary missing');
if ((seed.match(/\[{"ko":/g) || []).length < 5) fail('localized hint ladders incomplete');

const evidence = JSON.parse(read('docs/productization/evidence/PHASE_11_STUDENT_FORMULA_UI_QA.json'));
if (evidence.status !== 'PASS' || evidence.browser.locales !== '8/8' || evidence.browser.learning_stages !== '5/5' || evidence.browser.mobile_width_px !== 390) fail('phase 11 evidence invalid');

console.log('MATH_LEARNING_UI_PASS');
console.log('learning_stages=5/5');
console.log('locales=8/8');
console.log('mobile=390px PASS');
console.log('same_origin_postgresql_journey=PASS');
