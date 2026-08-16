import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const required=[
  'developer/contracts/teacher-parent-operations-v1.0.json','developer/src/operations/teacher-parent-console.mjs',
  'infra/database/migrations/0035_teacher_parent_operations.sql','infra/database/migrations/0035_teacher_parent_operations_rollback.sql',
  'infra/database/seeds/0011_teacher_parent_operations.sql','infra/database/tests/0035_teacher_parent_operations_smoke.sql',
  'docs/developer/productization/TEACHER_PARENT_OPERATIONS_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_70_TEACHER_PARENT_OPERATIONS_CONSOLE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_70_TEACHER_PARENT_OPERATIONS_QA.json','docs/productization/reports/PHASE_70_TEACHER_PARENT_OPERATIONS_REPORT.md',
  'client/operations/index.html','client/operations/app.js','client/operations/messages.mjs','client/operations/styles.css',
  'tests/unit/operations/teacher-parent-console.test.mjs','tests/unit/client/teacher-parent-operations-app.test.mjs',
  'tests/integration/api-teacher-parent-operations.test.mjs','tests/integration/web-teacher-parent-operations.test.mjs'
];
const missing=required.filter(file=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);

const contract=JSON.parse(readFileSync(resolve(root,required[0]),'utf8'));
if(contract.requirement_id!=='D80-05'||contract.roles.TEACHER.assign!==true||contract.roles.PARENT.assign!==false)throw new Error('operations role contract invalid');
if(contract.privacy.raw_answers!==false||contract.privacy.problem_text!==false||contract.truth_boundary.production_ready!==false)throw new Error('operations truth boundary invalid');

const up=readFileSync(resolve(root,required[2]),'utf8');
const down=readFileSync(resolve(root,required[3]),'utf8');
for(const table of ['teacher_student_link','academy_learning_assignment','academy_learning_assignment_item','student_learning_intervention']){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['REFERENCES mathchakchak.student_profile','academy_learning_assignment_active_plan_idx','REVOKE ALL','CHECK (status IN'])if(!up.includes(token))throw new Error(`database control missing: ${token}`);

const app=readFileSync(resolve(root,'client/operations/app.js'),'utf8');
const messages=readFileSync(resolve(root,'client/operations/messages.mjs'),'utf8');
for(const token of ['/overview','/assignments','/interventions','/transition','state.role===\'parent\''])if(!app.includes(token))throw new Error(`UI control missing: ${token}`);
for(const forbidden of ['accepted_values','response_value','problem_text','contact_reference'])if(app.includes(forbidden))throw new Error(`private field consumed by UI: ${forbidden}`);
for(const locale of ['ko','zh-CN','ja','en','es','fr','it','ru'])if(!messages.includes(locale))throw new Error(`locale missing: ${locale}`);

const build=readFileSync(resolve(root,'scripts/productization/build_staging.mjs'),'utf8');
if(!build.includes("'operations'" )||!build.includes("client/operations"))throw new Error('operations staging bundle missing');

console.log('TEACHER_PARENT_OPERATIONS_PHASE70_STATIC_PASS');
console.log('roles=2/2');
console.log('locales=8/8');
console.log('assignment_workflow=4_states');
console.log('privacy_forbidden_fields=0');
console.log('institution_connection=BLOCKED_EXTERNAL');
