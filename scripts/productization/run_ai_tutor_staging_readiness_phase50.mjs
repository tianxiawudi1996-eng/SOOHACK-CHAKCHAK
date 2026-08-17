import fs from 'node:fs';
import crypto from 'node:crypto';
import {evaluateTutorStagingReadiness,inspectStagingReadinessRegister} from '../../developer/src/agent/tutor-staging-readiness.mjs';

const registerPath='docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json';
const contractPath='developer/contracts/ai-tutor-staging-readiness-v1.json';
const composePath='infra/deployment/compose.api-staging.yaml';
const outputPath='docs/productization/evidence/PHASE_50_AI_TUTOR_STAGING_READINESS_QA.json';
const registerBytes=fs.readFileSync(registerPath),contractBytes=fs.readFileSync(contractPath);
const register=JSON.parse(registerBytes),compose=fs.readFileSync(composePath,'utf8');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const scenarios=[];
const record=(id,passed,observed)=>scenarios.push({id,passed,observed});

{
  const result=evaluateTutorStagingReadiness(register);
  record('current-register-blocked',result.status==='BLOCKED_EXTERNAL'&&result.verified_controls===0&&result.pending_controls.length===10,
    {status:result.status,verified:`${result.verified_controls}/${result.required_controls}`,pending:result.pending_controls.length});
}
{
  const candidate=clone(register);
  candidate.controls=candidate.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  const result=evaluateTutorStagingReadiness(candidate);
  record('authorization-required',result.verified_controls===10&&!result.authorization_valid&&!result.ready_for_canary,
    {verified:`${result.verified_controls}/${result.required_controls}`,authorization_valid:result.authorization_valid});
}
{
  const candidate=clone(register);
  candidate.controls=candidate.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  candidate.authorization={status:'APPROVED',approval_reference:'PO-APPROVAL-REF',approved_at:'2026-08-10T16:20:00+09:00',approval_inferred:false};
  const result=evaluateTutorStagingReadiness(candidate);
  record('synthetic-complete-packet-canary-ready',result.ready_for_canary&&result.execution_authorized===false,
    {status:result.status,execution_authorized:result.execution_authorized});
}
{
  const candidate=clone(register);
  candidate.controls[1].id=candidate.controls[0].id;
  const failures=inspectStagingReadinessRegister(candidate);
  record('duplicate-control-rejected',failures.includes('DUPLICATE_CONTROL_ID'),{failures});
}
{
  const candidate=clone(register);
  candidate.controls=candidate.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T16:10:00+09:00'}));
  candidate.controls[1].evidence_reference='sk-exampleSecretMaterial123456';
  const failures=inspectStagingReadinessRegister(candidate);
  record('secret-material-rejected',failures.includes('SECRET_MATERIAL_DETECTED'),{secret_material_detected:failures.includes('SECRET_MATERIAL_DETECTED')});
}
{
  const safeDefaults=[
    'TUTOR_AI_ENABLED: ${TUTOR_AI_ENABLED:-false}',
    'TUTOR_AI_KILL_SWITCH: ${TUTOR_AI_KILL_SWITCH:-true}',
    'TUTOR_AI_MODEL: ${TUTOR_AI_MODEL:-gpt-5.6-sol}',
    'TUTOR_AI_PROMPT_VERSION: ${TUTOR_AI_PROMPT_VERSION:-mathchakchak-tutor-duo-v1.0.0}'
  ];
  const passed=safeDefaults.every((marker)=>compose.includes(marker))&&!/\bsk-[A-Za-z0-9_-]{8,}\b/.test(compose);
  record('staging-compose-fail-closed',passed,{markers:safeDefaults.length,literal_secret:false});
}

const passed=scenarios.filter((scenario)=>scenario.passed).length;
const current=evaluateTutorStagingReadiness(register);
const evidence={
  schema_version:'1.0.0',phase:50,generated_at:new Date().toISOString(),
  status:passed===scenarios.length&&current.status==='BLOCKED_EXTERNAL'
    ?'AUTO_QA_PASS_LOCAL_STAGING_PACKET_BLOCKED_EXTERNAL':'FAIL',
  current_readiness:current,
  summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},
  scenarios,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),
  register_sha256:crypto.createHash('sha256').update(registerBytes).digest('hex'),
  external_actions:{provider_live_tested:false,api_key_accessed:false,openai_project_configured:false,external_deployment_performed:false},
  next_authorized_action:'COLLECT_REFERENCE_ONLY_EVIDENCE_FOR_10_CONTROLS'
};
fs.writeFileSync(outputPath,`${JSON.stringify(evidence,null,2)}\n`);
if(evidence.status!=='AUTO_QA_PASS_LOCAL_STAGING_PACKET_BLOCKED_EXTERNAL'){
  console.error('PHASE50_STAGING_READINESS_FAIL');
  scenarios.filter((scenario)=>!scenario.passed).forEach((scenario)=>console.error(scenario.id));
  process.exit(1);
}
console.log('PHASE50_STAGING_READINESS_PASS');
console.log(`local_scenarios=${passed}/${scenarios.length}`);
console.log('external_controls=0/10');
console.log('ready_for_canary=false');
console.log('execution_authorized=false');
