import fs from 'node:fs';
import path from 'node:path';
import {CURRICULUM_MESSAGES} from '../../client/curriculum/messages.mjs';
import {GRADE_CODES} from '../../client/curriculum/model.mjs';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`K12_CURRICULUM_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/k12-curriculum-contract.json'));
const catalog=JSON.parse(read(contract.catalog));
const migration=read(contract.migration);const rollback=read(contract.rollback);const seed=read(contract.seed);
const server=read('developer/src/api/server.mjs');const repository=read('developer/src/api/repository.mjs');
const collaboration=read('developer/src/learning/curriculum-collaboration.mjs');
const app=read('client/curriculum/app.js');const html=read('client/curriculum/index.html');const css=read('client/curriculum/styles.css');

if(contract.curriculum.notice_code!=='교육부 고시 제2022-33호'||contract.curriculum.annex!=='별책 8 수학과 교육과정')fail('official reference identity differs');
if(!/^[0-9a-f]{64}$/.test(contract.curriculum.source_sha256))fail('source hash invalid');
if(contract.placement_policy!=='OFFICIAL_BAND_PRODUCT_SEQUENCE'||contract.canonical_content_locale!=='ko')fail('placement or canonical locale invalid');
if(JSON.stringify(contract.grades)!==JSON.stringify(GRADE_CODES))fail('grade contract differs from client model');
if(catalog.placement_basis!==contract.placement_policy||catalog.items.length!==72)fail('catalog identity or item count invalid');
const semanticKeys=new Set();
for(const grade of GRADE_CODES){
  const items=catalog.items.filter((item)=>item.grade_code===grade);
  if(items.length<contract.minimum_formula_clusters_per_grade)fail(`formula minimum missing ${grade}`);
  for(const item of items){
    if(semanticKeys.has(item.semantic_key))fail(`duplicate semantic key ${item.semantic_key}`);
    semanticKeys.add(item.semantic_key);
    if(!['NUMBER_OPERATION','CHANGE_RELATION','GEOMETRY_MEASURE','DATA_CHANCE'].includes(item.strand))fail(`strand invalid ${item.semantic_key}`);
    if(!['RELATION','RULE','FORMULA'].includes(item.knowledge_type)||!item.notation||!item.explanation_ko||!item.source_standard_codes?.length)fail(`catalog item incomplete ${item.semantic_key}`);
    if(!seed.includes(item.semantic_key))fail(`generated seed missing ${item.semantic_key}`);
  }
}
if(!catalog.items.filter((item)=>['E1','E2'].includes(item.grade_code)).some((item)=>['RELATION','RULE'].includes(item.knowledge_type)))fail('early-grade relation model missing');
for(const grade of ['H1','H2','H3'])if(!catalog.items.filter((item)=>item.grade_code===grade).every((item)=>item.course_name))fail(`high-school course mapping missing ${grade}`);
for(const table of ['curriculum_reference','curriculum_grade','grade_formula_catalog','formula_explanation_revision','character_collaboration_policy','formula_collaboration_session']){
  if(!migration.includes(`CREATE TABLE mathchakchak.${table}`))fail(`migration missing ${table}`);
  if(!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))fail(`rollback missing ${table}`);
}
for(const endpoint of ['/api/v1/curriculum/grades','/api/v1/curriculum/collaboration-plans'])if(!server.includes(endpoint))fail(`endpoint missing ${endpoint}`);
for(const method of ['getCurriculumGrades','getGradeFormulas','createCurriculumCollaborationPlan'])if(!repository.includes(method))fail(`repository method missing ${method}`);
for(const phase of ['PRECHECK','CONCEPT_BRIDGE','FORMULA_BUILD','GUIDED_APPLICATION','VERIFY_REFLECT'])if(!collaboration.includes(phase))fail(`collaboration phase missing ${phase}`);
for(const role of ['diagnose_prerequisite','visualize_concept','derive_formula','verify_calculation'])if(!collaboration.includes(role))fail(`character responsibility missing ${role}`);
if(/localStorage|sessionStorage|document\.cookie/.test(app))fail('browser token persistence forbidden');
if(!app.includes('adaptive_route')||!app.includes('history.replaceState'))fail('collaboration request or grade URL state missing');
for(const id of ['gradeGroups','formulaGrid','collaborationPanel','routeSelect','phaseList'])if(!html.includes(`id="${id}"`))fail(`UI control missing ${id}`);
if(!/@media\(max-width:760px\)/.test(css)||!/@media\(prefers-reduced-motion:reduce\)/.test(css))fail('responsive or reduced-motion rule missing');
if(JSON.stringify(Object.keys(CURRICULUM_MESSAGES).sort())!==JSON.stringify([...contract.supported_shell_locales].sort()))fail('shell locale set invalid');
const referenceKeys=Object.keys(CURRICULUM_MESSAGES.en).sort();
for(const locale of contract.supported_shell_locales)for(const key of referenceKeys)if(CURRICULUM_MESSAGES[locale][key]===undefined)fail(`message missing ${locale}.${key}`);
for(const doc of ['docs/developer/productization/K12_CURRICULUM_COLLABORATION_DESIGN_v1.0.md','docs/productization/prompts/PHASE_14_K12_CURRICULUM_COLLABORATION_METAPROMPT_v1.0.md'])for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
console.log('K12_CURRICULUM_STATIC_PASS');
console.log('grades=12/12');console.log('formula_clusters=72/72');console.log('collaboration_phases=5/5');console.log('shell_locales=8/8');
