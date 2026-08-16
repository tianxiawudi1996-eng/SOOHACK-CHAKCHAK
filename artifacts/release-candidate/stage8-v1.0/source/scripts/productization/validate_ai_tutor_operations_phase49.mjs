import fs from 'node:fs';
import crypto from 'node:crypto';

const failures=[];
const required=[
  'developer/contracts/ai-tutor-operations-v1.json','developer/src/agent/tutor-operations.mjs',
  'tests/unit/agent/tutor-operations.test.mjs','docs/productization/evidence/PHASE_49_AI_TUTOR_OPERATIONS_QA.json',
  'docs/agent/productization/PHASE_49_AI_TUTOR_OPERATIONS_EXECUTION_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_OPERATIONS_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_49_AI_TUTOR_OPERATIONS_REPORT.md'
];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
if(!failures.length){
  const contractBytes=fs.readFileSync(required[0]),contract=JSON.parse(contractBytes);
  const source=fs.readFileSync(required[1],'utf8');
  const evidence=JSON.parse(fs.readFileSync(required[3],'utf8'));
  if(contract.feature_flags.TUTOR_AI_ENABLED_default!==false||contract.feature_flags.fail_closed!==true)failures.push('FEATURE_FLAG_BOUNDARY');
  if(contract.version_pins.approved_model_reference!=='gpt-5.6-sol'||contract.version_pins.immutable_provider_snapshot_verified!==false)failures.push('MODEL_PIN_BOUNDARY');
  if(contract.runtime_envelope.automatic_application_retries!==0||contract.circuit_breaker.failure_threshold!==3)failures.push('FAILURE_CONTROL_BOUNDARY');
  for(const marker of ['FEATURE_DISABLED','EMERGENCY_KILL_SWITCH','VERSION_PIN_MISMATCH','BUDGET_EXHAUSTED','CIRCUIT_OPEN','HALF_OPEN','isProviderConfigurationApproved','provider_attempts_daily','provider_latency_ms_average']){
    if(!source.includes(marker))failures.push(`CONTROL_MISSING:${marker}`);
  }
  const hash=crypto.createHash('sha256').update(contractBytes).digest('hex');
  if(evidence.contract_sha256!==hash)failures.push('CONTRACT_HASH_MISMATCH');
  if(evidence.status!=='AUTO_QA_PASS_LOCAL_OPERATIONS_CONTROL'||evidence.summary.scenarios!==7||evidence.summary.passed!==7)failures.push('DRILL_FAILED');
  if(evidence.external_provider_live_tested!==false||evidence.openai_api_key_accessed!==false||evidence.external_deployment_performed!==false)failures.push('EXTERNAL_BOUNDARY_FALSE_CLAIM');
}
if(failures.length){console.error('PHASE49_AI_TUTOR_OPERATIONS_AUDIT_FAIL');failures.forEach((failure)=>console.error(failure));process.exit(1);}
console.log('PHASE49_AI_TUTOR_OPERATIONS_AUDIT_PASS');
console.log('operational_drills=7/7');
console.log('feature_default=OFF');
console.log('provider_live_tested=false');
