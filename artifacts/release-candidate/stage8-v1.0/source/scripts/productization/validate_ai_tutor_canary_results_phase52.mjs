import crypto from 'node:crypto';
import fs from 'node:fs';

const failures=[];
const required=[
  'developer/contracts/ai-tutor-canary-results-v1.json',
  'developer/src/agent/tutor-canary-results.mjs',
  'docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json',
  'docs/productization/evidence/PHASE_52_AI_TUTOR_CANARY_RESULTS_QA.json',
  'tests/unit/agent/tutor-canary-results.test.mjs',
  'docs/agent/productization/PHASE_52_AI_TUTOR_CANARY_RESULTS_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_CANARY_RESULTS_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_52_AI_TUTOR_CANARY_RESULTS_REPORT.md'
];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
if(!failures.length){
  const contractBytes=fs.readFileSync(required[0]),contract=JSON.parse(contractBytes);
  const source=fs.readFileSync(required[1],'utf8');
  const registerBytes=fs.readFileSync(required[2]),register=JSON.parse(registerBytes);
  const evidence=JSON.parse(fs.readFileSync(required[3],'utf8'));
  const handoffBytes=fs.readFileSync('docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json');
  if(contract.required_results.count!==8||contract.hard_gates.length!==9||contract.decision_policy.automatic_production_promotion!==false)failures.push('CONTRACT_BOUNDARY');
  if(register.status!=='BLOCKED_EXTERNAL'||register.execution_observed!==false||register.result_records.length!==0)failures.push('REGISTER_MUST_REMAIN_EMPTY');
  if(register.api_key_accessed!==false||register.production_promotion_allowed!==false||register.provider_live_tested!==false)failures.push('EXTERNAL_ACTION_FALSE_CLAIM');
  if(register.source_handoff.register_sha256!==crypto.createHash('sha256').update(handoffBytes).digest('hex'))failures.push('SOURCE_HANDOFF_HASH');
  for(const marker of ['READY_FOR_HUMAN_CANARY_REVIEW','CANARY_REJECTED_AUTOMATICALLY','REJECT_AND_ROLLBACK','SECRET_MATERIAL_DETECTED'])if(!source.includes(marker))failures.push(`SOURCE_MARKER:${marker}`);
  if(evidence.contract_sha256!==crypto.createHash('sha256').update(contractBytes).digest('hex'))failures.push('CONTRACT_HASH');
  if(evidence.result_register_sha256!==crypto.createHash('sha256').update(registerBytes).digest('hex'))failures.push('RESULT_REGISTER_HASH');
  if(evidence.handoff_register_sha256!==crypto.createHash('sha256').update(handoffBytes).digest('hex'))failures.push('HANDOFF_REGISTER_HASH');
  if(evidence.status!=='AUTO_QA_PASS_LOCAL_CANARY_RESULTS_BLOCKED_EXTERNAL'||evidence.summary.passed!==8||evidence.current_result_intake.records_received!==0)failures.push('QA_RESULT');
  if(Object.values(evidence.external_actions).some(Boolean))failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}
if(failures.length){console.error('PHASE52_CANARY_RESULTS_AUDIT_FAIL');failures.forEach((failure)=>console.error(failure));process.exit(1);}
console.log('PHASE52_CANARY_RESULTS_AUDIT_PASS');
console.log('required_results=8');
console.log('current_results=0');
console.log('production_promotion_allowed=false');
