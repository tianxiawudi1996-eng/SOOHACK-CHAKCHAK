import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`FORMULA_RECALL_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/formula-recall-contract.json'));
const catalog=JSON.parse(read('infra/database/catalog/k12-formulas.ko.json'));
const migration=read(contract.migration);
const rollback=read(contract.rollback);
const seed=read(contract.seed);
const repository=read('developer/src/api/repository.mjs');
const server=read('developer/src/api/server.mjs');
const app=read('client/curriculum/app.js');
const html=read('client/curriculum/index.html');
const css=read('client/curriculum/styles.css');
const compose=read('infra/deployment/compose.api-staging.yaml');

if(contract.database!=='PostgreSQL'||contract.assessment_kind!=='FORMULA_RECOGNITION')fail('database or assessment kind invalid');
if(contract.item_count!==72||contract.items_per_formula!==1||contract.choices_per_item!==4)fail('72-item coverage contract invalid');
if(contract.score_name!=='recall_score'||contract.mathematical_application_mastery_claimed!==false)fail('score boundary invalid');
if(contract.answer_schema_exposed_to_client!==false)fail('answer exposure contract invalid');
if(catalog.items.length!==72||new Set(catalog.items.map((item)=>item.grade_code)).size!==12)fail('catalog coverage changed');

for(const table of ['formula_recall_item','formula_recall_attempt','student_formula_recall_progress']){
  if(!migration.includes(`CREATE TABLE mathchakchak.${table}`))fail(`migration missing ${table}`);
  if(!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))fail(`rollback missing ${table}`);
}
for(const token of ["jsonb_array_length(choices)=4","assessment_kind='FORMULA_RECOGNITION'",'recall_score numeric(5,4)','COMPLETED_MATCHING_COLLABORATION_REQUIRED']){
  if(!`${migration}\n${repository}`.includes(token))fail(`control missing ${token}`);
}
const promptCount=(seed.match(/핵심 관계로 알맞은 표현을 고르세요/g)||[]).length;
if(promptCount!==72)fail(`seed item count ${promptCount}/72`);
for(const item of catalog.items){
  if(!seed.includes(`\"value\":\"${item.semantic_key}\"`))fail(`choice missing ${item.semantic_key}`);
  if(!seed.includes(`\"correct\":{\"value\":\"${item.semantic_key}\"}`))fail(`answer missing ${item.semantic_key}`);
}

for(const method of ['getFormulaRecallCheck','addFormulaRecallAttempt'])if(!repository.includes(method))fail(`repository method missing ${method}`);
for(const endpoint of ['/recall-check','/recall-checks/'])if(!server.includes(endpoint))fail(`API endpoint missing ${endpoint}`);
const publicQuery=repository.slice(repository.indexOf('async getFormulaRecallCheck'),repository.indexOf('async addFormulaRecallAttempt'));
if(publicQuery.includes('answer_schema'))fail('answer schema selected by public query');
if(/answer_schema|correct_value/.test(app))fail('answer material present in client');
if(/localStorage|sessionStorage|document\.cookie/.test(app))fail('browser persistence forbidden');
for(const id of ['recallPanel','recallPrompt','recallChoices','recallResult'])if(!html.includes(`id="${id}"`))fail(`recall UI missing ${id}`);
for(const token of ['openRecallCheck','submitRecall','recall_score'])if(!app.includes(token))fail(`recall UI wiring missing ${token}`);
if(!css.includes('.recall-choices')||!css.includes('@media(prefers-reduced-motion:reduce)'))fail('recall responsive/accessibility styling missing');
if(!compose.includes('0007_formula_recall_check.sql')||!compose.includes('0005_formula_recall_checks.sql'))fail('compose migration or seed mount missing');

for(const doc of ['docs/developer/productization/FORMULA_RECALL_CHECK_DESIGN_v1.0.md','docs/productization/prompts/PHASE_16_FORMULA_RECALL_CHECK_METAPROMPT_v1.0.md']){
  for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
}

console.log('FORMULA_RECALL_STATIC_PASS');
console.log('items=72/72');
console.log('choices=4/4');
console.log('grades=12/12');
console.log('answer_exposed=false');
console.log('application_mastery_claim=false');
