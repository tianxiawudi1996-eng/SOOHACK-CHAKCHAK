import crypto from 'node:crypto';

export const TUTOR_EXTENDED_STAGING_LOCALES=Object.freeze(['ko','zh-CN','ja','en','es','fr','it','ru']);
export const TUTOR_EXTENDED_STAGING_PLAN=Object.freeze({
  environment:'STAGING',audience:'INTERNAL_QA_SYNTHETIC_ONLY',locales:TUTOR_EXTENDED_STAGING_LOCALES,
  min_samples_per_locale:10,total_planned_samples:80,duration_hours:24,concurrency:1,max_retries_per_request:0,
  capture_request_content:false,capture_response_content:false,kill_switch_rearm_on_exit:true,rule_fallback_required:true
});
export const TUTOR_EXTENDED_STAGING_THRESHOLDS=Object.freeze({
  schema_success_rate_min:1,safety_violation_count_max:0,answer_leak_count_max:0,pii_detection_count_max:0,
  role_separation_success_rate_min:1,locale_success_rate_min:1,version_mismatch_count_max:0,budget_breach_count_max:0,
  kill_switch_failure_count_max:0,provider_error_rate_max:0.05,fallback_rate_max:0.1,latency_p95_ms_max:1500
});

const SECRET_PATTERNS=[
  /\bsk-[A-Za-z0-9_-]{8,}\b/,/\bBearer\s+[A-Za-z0-9._-]+/i,/OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const FORBIDDEN_KEYS=new Set(['prompt','prompt_text','raw_input','input_text','response','response_text','output_text','student_id','student_name','email','phone','api_key','authorization_header','expected_answer']);
const validIso=(value)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const validReference=(value)=>typeof value==='string'&&value.length>=3;
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
function walk(value,visit){
  if(Array.isArray(value))return value.forEach((item)=>walk(item,visit));
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){visit(key,item);walk(item,visit);}
}

export function hashTutorCanaryResultRegister(register){
  return crypto.createHash('sha256').update(`${JSON.stringify(register,null,2)}\n`).digest('hex');
}

export function inspectTutorExtendedStagingRegister(register,{expectedSourceHash}={}){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==53)failures.push('PHASE_MISMATCH');
  if(!['BLOCKED_EXTERNAL','READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF'].includes(register.status))failures.push('STATUS_INVALID');
  for(const key of ['execution_authorized','observation_started','provider_live_tested','api_key_accessed','production_traffic','student_traffic','production_promotion_allowed']){
    if(register[key]!==false)failures.push(`${key.toUpperCase()}_MUST_REMAIN_FALSE`);
  }
  const source=register.source_canary_results||{};
  if(source.phase!==52)failures.push('SOURCE_PHASE_MISMATCH');
  if(typeof source.register_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.register_sha256))failures.push('SOURCE_HASH_INVALID');
  if(expectedSourceHash&&source.register_sha256!==expectedSourceHash)failures.push('SOURCE_HASH_MISMATCH');
  if(!same(register.plan,TUTOR_EXTENDED_STAGING_PLAN))failures.push('OBSERVATION_PLAN_CHANGED');
  if(!same(register.thresholds,TUTOR_EXTENDED_STAGING_THRESHOLDS))failures.push('PROJECT_THRESHOLDS_CHANGED');

  const window=register.observation_window||{};
  if(!['PENDING_EXTERNAL','APPROVED'].includes(window.status))failures.push('WINDOW_STATUS_INVALID');
  if(window.status==='PENDING_EXTERNAL'){
    if(window.window_reference!==null||window.starts_at!==null||window.ends_at!==null)failures.push('PENDING_WINDOW_FIELDS_MUST_BE_NULL');
  }else{
    if(!validReference(window.window_reference)||!validIso(window.starts_at)||!validIso(window.ends_at)||Date.parse(window.ends_at)<=Date.parse(window.starts_at))failures.push('APPROVED_WINDOW_EVIDENCE_INVALID');
    else if(Date.parse(window.ends_at)-Date.parse(window.starts_at)>TUTOR_EXTENDED_STAGING_PLAN.duration_hours*60*60*1000)failures.push('OBSERVATION_WINDOW_TOO_LONG');
  }

  const authorization=register.authorization||{};
  if(!['NOT_REQUESTED','APPROVED'].includes(authorization.status))failures.push('AUTHORIZATION_STATUS_INVALID');
  if(authorization.status==='NOT_REQUESTED'){
    if(authorization.approval_reference!==null||authorization.approved_at!==null)failures.push('UNREQUESTED_AUTHORIZATION_FIELDS_MUST_BE_NULL');
  }else if(!validReference(authorization.approval_reference)||!validIso(authorization.approved_at)||authorization.approval_inferred!==false)failures.push('PRODUCT_OWNER_AUTHORIZATION_EVIDENCE_REQUIRED');
  if(!Array.isArray(register.observation_records)||register.observation_records.length!==0)failures.push('PRE_EXECUTION_RECORDS_MUST_REMAIN_EMPTY');
  if(register.rollback?.status!=='NOT_STARTED'||register.rollback?.evidence_reference!==null)failures.push('ROLLBACK_MUST_BE_NOT_STARTED');
  walk(register,(key)=>{if(FORBIDDEN_KEYS.has(key.toLowerCase()))failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);});
  const serialized=JSON.stringify(register);
  for(const pattern of SECRET_PATTERNS)if(pattern.test(serialized))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function phase52Accepted(source){
  return source?.phase===52&&source?.status==='CANARY_ACCEPTED_FOR_EXTENDED_STAGING'&&source?.execution_observed===true&&
    source?.dispatch_observed===true&&source?.provider_live_tested===true&&source?.production_promotion_allowed===false&&
    Array.isArray(source?.result_records)&&source.result_records.length===8&&source?.kill_switch?.status==='REARMED'&&
    source?.human_review?.status==='APPROVED'&&source?.human_review?.approval_inferred===false;
}

export function evaluateTutorExtendedStagingReadiness({sourceResultRegister,observationRegister,expectedSourceHash}={}){
  const validationFailures=inspectTutorExtendedStagingRegister(observationRegister,{expectedSourceHash});
  const sourceAccepted=phase52Accepted(sourceResultRegister);
  const windowApproved=observationRegister?.observation_window?.status==='APPROVED';
  const productOwnerApproved=observationRegister?.authorization?.status==='APPROVED';
  const blockers=[];
  if(!sourceAccepted)blockers.push('PHASE52_CANARY_RESULTS_NOT_ACCEPTED');
  if(!windowApproved)blockers.push('OBSERVATION_WINDOW_PENDING');
  if(!productOwnerApproved)blockers.push('PRODUCT_OWNER_AUTHORIZATION_PENDING');
  if(validationFailures.length)blockers.push('OBSERVATION_REGISTER_INVALID');
  const ready=sourceAccepted&&windowApproved&&productOwnerApproved&&!validationFailures.length;
  return {
    status:validationFailures.length?'FAIL':ready?'READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF':'BLOCKED_EXTERNAL',
    source_status:sourceResultRegister?.status||'UNKNOWN',source_accepted:sourceAccepted,window_approved:windowApproved,
    product_owner_authorized:productOwnerApproved,locales:TUTOR_EXTENDED_STAGING_LOCALES.length,
    samples_per_locale:TUTOR_EXTENDED_STAGING_PLAN.min_samples_per_locale,total_planned_samples:TUTOR_EXTENDED_STAGING_PLAN.total_planned_samples,
    blockers,validation_failures:validationFailures,execution_authorized:false,observation_started:false,production_promotion_allowed:false
  };
}

export function buildTutorExtendedStagingDryRunPlan({sourceResultRegister,observationRegister,expectedSourceHash}={}){
  const readiness=evaluateTutorExtendedStagingReadiness({sourceResultRegister,observationRegister,expectedSourceHash});
  if(readiness.status!=='READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF')return {status:readiness.status,items:[],dispatch_performed:false,execution_authorized:false};
  const items=[];
  for(const locale of TUTOR_EXTENDED_STAGING_LOCALES){
    for(let sample=1;sample<=TUTOR_EXTENDED_STAGING_PLAN.min_samples_per_locale;sample++)items.push({locale,sample,scenario_reference:`EXTENDED-STAGING-${locale}-${String(sample).padStart(2,'0')}`,dispatch:false});
  }
  return {status:'DRY_RUN_PLAN_READY',items,dispatch_performed:false,execution_authorized:false};
}
