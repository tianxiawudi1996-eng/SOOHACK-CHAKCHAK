import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const files=[
  'developer/contracts/daechi-field-pilot-v1.0.json',
  'developer/src/analytics/daechi-field-pilot.mjs',
  'infra/database/migrations/0039_daechi_field_pilot.sql',
  'infra/database/migrations/0039_daechi_field_pilot_rollback.sql',
  'infra/database/seeds/0015_daechi_field_pilot.sql',
  'infra/database/tests/0039_daechi_field_pilot_smoke.sql',
  'docs/developer/productization/DAECHI_FIELD_PILOT_READINESS_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_74_DAECHI_FIELD_PILOT_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_74_DAECHI_FIELD_PILOT_QA.json',
  'docs/productization/reports/PHASE_74_DAECHI_FIELD_PILOT_READINESS_REPORT.md',
  'tests/unit/analytics/daechi-field-pilot.test.mjs',
  'tests/integration/api-daechi-field-pilot-readiness.test.mjs'
];
const missing=files.filter(file=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing:${missing.join(',')}`);

const contract=JSON.parse(readFileSync(resolve(root,files[0]),'utf8'));
if(contract.requirement_id!=='D80-09'||contract.pilot.minimum_academies!==2||contract.pilot.maximum_academies!==3||contract.pilot.required_metrics.length!==6)throw new Error('contract invalid');
if(contract.privacy.academy_name||contract.privacy.academy_address||contract.privacy.personal_contact||contract.privacy.student_identifier||contract.privacy.raw_answer||contract.privacy.raw_survey_response)throw new Error('privacy boundary invalid');
if(contract.truth_boundary.actual_academies!==0||contract.truth_boundary.actual_students!==0||contract.truth_boundary.actual_independent_results!==0||contract.truth_boundary.daechi_fit_proven||contract.truth_boundary.market_score_80_confirmed)throw new Error('truth boundary invalid');

const up=readFileSync(resolve(root,files[2]),'utf8');
const down=readFileSync(resolve(root,files[3]),'utf8');
const tables=['daechi_field_pilot_protocol','daechi_field_pilot_metric','daechi_field_pilot_academy','daechi_field_pilot_observation','daechi_field_pilot_issue','daechi_field_pilot_result','daechi_field_pilot_product_review'];
for(const table of tables){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`)||!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`migration symmetry:${table}`);
}
for(const marker of ['minimum_academies = 2','maximum_academies = 3','Daechi field pilot evidence history is append-only','REVOKE ALL'])if(!up.includes(marker))throw new Error(`db control:${marker}`);
for(const forbidden of ['academy_name','academy_address','personal_contact','student_identifier','raw_answer','raw_survey_response'])if(up.includes(forbidden))throw new Error(`forbidden field:${forbidden}`);

const seed=readFileSync(resolve(root,files[4]),'utf8');
const designHash=createHash('sha256').update(readFileSync(resolve(root,files[6]))).digest('hex');
if(!seed.includes(designHash)||!seed.includes("'DRAFT_EXTERNAL_REVIEW'"))throw new Error('seed binding');
for(const table of ['daechi_field_pilot_academy','daechi_field_pilot_observation','daechi_field_pilot_issue','daechi_field_pilot_result','daechi_field_pilot_product_review'])if(seed.includes(`INSERT INTO mathchakchak.${table}`))throw new Error(`synthetic evidence:${table}`);

const repo=readFileSync(resolve(root,'developer/src/api/repository.mjs'),'utf8');
const server=readFileSync(resolve(root,'developer/src/api/server.mjs'),'utf8');
if(!repo.includes('getDaechiFieldPilotReadiness')||!server.includes('/api/v1/admin/daechi-field-pilot/readiness'))throw new Error('api missing');

const evidence=JSON.parse(readFileSync(resolve(root,files[8]),'utf8'));
if(evidence.status!=='LOCAL_FIELD_PILOT_PLATFORM_PASS_ACTUAL_ACADEMY_EVIDENCE_BLOCKED_EXTERNAL'||evidence.coverage.actual_academies!==0||evidence.truth_boundary.market_score_80_confirmed)throw new Error('evidence truth invalid');

console.log('DAECHI_FIELD_PILOT_PHASE74_STATIC_PASS');
console.log('academy_range=2..3 required_metrics=6/6');
console.log('actual_academies=0 actual_students=0');
console.log('daechi_fit=BLOCKED_EXTERNAL');
