import crypto from 'node:crypto';
import fs from 'node:fs';
import {hashTutorStagingReadinessRegister} from '../../developer/src/agent/tutor-canary-handoff.mjs';
import {evaluateTutorCanaryResults,hashTutorCanaryHandoffRegister,inspectTutorCanaryResultRegister} from '../../developer/src/agent/tutor-canary-results.mjs';

const readinessPath='docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json';
const handoffPath='docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json';
const resultPath='docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json';
const contractPath='developer/contracts/ai-tutor-canary-results-v1.json';
const outputPath='docs/productization/evidence/PHASE_52_AI_TUTOR_CANARY_RESULTS_QA.json';
const readinessBytes=fs.readFileSync(readinessPath),handoffBytes=fs.readFileSync(handoffPath),resultBytes=fs.readFileSync(resultPath),contractBytes=fs.readFileSync(contractPath);
const readiness=JSON.parse(readinessBytes),handoff=JSON.parse(handoffBytes),resultRegister=JSON.parse(resultBytes);
const readinessHash=crypto.createHash('sha256').update(readinessBytes).digest('hex');
const handoffHash=crypto.createHash('sha256').update(handoffBytes).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const scenarios=[];
const record=(id,passed,observed)=>scenarios.push({id,passed,observed});

const readySources=()=>{
  const ready=clone(readiness);
  ready.controls=ready.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`SYNTHETIC-REF-${index+1}`,verified_at:'2026-08-10T17:05:00+09:00'}));
  ready.authorization={status:'APPROVED',approval_reference:'SYNTHETIC-PO-APPROVAL',approved_at:'2026-08-10T17:10:00+09:00',approval_inferred:false};
  const readyHash=hashTutorStagingReadinessRegister(ready);
  const canary=clone(handoff);
  canary.status='READY_FOR_CANARY_HANDOFF';
  canary.source_readiness.register_sha256=readyHash;
  canary.execution_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW-REF',starts_at:'2026-08-10T17:15:00+09:00',ends_at:'2026-08-10T17:30:00+09:00'};
  return {ready,readyHash,canary,canaryHash:hashTutorCanaryHandoffRegister(canary)};
};
const passRecords=()=>['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale,index)=>({
  attempt_reference:`SYNTHETIC-ATTEMPT-${index+1}`,locale,scenario_reference:`CANARY-SAFE-HINT-${locale}`,
  started_at:`2026-08-10T17:${String(15+index).padStart(2,'0')}:00+09:00`,completed_at:`2026-08-10T17:${String(15+index).padStart(2,'0')}:01+09:00`,
  outcome:'PASS',provider_request_reference:`SYNTHETIC-PROVIDER-REF-${index+1}`,model_reference:'gpt-5.6-sol',prompt_version:'mathchakchak-tutor-duo-v1.0.0',
  input_tokens:100,output_tokens:50,latency_ms:500,schema_valid:true,safety_valid:true,answer_leak_detected:false,pii_detected:false,role_separation_valid:true,locale_valid:true,fallback_reason:null
}));
const completeResults=()=>{
  const source=readySources(),results=clone(resultRegister);
  results.status='RESULTS_COLLECTED';
  results.source_handoff.register_sha256=source.canaryHash;
  results.execution_observed=true;results.dispatch_observed=true;results.provider_live_tested=true;
  results.result_records=passRecords();
  results.kill_switch={status:'REARMED',evidence_reference:'SYNTHETIC-KILL-SWITCH-REF',rearmed_at:'2026-08-10T17:24:00+09:00'};
  results.rollback={status:'NOT_REQUIRED',evidence_reference:'SYNTHETIC-FALLBACK-VERIFY-REF',completed_at:'2026-08-10T17:24:30+09:00'};
  return {...source,results};
};

{
  const result=evaluateTutorCanaryResults({readinessRegister:readiness,handoffRegister:handoff,resultRegister,expectedReadinessHash:readinessHash,expectedHandoffHash:handoffHash});
  record('current-results-blocked',result.status==='BLOCKED_EXTERNAL'&&result.records_received===0,{status:result.status,blockers:result.blockers});
}
{
  const source=readySources(),results=clone(resultRegister);results.source_handoff.register_sha256=source.canaryHash;
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  record('ready-handoff-awaits-results',result.status==='AWAITING_RESULTS'&&result.records_received===0,{status:result.status});
}
{
  const source=completeResults();
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  record('complete-results-ready-for-human-review',result.status==='READY_FOR_HUMAN_CANARY_REVIEW'&&result.passed_records===8,{status:result.status,passed:result.passed_records});
}
{
  const source=completeResults();source.results.human_review={status:'APPROVED',review_reference:'SYNTHETIC-PO-REVIEW',reviewed_at:'2026-08-10T17:30:00+09:00',approval_inferred:false};
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  record('single-review-extended-staging-only',result.status==='CANARY_ACCEPTED_FOR_EXTENDED_STAGING'&&!result.production_promotion_allowed,{status:result.status,production_promotion_allowed:result.production_promotion_allowed});
}
{
  const source=completeResults();source.results.result_records[0].outcome='FAIL';source.results.result_records[0].schema_valid=false;source.results.result_records[0].fallback_reason='SCHEMA_REJECTED';source.results.rollback={status:'COMPLETED',evidence_reference:'SYNTHETIC-ROLLBACK-REF',completed_at:'2026-08-10T17:24:30+09:00'};
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  record('hard-gate-failure-rejected',result.status==='CANARY_REJECTED_AUTOMATICALLY'&&result.recommendation==='REJECT_AND_ROLLBACK',{status:result.status,recommendation:result.recommendation});
}
{
  const source=completeResults();source.results.result_records[1].locale='ko';source.results.result_records[0].input_tokens=16001;source.results.result_records[7].completed_at='2026-08-10T17:31:00+09:00';
  const failures=inspectTutorCanaryResultRegister(source.results,{expectedHandoffHash:source.canaryHash});
  record('integrity-limits-rejected',['DUPLICATE_LOCALE_RESULT','INPUT_TOKEN_BUDGET_EXCEEDED','CANARY_DURATION_EXCEEDED'].every((failure)=>failures.includes(failure)),{failures});
}
{
  const candidate=clone(resultRegister);candidate.response_text='raw output';candidate.secret_reference='sk-exampleSecretMaterial123456';
  const failures=inspectTutorCanaryResultRegister(candidate,{expectedHandoffHash:handoffHash});
  record('raw-content-and-secret-rejected',failures.includes('FORBIDDEN_CONTENT_KEY:response_text')&&failures.includes('SECRET_MATERIAL_DETECTED'),{secret_material_detected:failures.includes('SECRET_MATERIAL_DETECTED')});
}
{
  const failures=inspectTutorCanaryResultRegister(resultRegister,{expectedHandoffHash:'a'.repeat(64)});
  record('handoff-hash-drift-rejected',failures.includes('SOURCE_HASH_MISMATCH'),{source_hash_mismatch:failures.includes('SOURCE_HASH_MISMATCH')});
}

const passed=scenarios.filter((scenario)=>scenario.passed).length;
const current=evaluateTutorCanaryResults({readinessRegister:readiness,handoffRegister:handoff,resultRegister,expectedReadinessHash:readinessHash,expectedHandoffHash:handoffHash});
const evidence={
  schema_version:'1.0.0',phase:52,generated_at:new Date().toISOString(),
  status:passed===scenarios.length&&current.status==='BLOCKED_EXTERNAL'?'AUTO_QA_PASS_LOCAL_CANARY_RESULTS_BLOCKED_EXTERNAL':'FAIL',
  current_result_intake:current,summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},scenarios,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),
  handoff_register_sha256:handoffHash,
  result_register_sha256:crypto.createHash('sha256').update(resultBytes).digest('hex'),
  external_actions:{provider_live_tested:false,api_key_accessed:false,dispatch_observed:false,external_deployment_performed:false},
  next_authorized_action:'WAIT_FOR_PHASE51_HANDOFF_AND_REAL_CANARY_RESULT_REFERENCES'
};
fs.writeFileSync(outputPath,`${JSON.stringify(evidence,null,2)}\n`);
if(evidence.status!=='AUTO_QA_PASS_LOCAL_CANARY_RESULTS_BLOCKED_EXTERNAL'){
  console.error('PHASE52_CANARY_RESULTS_FAIL');scenarios.filter((scenario)=>!scenario.passed).forEach((scenario)=>console.error(scenario.id));process.exit(1);
}
console.log('PHASE52_CANARY_RESULTS_PASS');
console.log(`local_scenarios=${passed}/${scenarios.length}`);
console.log('current_results=0/8');
console.log('provider_live_tested=false');
console.log('production_promotion_allowed=false');
