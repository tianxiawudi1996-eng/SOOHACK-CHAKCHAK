import fs from 'node:fs';
import crypto from 'node:crypto';

const failures=[];
const required=[
  'developer/contracts/ai-tutor-staging-readiness-v1.json',
  'developer/src/agent/tutor-staging-readiness.mjs',
  'docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json',
  'docs/productization/evidence/PHASE_50_AI_TUTOR_STAGING_READINESS_QA.json',
  'tests/unit/agent/tutor-staging-readiness.test.mjs',
  'docs/agent/productization/PHASE_50_AI_TUTOR_STAGING_READINESS_EXECUTION_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_STAGING_ENABLEMENT_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_50_AI_TUTOR_STAGING_READINESS_REPORT.md'
];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
if(!failures.length){
  const contractBytes=fs.readFileSync(required[0]),contract=JSON.parse(contractBytes);
  const source=fs.readFileSync(required[1],'utf8');
  const registerBytes=fs.readFileSync(required[2]),register=JSON.parse(registerBytes);
  const evidence=JSON.parse(fs.readFileSync(required[3],'utf8'));
  const compose=fs.readFileSync('infra/deployment/compose.api-staging.yaml','utf8');
  if(contract.required_controls.length!==10||contract.activation_policy.kill_switch_default!==true||contract.activation_policy.production_enablement!==false)failures.push('CONTRACT_BOUNDARY');
  if(register.controls.length!==10||register.controls.some((control)=>control.status!=='PENDING_EXTERNAL'))failures.push('REGISTER_MUST_REMAIN_EMPTY');
  if(register.execution_authorized!==false||register.provider_live_tested!==false||register.api_key_accessed!==false)failures.push('EXTERNAL_ACTION_FALSE_CLAIM');
  for(const marker of ['BLOCKED_EXTERNAL','READY_FOR_CONTROLLED_STAGING_CANARY','SECRET_MATERIAL_DETECTED','authorization_valid'])if(!source.includes(marker))failures.push(`SOURCE_MARKER:${marker}`);
  for(const marker of ['TUTOR_AI_ENABLED: ${TUTOR_AI_ENABLED:-false}','TUTOR_AI_KILL_SWITCH: ${TUTOR_AI_KILL_SWITCH:-true}','TUTOR_AI_MODEL: ${TUTOR_AI_MODEL:-gpt-5.6-sol}'])if(!compose.includes(marker))failures.push(`COMPOSE_MARKER:${marker}`);
  if(/\bsk-[A-Za-z0-9_-]{8,}\b/.test(compose))failures.push('COMPOSE_LITERAL_SECRET');
  if(evidence.contract_sha256!==crypto.createHash('sha256').update(contractBytes).digest('hex'))failures.push('CONTRACT_HASH');
  if(evidence.register_sha256!==crypto.createHash('sha256').update(registerBytes).digest('hex'))failures.push('REGISTER_HASH');
  if(evidence.status!=='AUTO_QA_PASS_LOCAL_STAGING_PACKET_BLOCKED_EXTERNAL'||evidence.summary.passed!==6||evidence.current_readiness.verified_controls!==0||evidence.current_readiness.ready_for_canary!==false)failures.push('QA_RESULT');
  if(Object.values(evidence.external_actions).some(Boolean))failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}
if(failures.length){console.error('PHASE50_STAGING_READINESS_AUDIT_FAIL');failures.forEach((failure)=>console.error(failure));process.exit(1);}
console.log('PHASE50_STAGING_READINESS_AUDIT_PASS');
console.log('required_controls=10');
console.log('verified_controls=0');
console.log('execution_authorized=false');
