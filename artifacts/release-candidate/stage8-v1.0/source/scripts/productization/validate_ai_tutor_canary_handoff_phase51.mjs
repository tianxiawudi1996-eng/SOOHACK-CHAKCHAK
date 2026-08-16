import crypto from 'node:crypto';
import fs from 'node:fs';

const failures=[];
const required=[
  'developer/contracts/ai-tutor-controlled-canary-v1.json',
  'developer/src/agent/tutor-canary-handoff.mjs',
  'docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json',
  'docs/productization/evidence/PHASE_51_AI_TUTOR_CANARY_HANDOFF_QA.json',
  'tests/unit/agent/tutor-canary-handoff.test.mjs',
  'docs/agent/productization/PHASE_51_AI_TUTOR_CONTROLLED_CANARY_HANDOFF_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_CONTROLLED_CANARY_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_51_AI_TUTOR_CANARY_HANDOFF_REPORT.md'
];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
if(!failures.length){
  const contractBytes=fs.readFileSync(required[0]),contract=JSON.parse(contractBytes);
  const source=fs.readFileSync(required[1],'utf8');
  const registerBytes=fs.readFileSync(required[2]),register=JSON.parse(registerBytes);
  const evidence=JSON.parse(fs.readFileSync(required[3],'utf8'));
  const readinessBytes=fs.readFileSync('docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json');
  if(contract.canary_limits.max_requests!==8||contract.canary_limits.concurrency!==1||contract.canary_limits.max_retries_per_request!==0)failures.push('CANARY_LIMIT_BOUNDARY');
  if(contract.privacy_and_safety.request_content_storage!==false||contract.privacy_and_safety.student_data_allowed!==false||contract.exit_policy.execution_authorized_by_this_contract!==false)failures.push('PRIVACY_EXECUTION_BOUNDARY');
  if(register.status!=='BLOCKED_EXTERNAL'||register.execution_window.status!=='PENDING_EXTERNAL'||register.result_records.length!==0)failures.push('REGISTER_MUST_REMAIN_PRE_EXECUTION');
  for(const field of ['execution_authorized','provider_live_tested','api_key_accessed','dispatch_performed','external_deployment_performed'])if(register[field]!==false)failures.push(`REGISTER_EXTERNAL_ACTION:${field}`);
  if(register.source_readiness.register_sha256!==crypto.createHash('sha256').update(readinessBytes).digest('hex'))failures.push('SOURCE_READINESS_HASH');
  for(const marker of ['READY_FOR_CANARY_HANDOFF','CANARY_HANDOFF_NOT_READY','SECRET_MATERIAL_DETECTED','HASHED_SYNTHETIC_SESSION'])if(!source.includes(marker))failures.push(`SOURCE_MARKER:${marker}`);
  if(evidence.contract_sha256!==crypto.createHash('sha256').update(contractBytes).digest('hex'))failures.push('CONTRACT_HASH');
  if(evidence.canary_register_sha256!==crypto.createHash('sha256').update(registerBytes).digest('hex'))failures.push('CANARY_REGISTER_HASH');
  if(evidence.readiness_register_sha256!==crypto.createHash('sha256').update(readinessBytes).digest('hex'))failures.push('READINESS_REGISTER_HASH');
  if(evidence.status!=='AUTO_QA_PASS_LOCAL_CANARY_HANDOFF_BLOCKED_EXTERNAL'||evidence.summary.passed!==7||evidence.current_handoff.status!=='BLOCKED_EXTERNAL')failures.push('QA_RESULT');
  if(Object.values(evidence.external_actions).some(Boolean))failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}
if(failures.length){console.error('PHASE51_CANARY_HANDOFF_AUDIT_FAIL');failures.forEach((failure)=>console.error(failure));process.exit(1);}
console.log('PHASE51_CANARY_HANDOFF_AUDIT_PASS');
console.log('canary_slots=8/8');
console.log('current_handoff=BLOCKED_EXTERNAL');
console.log('execution_authorized=false');
