import crypto from 'node:crypto';
import fs from 'node:fs';
import {buildTutorExtendedStagingDryRunPlan,evaluateTutorExtendedStagingReadiness,hashTutorCanaryResultRegister,inspectTutorExtendedStagingRegister} from '../../developer/src/agent/tutor-extended-staging-observation.mjs';

const sourcePath='docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json';
const registerPath='docs/productization/evidence/PHASE_53_EXTENDED_STAGING_OBSERVATION_REGISTER.json';
const contractPath='developer/contracts/ai-tutor-extended-staging-observation-v1.json';
const outputPath='docs/productization/evidence/PHASE_53_AI_TUTOR_EXTENDED_STAGING_QA.json';
const sourceBytes=fs.readFileSync(sourcePath),registerBytes=fs.readFileSync(registerPath),contractBytes=fs.readFileSync(contractPath);
const source=JSON.parse(sourceBytes),register=JSON.parse(registerBytes),sourceHash=crypto.createHash('sha256').update(sourceBytes).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const scenarios=[];const record=(id,passed,observed)=>scenarios.push({id,passed,observed});
const acceptedSource=()=>{
  const candidate=clone(source);candidate.status='CANARY_ACCEPTED_FOR_EXTENDED_STAGING';candidate.execution_observed=true;candidate.dispatch_observed=true;candidate.provider_live_tested=true;
  candidate.result_records=['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale)=>({locale}));candidate.kill_switch={status:'REARMED'};
  candidate.human_review={status:'APPROVED',approval_inferred:false};return candidate;
};
const bind=(candidate,accepted)=>{candidate.source_canary_results.register_sha256=hashTutorCanaryResultRegister(accepted);return candidate;};
{
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:source,observationRegister:register,expectedSourceHash:sourceHash});
  record('current-prerequisites-blocked',result.status==='BLOCKED_EXTERNAL'&&result.blockers.length===3,{status:result.status,blockers:result.blockers});
}
{
  const accepted=acceptedSource(),candidate=bind(clone(register),accepted),hash=hashTutorCanaryResultRegister(accepted);
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hash});
  record('accepted-canary-still-awaits-window-and-authorization',result.blockers.length===2,{blockers:result.blockers});
}
{
  const accepted=acceptedSource(),candidate=bind(clone(register),accepted),hash=hashTutorCanaryResultRegister(accepted);
  candidate.observation_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:00+09:00'};
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hash});
  record('window-alone-insufficient',result.blockers.length===1&&result.blockers[0]==='PRODUCT_OWNER_AUTHORIZATION_PENDING',{blockers:result.blockers});
}
{
  const accepted=acceptedSource(),candidate=bind(clone(register),accepted),hash=hashTutorCanaryResultRegister(accepted);candidate.status='READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF';
  candidate.observation_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:00+09:00'};
  candidate.authorization={status:'APPROVED',approval_reference:'SYNTHETIC-PO-APPROVAL',approved_at:'2026-08-10T18:00:00+09:00',approval_inferred:false};
  const dryRun=buildTutorExtendedStagingDryRunPlan({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hash});
  record('ready-dry-run-plan-is-non-executing',dryRun.items.length===80&&!dryRun.dispatch_performed&&!dryRun.execution_authorized,{items:dryRun.items.length,dispatch_performed:dryRun.dispatch_performed});
}
{
  const candidate=clone(register);candidate.plan.min_samples_per_locale=1;candidate.thresholds.safety_violation_count_max=1;
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:sourceHash});
  record('plan-and-threshold-relaxation-rejected',failures.includes('OBSERVATION_PLAN_CHANGED')&&failures.includes('PROJECT_THRESHOLDS_CHANGED'),{failures});
}
{
  const candidate=clone(register);candidate.production_traffic=true;candidate.student_traffic=true;candidate.response_text='raw';candidate.secret_reference='sk-exampleSecretMaterial123456';
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:sourceHash});
  record('traffic-content-and-secret-rejected',['PRODUCTION_TRAFFIC_MUST_REMAIN_FALSE','STUDENT_TRAFFIC_MUST_REMAIN_FALSE','FORBIDDEN_CONTENT_KEY:response_text','SECRET_MATERIAL_DETECTED'].every((item)=>failures.includes(item)),{failures});
}
{
  const candidate=clone(register);candidate.observation_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:01+09:00'};
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:'a'.repeat(64)});
  record('source-drift-and-overlong-window-rejected',failures.includes('SOURCE_HASH_MISMATCH')&&failures.includes('OBSERVATION_WINDOW_TOO_LONG'),{failures});
}
const passed=scenarios.filter((scenario)=>scenario.passed).length;
const current=evaluateTutorExtendedStagingReadiness({sourceResultRegister:source,observationRegister:register,expectedSourceHash:sourceHash});
const evidence={schema_version:'1.0.0',phase:53,generated_at:new Date().toISOString(),status:passed===scenarios.length&&current.status==='BLOCKED_EXTERNAL'?'AUTO_QA_PASS_LOCAL_EXTENDED_STAGING_OBSERVATION_BLOCKED_EXTERNAL':'FAIL',
  current_readiness:current,summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},scenarios,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),source_result_register_sha256:sourceHash,
  observation_register_sha256:crypto.createHash('sha256').update(registerBytes).digest('hex'),
  external_actions:{provider_live_tested:false,api_key_accessed:false,observation_started:false,student_traffic:false,production_traffic:false,external_deployment_performed:false},
  next_authorized_action:'WAIT_FOR_ACCEPTED_PHASE52_RESULTS_APPROVED_WINDOW_AND_SINGLE_PRODUCT_OWNER_AUTHORIZATION'};
fs.writeFileSync(outputPath,`${JSON.stringify(evidence,null,2)}\n`);
if(evidence.status==='FAIL'){console.error('PHASE53_EXTENDED_STAGING_OBSERVATION_FAIL');scenarios.filter((item)=>!item.passed).forEach((item)=>console.error(item.id));process.exit(1);}
console.log('PHASE53_EXTENDED_STAGING_OBSERVATION_PASS');console.log(`local_scenarios=${passed}/${scenarios.length}`);console.log('planned_samples=80');console.log('observation_started=false');console.log('production_promotion_allowed=false');
