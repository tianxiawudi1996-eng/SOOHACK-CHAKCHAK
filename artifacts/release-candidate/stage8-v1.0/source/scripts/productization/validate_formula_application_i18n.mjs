import fs from 'node:fs';
import path from 'node:path';
import {APPLICATION_TASK_BANK,assertApplicationTaskBank} from './formula-application-task-bank.mjs';
import {APPLICATION_LOCALES,localizeApplicationTask} from './formula-application-locales.mjs';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`FORMULA_APPLICATION_I18N_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/formula-application-i18n-contract.json'));
const formulas=JSON.parse(read(contract.catalog));
const legacy=JSON.parse(read('infra/database/catalog/formula-application-cases.ko.json'));
const migration=read(contract.migration);const rollback=read(contract.rollback);const seed=read(contract.seed);
const repository=read('developer/src/api/repository.mjs');const app=read('client/curriculum/app.js');const html=read('client/curriculum/index.html');const compose=read('infra/deployment/compose.api-staging.yaml');
try{assertApplicationTaskBank(formulas.items);}catch(error){fail(error.message);}
const tasks=Object.values(APPLICATION_TASK_BANK).flat();
if(contract.database!=='PostgreSQL'||contract.formula_count!==72||contract.previously_covered_formulas!==12||contract.expanded_formulas!==60)fail('formula coverage contract');
if(contract.item_count!==216||contract.items_per_formula!==3||tasks.length!==216)fail('item coverage contract');
if(contract.locales.join('|')!==APPLICATION_LOCALES.join('|')||contract.translation_count!==1728)fail('locale coverage contract');
if(new Set(legacy.items.map((item)=>item.formula_semantic_key)).size!==12)fail('legacy representative coverage');
if(new Set(tasks.map((item)=>item.kind)).size!==4||tasks.some((item)=>/[가-힣]/.test(item.exercise)))fail('task kind or locale-neutral exercise');
for(const locale of APPLICATION_LOCALES){
  const localized=tasks.map((task)=>localizeApplicationTask(task,locale));
  if(localized.length!==216||localized.some((item)=>!item.prompt||!item.value_label||!item.unit_label))fail(`locale incomplete ${locale}`);
}
for(const token of ['formula_application_item_translation','unit_required',"'zh-CN'","PRIMARY KEY (application_item_id,locale)"])if(!migration.includes(token))fail(`migration missing ${token}`);
for(const token of ['DROP TABLE IF EXISTS mathchakchak.formula_application_item_translation','DROP COLUMN IF EXISTS unit_required'])if(!rollback.includes(token))fail(`rollback missing ${token}`);
const itemReferenceCount=(seed.match(/:application:[123]:v1/g)||[]).length/5;
if(itemReferenceCount!==216*9)fail(`seed item references ${itemReferenceCount}/${216*9}`);
for(const locale of APPLICATION_LOCALES)if(!seed.includes(`'${locale}'`))fail(`seed locale missing ${locale}`);
const publicMethod=repository.slice(repository.indexOf('async getFormulaApplicationChecks'),repository.indexOf('async addFormulaApplicationAttempt'));
for(const token of ['formula_application_item_translation','requested.locale=$2','unit_required','content_locale'])if(!publicMethod.includes(token))fail(`public locale query missing ${token}`);
if(/answer_schema|misconception_rules|accepted_values|accepted_units/.test(publicMethod))fail('public query exposes scoring material');
if(/answer_schema|accepted_values|accepted_units/.test(app))fail('client contains scoring material');
for(const id of ['applicationValueLabel','applicationUnitField','applicationUnitLabel'])if(!html.includes(`id="${id}"`))fail(`localized UI missing ${id}`);
for(const locale of APPLICATION_LOCALES.filter((item)=>item!=='en'&&item!=='ko'))if(!app.includes(`${locale.includes('-')?`'${locale}'`:locale}:{applicationCta`))fail(`runtime feedback locale missing ${locale}`);
for(const mount of ['0009_formula_application_i18n.sql','0007_formula_application_i18n.sql'])if(!compose.includes(mount))fail(`compose mount missing ${mount}`);
for(const doc of ['docs/developer/productization/FORMULA_APPLICATION_I18N_DESIGN_v1.0.md','docs/productization/prompts/PHASE_18_FORMULA_APPLICATION_I18N_METAPROMPT_v1.0.md'])for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
console.log('FORMULA_APPLICATION_I18N_STATIC_PASS');
console.log('formulas=72/72');console.log('expanded_formulas=60/60');console.log('items=216/216');console.log('locales=8/8');console.log('translations=1728/1728');console.log('answer_exposed=false');
