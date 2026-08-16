import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  buildTutorCanaryDryRunPlan,
  evaluateTutorCanaryHandoff,
  hashTutorStagingReadinessRegister,
  inspectTutorCanaryHandoffRegister
} from '../../developer/src/agent/tutor-canary-handoff.mjs';

const readinessPath='docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json';
const registerPath='docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json';
const contractPath='developer/contracts/ai-tutor-controlled-canary-v1.json';
const outputPath='docs/productization/evidence/PHASE_51_AI_TUTOR_CANARY_HANDOFF_QA.json';
const readinessBytes=fs.readFileSync(readinessPath),registerBytes=fs.readFileSync(registerPath),contractBytes=fs.readFileSync(contractPath);
const readiness=JSON.parse(readinessBytes),register=JSON.parse(registerBytes);
const readinessHash=crypto.createHash('sha256').update(readinessBytes).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const scenarios=[];
const record=(id,passed,observed)=>scenarios.push({id,passed,observed});
const verifiedReadiness=()=>{
  const value=clone(readiness);
  value.controls=value.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`SYNTHETIC-REF-${index+1}`,verified_at:'2026-08-10T16:40:00+09:00'}));
  value.authorization={status:'APPROVED',approval_reference:'SYNTHETIC-PO-APPROVAL',approved_at:'2026-08-10T16:45:00+09:00',approval_inferred:false};
  return value;
};
const approvedWindow=(sourceReadiness)=>{
  const value=clone(register);
  const hash=hashTutorStagingReadinessRegister(sourceReadiness);
  value.source_readiness.register_sha256=hash;
  value.execution_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW-REF',starts_at:'2026-08-10T17:00:00+09:00',ends_at:'2026-08-10T17:15:00+09:00'};
  return {value,hash};
};

{
  const result=evaluateTutorCanaryHandoff({readinessRegister:readiness,canaryRegister:register,expectedReadinessHash:readinessHash});
  record('current-handoff-blocked',result.status==='BLOCKED_EXTERNAL'&&result.blockers.includes('PHASE50_READINESS_BLOCKED')&&result.blockers.includes('EXECUTION_WINDOW_PENDING'),{status:result.status,blockers:result.blockers});
}
{
  const source=verifiedReadiness();
  const candidate=clone(register);
  const hash=hashTutorStagingReadinessRegister(source);
  candidate.source_readiness.register_sha256=hash;
  const result=evaluateTutorCanaryHandoff({readinessRegister:source,canaryRegister:candidate,expectedReadinessHash:hash});
  record('window-required',result.status==='BLOCKED_EXTERNAL'&&result.blockers.length===1&&result.blockers[0]==='EXECUTION_WINDOW_PENDING',{status:result.status,blockers:result.blockers});
}
{
  const source=verifiedReadiness();
  const candidate=approvedWindow(source);
  const result=evaluateTutorCanaryHandoff({readinessRegister:source,canaryRegister:candidate.value,expectedReadinessHash:candidate.hash});
  const plan=buildTutorCanaryDryRunPlan({readinessRegister:source,canaryRegister:candidate.value,expectedReadinessHash:candidate.hash});
  record('synthetic-handoff-ready',result.status==='READY_FOR_CANARY_HANDOFF'&&plan.slots.length===8&&!plan.dispatch_performed&&!plan.execution_authorized,{status:result.status,slots:plan.slots.length,dispatch_performed:plan.dispatch_performed});
}
{
  const candidate=clone(register);
  candidate.plan.max_requests=9;
  candidate.plan.concurrency=2;
  const failures=inspectTutorCanaryHandoffRegister(candidate,{expectedReadinessHash:readinessHash});
  record('budget-and-concurrency-rejected',failures.includes('LIMIT_MISMATCH:max_requests')&&failures.includes('LIMIT_MISMATCH:concurrency'),{failures});
}
{
  const candidate=clone(register);
  candidate.response_text='raw output must not be stored';
  const failures=inspectTutorCanaryHandoffRegister(candidate,{expectedReadinessHash:readinessHash});
  record('raw-content-rejected',failures.includes('FORBIDDEN_CONTENT_KEY:response_text'),{failures});
}
{
  const candidate=clone(register);
  candidate.secret_reference='sk-exampleSecretMaterial123456';
  const failures=inspectTutorCanaryHandoffRegister(candidate,{expectedReadinessHash:readinessHash});
  record('secret-rejected',failures.includes('SECRET_MATERIAL_DETECTED'),{secret_material_detected:failures.includes('SECRET_MATERIAL_DETECTED')});
}
{
  const failures=inspectTutorCanaryHandoffRegister(register,{expectedReadinessHash:'a'.repeat(64)});
  record('source-hash-drift-rejected',failures.includes('SOURCE_HASH_MISMATCH'),{source_hash_mismatch:failures.includes('SOURCE_HASH_MISMATCH')});
}

const passed=scenarios.filter((scenario)=>scenario.passed).length;
const current=evaluateTutorCanaryHandoff({readinessRegister:readiness,canaryRegister:register,expectedReadinessHash:readinessHash});
const evidence={
  schema_version:'1.0.0',phase:51,generated_at:new Date().toISOString(),
  status:passed===scenarios.length&&current.status==='BLOCKED_EXTERNAL'
    ?'AUTO_QA_PASS_LOCAL_CANARY_HANDOFF_BLOCKED_EXTERNAL':'FAIL',
  current_handoff:current,
  summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},
  scenarios,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),
  readiness_register_sha256:readinessHash,
  canary_register_sha256:crypto.createHash('sha256').update(registerBytes).digest('hex'),
  external_actions:{provider_live_tested:false,api_key_accessed:false,dispatch_performed:false,external_deployment_performed:false},
  next_authorized_action:'COMPLETE_PHASE50_CONTROLS_THEN_SUPPLY_APPROVED_CANARY_WINDOW_REFERENCE'
};
fs.writeFileSync(outputPath,`${JSON.stringify(evidence,null,2)}\n`);
if(evidence.status!=='AUTO_QA_PASS_LOCAL_CANARY_HANDOFF_BLOCKED_EXTERNAL'){
  console.error('PHASE51_CANARY_HANDOFF_FAIL');
  scenarios.filter((scenario)=>!scenario.passed).forEach((scenario)=>console.error(scenario.id));
  process.exit(1);
}
console.log('PHASE51_CANARY_HANDOFF_PASS');
console.log(`local_scenarios=${passed}/${scenarios.length}`);
console.log('locales_planned=8/8');
console.log('provider_live_tested=false');
console.log('dispatch_performed=false');
