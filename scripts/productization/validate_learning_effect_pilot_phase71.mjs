import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const required=[
  'developer/contracts/learning-effect-pilot-v1.0.json','developer/src/analytics/learning-effect-pilot.mjs',
  'infra/database/migrations/0036_learning_effect_pilot.sql','infra/database/migrations/0036_learning_effect_pilot_rollback.sql',
  'infra/database/seeds/0012_learning_effect_pilot.sql','infra/database/tests/0036_learning_effect_pilot_smoke.sql',
  'docs/developer/productization/LEARNING_EFFECT_PILOT_ANALYSIS_PLAN_v1.0.md',
  'docs/productization/prompts/PHASE_71_LEARNING_EFFECT_PILOT_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_71_LEARNING_EFFECT_PILOT_READINESS_QA.json',
  'docs/productization/reports/PHASE_71_LEARNING_EFFECT_PILOT_READINESS_REPORT.md',
  'tests/unit/analytics/learning-effect-pilot.test.mjs','tests/integration/api-learning-effect-pilot-readiness.test.mjs'
];
const missing=required.filter(file=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);

const contract=JSON.parse(readFileSync(resolve(root,required[0]),'utf8'));
if(contract.requirement_id!=='D80-06'||contract.pilot.minimum_participants!==100||contract.pilot.minimum_duration_weeks!==8||contract.pilot.maximum_duration_weeks!==12)throw new Error('pilot threshold contract invalid');
if(contract.pilot.cohorts.length!==2||contract.pilot.timepoints.length!==3||contract.metrics.primary.length!==2||contract.metrics.drivers.length!==2||contract.metrics.guardrails.length!==4)throw new Error('pilot KPI hierarchy invalid');
if(contract.privacy.direct_identity_fields!==false||contract.privacy.raw_answers!==false||contract.privacy.problem_text!==false)throw new Error('pilot privacy boundary invalid');
if(contract.truth_boundary.actual_participants!==0||contract.truth_boundary.independent_analysis_available!==false||contract.truth_boundary.learning_effect_proven!==false||contract.truth_boundary.market_score_80_confirmed!==false)throw new Error('pilot truth boundary invalid');

const up=readFileSync(resolve(root,required[2]),'utf8');
const down=readFileSync(resolve(root,required[3]),'utf8');
const tables=['learning_effect_pilot_protocol','learning_effect_pilot_cohort','learning_effect_pilot_metric','learning_effect_pilot_participant','learning_effect_pilot_measurement','learning_effect_pilot_analysis_result'];
for(const table of tables){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['minimum_participants >= 100','duration_weeks BETWEEN 8 AND 12','prevent_locked_pilot_protocol_mutation','pseudonymous_key_hash','FOREIGN KEY (cohort_id,protocol_id)','FOREIGN KEY (participant_id,protocol_id)','FOREIGN KEY (metric_id,protocol_id)','REVOKE ALL'])if(!up.includes(token))throw new Error(`database control missing: ${token}`);
for(const forbidden of ['participant_name','email_address','phone_number','raw_answer','problem_text'])if(up.includes(forbidden))throw new Error(`direct or raw field forbidden: ${forbidden}`);

const seed=readFileSync(resolve(root,required[4]),'utf8');
for(const forbidden of ['INSERT INTO mathchakchak.learning_effect_pilot_participant','INSERT INTO mathchakchak.learning_effect_pilot_measurement','INSERT INTO mathchakchak.learning_effect_pilot_analysis_result'])if(seed.includes(forbidden))throw new Error(`synthetic field evidence forbidden: ${forbidden}`);
if(!seed.includes("'DRAFT_EXTERNAL_REVIEW'")||!seed.includes("'PENDING_EXTERNAL_APPROVAL'"))throw new Error('seed must remain externally blocked');
const plan=readFileSync(resolve(root,required[6]));
const planHash=createHash('sha256').update(plan).digest('hex');
if(!seed.includes(planHash))throw new Error('analysis plan hash is not bound to pilot seed');

const repository=readFileSync(resolve(root,'developer/src/api/repository.mjs'),'utf8');
const server=readFileSync(resolve(root,'developer/src/api/server.mjs'),'utf8');
if(!repository.includes('getLearningEffectPilotReadiness')||!repository.includes('assertPrivacyOperator'))throw new Error('admin repository boundary missing');
if(!server.includes('/api/v1/admin/learning-effect-pilot/readiness'))throw new Error('pilot readiness endpoint missing');

console.log('LEARNING_EFFECT_PILOT_PHASE71_STATIC_PASS');
console.log('pilot_threshold=100_participants_8_to_12_weeks');
console.log('kpis=2_primary_2_drivers_4_guardrails');
console.log('direct_identity_fields=0');
console.log('actual_participants=0');
console.log('field_pilot=BLOCKED_EXTERNAL');
