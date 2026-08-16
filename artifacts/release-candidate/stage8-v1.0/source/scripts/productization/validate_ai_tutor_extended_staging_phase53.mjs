import crypto from 'node:crypto';
import fs from 'node:fs';

const failures=[];
const required=['developer/contracts/ai-tutor-extended-staging-observation-v1.json','developer/src/agent/tutor-extended-staging-observation.mjs','docs/productization/evidence/PHASE_53_EXTENDED_STAGING_OBSERVATION_REGISTER.json','docs/productization/evidence/PHASE_53_AI_TUTOR_EXTENDED_STAGING_QA.json','tests/unit/agent/tutor-extended-staging-observation.test.mjs','docs/agent/productization/PHASE_53_AI_TUTOR_EXTENDED_STAGING_OBSERVATION_METAPROMPT_v1.0.md','docs/developer/productization/AI_TUTOR_EXTENDED_STAGING_OBSERVATION_RUNBOOK_v1.0.md','docs/productization/reports/PHASE_53_AI_TUTOR_EXTENDED_STAGING_REPORT.md'];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
if(!failures.length){
  const contractBytes=fs.readFileSync(required[0]),contract=JSON.parse(contractBytes);const source=fs.readFileSync(required[1],'utf8');
  const registerBytes=fs.readFileSync(required[2]),register=JSON.parse(registerBytes);const evidence=JSON.parse(fs.readFileSync(required[3],'utf8'));
  const phase52Bytes=fs.readFileSync('docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json');
  if(contract.observation_policy.locales.length!==8||contract.observation_policy.total_planned_samples!==80||contract.observation_policy.maximum_window_hours!==24)failures.push('CONTRACT_OBSERVATION_BOUNDARY');
  if(contract.decision_policy.single_product_owner_authorization!==true||contract.decision_policy.automatic_execution!==false||contract.decision_policy.automatic_production_promotion!==false)failures.push('CONTRACT_DECISION_BOUNDARY');
  if(register.status!=='BLOCKED_EXTERNAL'||register.observation_started!==false||register.observation_records.length!==0)failures.push('REGISTER_MUST_REMAIN_PRE_EXECUTION');
  for(const key of ['execution_authorized','provider_live_tested','api_key_accessed','production_traffic','student_traffic','production_promotion_allowed'])if(register[key]!==false)failures.push(`EXTERNAL_ACTION_FALSE_CLAIM:${key}`);
  if(register.source_canary_results.register_sha256!==crypto.createHash('sha256').update(phase52Bytes).digest('hex'))failures.push('SOURCE_RESULT_HASH');
  for(const marker of ['READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF','OBSERVATION_PLAN_CHANGED','PROJECT_THRESHOLDS_CHANGED','SECRET_MATERIAL_DETECTED'])if(!source.includes(marker))failures.push(`SOURCE_MARKER:${marker}`);
  if(evidence.contract_sha256!==crypto.createHash('sha256').update(contractBytes).digest('hex'))failures.push('CONTRACT_HASH');
  if(evidence.observation_register_sha256!==crypto.createHash('sha256').update(registerBytes).digest('hex'))failures.push('OBSERVATION_REGISTER_HASH');
  if(evidence.source_result_register_sha256!==crypto.createHash('sha256').update(phase52Bytes).digest('hex'))failures.push('SOURCE_REGISTER_HASH');
  if(evidence.status!=='AUTO_QA_PASS_LOCAL_EXTENDED_STAGING_OBSERVATION_BLOCKED_EXTERNAL'||evidence.summary.passed!==7||evidence.current_readiness.total_planned_samples!==80)failures.push('QA_RESULT');
  if(Object.values(evidence.external_actions).some(Boolean))failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}
if(failures.length){console.error('PHASE53_EXTENDED_STAGING_OBSERVATION_AUDIT_FAIL');failures.forEach((failure)=>console.error(failure));process.exit(1);}
console.log('PHASE53_EXTENDED_STAGING_OBSERVATION_AUDIT_PASS');console.log('locales=8/8');console.log('planned_samples=80');console.log('current_observation_records=0');console.log('production_promotion_allowed=false');
