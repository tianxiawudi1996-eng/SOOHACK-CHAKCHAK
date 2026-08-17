import crypto from 'node:crypto';
import {TUTOR_EXTENDED_STAGING_LOCALES,TUTOR_EXTENDED_STAGING_PLAN,TUTOR_EXTENDED_STAGING_THRESHOLDS} from './tutor-extended-staging-observation.mjs';

const APPROVED_MODEL='gpt-5.6-sol';
const APPROVED_PROMPT='mathchakchak-tutor-duo-v1.0.0';
const OUTCOMES=new Set(['PASS','FAIL','FALLBACK','PROVIDER_ERROR','BLOCKED']);
const SECRET_PATTERNS=[/\bsk-[A-Za-z0-9_-]{8,}\b/,/\bBearer\s+[A-Za-z0-9._-]+/i,/OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,/postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const FORBIDDEN_KEYS=new Set(['prompt','prompt_text','raw_input','input_text','response','response_text','output_text','student_id','student_name','email','phone','api_key','authorization_header','expected_answer']);
const validIso=(value)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const validReference=(value)=>typeof value==='string'&&value.length>=3;
const nonNegativeInteger=(value)=>Number.isInteger(value)&&value>=0;
function walk(value,visit){if(Array.isArray(value))return value.forEach((item)=>walk(item,visit));if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){visit(key,item);walk(item,visit);}}

export function hashTutorExtendedStagingRegister(register){return crypto.createHash('sha256').update(`${JSON.stringify(register,null,2)}\n`).digest('hex');}

export function inspectTutorExtendedStagingResultRegister(register,{expectedSourceHash}={}){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==54)failures.push('PHASE_MISMATCH');
  if(!['BLOCKED_EXTERNAL','AWAITING_OBSERVATION_RESULTS','OBSERVATION_RESULTS_COLLECTED','READY_FOR_PRODUCTION_PROMOTION_REVIEW','EXTENDED_STAGING_REJECTED'].includes(register.status))failures.push('STATUS_INVALID');
  for(const key of ['api_key_accessed','student_traffic','production_traffic','production_promotion_allowed','execution_authorized'])if(register[key]!==false)failures.push(`${key.toUpperCase()}_MUST_REMAIN_FALSE`);
  const source=register.source_observation||{};
  if(source.phase!==53)failures.push('SOURCE_PHASE_MISMATCH');
  if(typeof source.register_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.register_sha256))failures.push('SOURCE_HASH_INVALID');
  if(expectedSourceHash&&source.register_sha256!==expectedSourceHash)failures.push('SOURCE_HASH_MISMATCH');
  const records=Array.isArray(register.result_records)?register.result_records:[];
  if(records.length>TUTOR_EXTENDED_STAGING_PLAN.total_planned_samples)failures.push('RESULT_COUNT_EXCEEDED');
  const refs=records.map((item)=>item?.observation_reference),scenarios=records.map((item)=>item?.scenario_reference);
  if(new Set(refs).size!==refs.length)failures.push('DUPLICATE_OBSERVATION_REFERENCE');
  if(new Set(scenarios).size!==scenarios.length)failures.push('DUPLICATE_SCENARIO_REFERENCE');
  for(const record of records){
    const id=record?.observation_reference||'UNKNOWN';
    if(!validReference(record?.observation_reference))failures.push(`OBSERVATION_REFERENCE_REQUIRED:${id}`);
    if(!TUTOR_EXTENDED_STAGING_LOCALES.includes(record?.locale))failures.push(`LOCALE_INVALID:${id}`);
    if(!Number.isInteger(record?.sample)||record.sample<1||record.sample>TUTOR_EXTENDED_STAGING_PLAN.min_samples_per_locale)failures.push(`SAMPLE_INVALID:${id}`);
    if(record?.scenario_reference!==`EXTENDED-STAGING-${record?.locale}-${String(record?.sample).padStart(2,'0')}`)failures.push(`SCENARIO_REFERENCE_INVALID:${id}`);
    if(!validIso(record?.started_at)||!validIso(record?.completed_at)||Date.parse(record.completed_at)<Date.parse(record.started_at))failures.push(`TIME_INVALID:${id}`);
    if(!OUTCOMES.has(record?.outcome))failures.push(`OUTCOME_INVALID:${id}`);
    if(record?.provider_request_reference!==null&&!validReference(record?.provider_request_reference))failures.push(`PROVIDER_REFERENCE_INVALID:${id}`);
    if(record?.model_reference!==APPROVED_MODEL||record?.prompt_version!==APPROVED_PROMPT)failures.push(`VERSION_PIN_MISMATCH:${id}`);
    for(const key of ['input_tokens','output_tokens','latency_ms'])if(!nonNegativeInteger(record?.[key]))failures.push(`METRIC_INVALID:${key}:${id}`);
    for(const key of ['schema_valid','safety_valid','answer_leak_detected','pii_detected','role_separation_valid','locale_valid','version_pinned','budget_breached','kill_switch_failed','provider_error','fallback_used'])if(typeof record?.[key]!=='boolean')failures.push(`GATE_INVALID:${key}:${id}`);
    if(record?.outcome==='PASS'&&(!validReference(record.provider_request_reference)||!record.schema_valid||!record.safety_valid||record.answer_leak_detected||record.pii_detected||!record.role_separation_valid||!record.locale_valid||!record.version_pinned||record.budget_breached||record.kill_switch_failed||record.provider_error||record.fallback_used||record.fallback_reason!==null))failures.push(`PASS_GATE_CONTRADICTION:${id}`);
    if(record?.fallback_used&&!validReference(record?.fallback_reason))failures.push(`FALLBACK_REASON_REQUIRED:${id}`);
    if(!record?.fallback_used&&record?.fallback_reason!==null)failures.push(`FALLBACK_REASON_MUST_BE_NULL:${id}`);
  }
  if(register.observation_observed===false){
    if(register.dispatch_observed!==false||register.provider_live_tested!==false||records.length)failures.push('NO_OBSERVATION_CONTRADICTION');
    if(register.kill_switch?.status!=='NOT_STARTED'||register.kill_switch?.evidence_reference!==null||register.kill_switch?.rearmed_at!==null)failures.push('KILL_SWITCH_MUST_BE_NOT_STARTED');
    if(register.rollback?.status!=='NOT_STARTED'||register.rollback?.evidence_reference!==null||register.rollback?.completed_at!==null)failures.push('ROLLBACK_MUST_BE_NOT_STARTED');
  }else if(register.observation_observed===true){
    if(register.dispatch_observed!==true||register.provider_live_tested!==true||!records.length)failures.push('OBSERVATION_RESULTS_REQUIRED');
    if(register.kill_switch?.status!=='REARMED'||!validReference(register.kill_switch?.evidence_reference)||!validIso(register.kill_switch?.rearmed_at))failures.push('KILL_SWITCH_REARM_EVIDENCE_REQUIRED');
    if(!['NOT_REQUIRED','COMPLETED'].includes(register.rollback?.status)||!validReference(register.rollback?.evidence_reference)||!validIso(register.rollback?.completed_at))failures.push('ROLLBACK_DISPOSITION_EVIDENCE_REQUIRED');
  }else failures.push('OBSERVATION_OBSERVED_BOOLEAN_REQUIRED');
  const review=register.promotion_review||{};
  if(!['NOT_REQUESTED','APPROVED','REJECTED'].includes(review.status))failures.push('PROMOTION_REVIEW_STATUS_INVALID');
  if(review.status==='NOT_REQUESTED'){
    if(review.review_reference!==null||review.reviewed_at!==null)failures.push('UNREQUESTED_REVIEW_FIELDS_MUST_BE_NULL');
  }else if(!validReference(review.review_reference)||!validIso(review.reviewed_at)||review.approval_inferred!==false)failures.push('PRODUCT_OWNER_REVIEW_EVIDENCE_REQUIRED');
  walk(register,(key)=>{if(FORBIDDEN_KEYS.has(key.toLowerCase()))failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);});
  const serialized=JSON.stringify(register);for(const pattern of SECRET_PATTERNS)if(pattern.test(serialized))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function sourceReady(source){return source?.phase===53&&source?.status==='READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF'&&source?.observation_started===false&&source?.provider_live_tested===false&&source?.production_promotion_allowed===false&&source?.observation_window?.status==='APPROVED'&&source?.authorization?.status==='APPROVED'&&source?.authorization?.approval_inferred===false;}
function percentile95(values){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*0.95)-1];}
export function summarizeTutorExtendedStagingResults(records=[]){
  const count=records.length,rate=(value)=>count?value/count:0;
  const summary={records_received:count,schema_success_rate:rate(records.filter((item)=>item.schema_valid).length),safety_violation_count:records.filter((item)=>!item.safety_valid).length,answer_leak_count:records.filter((item)=>item.answer_leak_detected).length,pii_detection_count:records.filter((item)=>item.pii_detected).length,
    role_separation_success_rate:rate(records.filter((item)=>item.role_separation_valid).length),locale_success_rate:rate(records.filter((item)=>item.locale_valid).length),version_mismatch_count:records.filter((item)=>!item.version_pinned||item.model_reference!==APPROVED_MODEL||item.prompt_version!==APPROVED_PROMPT).length,
    budget_breach_count:records.filter((item)=>item.budget_breached).length,kill_switch_failure_count:records.filter((item)=>item.kill_switch_failed).length,provider_error_rate:rate(records.filter((item)=>item.provider_error).length),fallback_rate:rate(records.filter((item)=>item.fallback_used).length),latency_p95_ms:percentile95(records.map((item)=>item.latency_ms).filter(nonNegativeInteger))};
  const failures=[];for(const [key,limit] of Object.entries(TUTOR_EXTENDED_STAGING_THRESHOLDS)){const metric=key.replace(/_(min|max)$/,'');if(key.endsWith('_min')?summary[metric]<limit:summary[metric]>limit)failures.push(key);}
  return {...summary,threshold_failures:failures,thresholds_pass:count===TUTOR_EXTENDED_STAGING_PLAN.total_planned_samples&&!failures.length};
}

export function evaluateTutorExtendedStagingResults({sourceObservationRegister,resultRegister,expectedSourceHash}={}){
  const validationFailures=inspectTutorExtendedStagingResultRegister(resultRegister,{expectedSourceHash});
  const records=Array.isArray(resultRegister?.result_records)?resultRegister.result_records:[];
  const sourceAccepted=sourceReady(sourceObservationRegister);
  const perLocale=Object.fromEntries(TUTOR_EXTENDED_STAGING_LOCALES.map((locale)=>[locale,records.filter((item)=>item.locale===locale).length]));
  const complete=records.length===TUTOR_EXTENDED_STAGING_PLAN.total_planned_samples&&Object.values(perLocale).every((count)=>count===TUTOR_EXTENDED_STAGING_PLAN.min_samples_per_locale);
  const summary=summarizeTutorExtendedStagingResults(records),killSwitchRearmed=resultRegister?.kill_switch?.status==='REARMED',rollbackComplete=resultRegister?.rollback?.status==='COMPLETED',review=resultRegister?.promotion_review?.status||'NOT_REQUESTED';
  const blockers=[];if(!sourceAccepted)blockers.push('PHASE53_OBSERVATION_HANDOFF_NOT_READY');if(!records.length)blockers.push('OBSERVATION_RESULTS_PENDING');else if(!complete)blockers.push('OBSERVATION_RESULTS_INCOMPLETE');if(records.length&&!killSwitchRearmed)blockers.push('KILL_SWITCH_REARM_PENDING');if(complete&&!summary.thresholds_pass&&!rollbackComplete)blockers.push('ROLLBACK_EVIDENCE_PENDING');if(review==='REJECTED'&&!rollbackComplete)blockers.push('REVIEW_REJECTION_ROLLBACK_PENDING');if(validationFailures.length)blockers.push('RESULT_REGISTER_INVALID');
  let status='BLOCKED_EXTERNAL',recommendation='HOLD';
  if(validationFailures.length)status='FAIL';
  else if(sourceAccepted&&!records.length)status='AWAITING_OBSERVATION_RESULTS';
  else if(sourceAccepted&&records.length&&(!complete||!killSwitchRearmed))status='OBSERVATION_RESULTS_INCOMPLETE';
  else if(sourceAccepted&&complete&&!summary.thresholds_pass){recommendation='REJECT_AND_ROLLBACK';status=rollbackComplete?'EXTENDED_STAGING_REJECTED_AUTOMATICALLY':'REJECTION_EVIDENCE_PENDING';}
  else if(sourceAccepted&&complete&&summary.thresholds_pass&&killSwitchRearmed){recommendation='REQUEST_PRODUCTION_PROMOTION_REVIEW';if(review==='APPROVED')status='EXTENDED_STAGING_ACCEPTED_FOR_PRODUCTION_HANDOFF';else if(review==='REJECTED'){recommendation='REJECT_AND_ROLLBACK';status=rollbackComplete?'EXTENDED_STAGING_REJECTED_BY_PRODUCT_OWNER':'REJECTION_EVIDENCE_PENDING';}else status='READY_FOR_PRODUCTION_PROMOTION_REVIEW';}
  return {status,recommendation,source_status:sourceObservationRegister?.status||'UNKNOWN',source_accepted:sourceAccepted,complete,per_locale:perLocale,...summary,kill_switch_rearmed:killSwitchRearmed,rollback_complete:rollbackComplete,promotion_review_status:review,blockers,validation_failures:validationFailures,execution_authorized:false,production_promotion_allowed:false};
}
