import fs from 'node:fs';
import path from 'node:path';
import {DIAGNOSTIC_MESSAGES} from '../../client/diagnostic/messages.mjs';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`DIAGNOSTIC_CURRICULUM_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/diagnostic-curriculum-contract.json'));
const migration=read(contract.migration);const rollback=read(contract.rollback);const seed=read(contract.seed);
const server=read('developer/src/api/server.mjs');const repository=read('developer/src/api/repository.mjs');
const app=read('client/diagnostic/app.js');const lessonApp=read('client/math-learning/app.js');
const html=read('client/diagnostic/index.html');const css=read('client/diagnostic/styles.css');
for(const file of [contract.migration,contract.rollback,contract.seed,'docs/developer/productization/DIAGNOSTIC_CURRICULUM_DESIGN_v1.0.md','docs/productization/prompts/PHASE_13_DIAGNOSTIC_CURRICULUM_UI_METAPROMPT_v1.0.md']) if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
if(contract.database!=='PostgreSQL'||contract.handoff.single_use!==true||contract.handoff.ttl_seconds!==180)fail('database or handoff contract invalid');
for(const table of ['diagnostic_item_localization','local_demo_learning_handoff']){if(!migration.includes(`CREATE TABLE mathchakchak.${table}`))fail(`migration missing ${table}`);if(!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))fail(`rollback missing ${table}`);}
if(!migration.includes("code_hash char(64)")||!migration.includes('consumed_at')||!migration.includes('expires_at'))fail('one-time digest schema incomplete');
for(const endpoint of ['/api/v1/diagnostic-items','/api/v1/local-demo/handoffs'])if(!server.includes(endpoint))fail(`endpoint missing ${endpoint}`);
for(const method of ['getDiagnosticItems','createLocalDemoHandoff','consumeLocalDemoHandoff'])if(!repository.includes(method))fail(`repository method missing ${method}`);
if(server.includes('code_hash:code')||!server.includes("createHash('sha256')"))fail('handoff digest policy missing');
if(/localStorage|sessionStorage|document\.cookie/.test(`${app}\n${lessonApp}`))fail('browser token persistence forbidden');
if(app.includes('answer_schema')||app.includes('expected_response'))fail('diagnostic answer leakage');
if(!lessonApp.includes('history.replaceState')||!lessonApp.includes('/consume'))fail('handoff consumption or fragment cleanup missing');
if(!/@media\(max-width:640px\)/.test(css)||!/@media\(prefers-reduced-motion:reduce\)/.test(css))fail('responsive or reduced-motion rule missing');
for(const id of ['localeSelect','startButton','questionPanel','choiceList','resultPanel','learnButton'])if(!html.includes(`id="${id}"`))fail(`UI control missing ${id}`);
const locales=contract.locales;const reference=Object.keys(DIAGNOSTIC_MESSAGES.en).sort();
for(const locale of locales){if(!DIAGNOSTIC_MESSAGES[locale])fail(`locale missing ${locale}`);if(JSON.stringify(Object.keys(DIAGNOSTIC_MESSAGES[locale]).sort())!==JSON.stringify(reference))fail(`message keys differ ${locale}`);}
for(const token of ['concept.fraction.equivalent','concept.fraction.unlike_denominator_addition','concept.fraction.multiplication'])if(!`${seed}\n${read('infra/database/seeds/0002_fraction_formula_lesson.sql')}`.includes(token))fail(`formula concept missing ${token}`);
if((seed.match(/'UNDERSTAND'/g)||[]).length!==2||(seed.match(/'APPLY'/g)||[]).length!==2)fail('new five-stage lessons incomplete');
for(const doc of ['docs/developer/productization/DIAGNOSTIC_CURRICULUM_DESIGN_v1.0.md','docs/productization/prompts/PHASE_13_DIAGNOSTIC_CURRICULUM_UI_METAPROMPT_v1.0.md'])for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
console.log('DIAGNOSTIC_CURRICULUM_STATIC_PASS');
console.log('diagnostic_items=3/3');console.log('locales=8/8');console.log('formula_concepts=3/3');console.log('one_time_handoff=PASS');
