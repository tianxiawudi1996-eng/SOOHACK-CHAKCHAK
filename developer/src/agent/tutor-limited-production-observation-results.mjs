import crypto from 'node:crypto';
import {LIMITED_PRODUCTION_SAFETY_CONTROLS} from './tutor-limited-production-safety-handoff.mjs';

export const LIMITED_OBSERVATION_LOCALES = Object.freeze(['ko','zh-CN','ja','en','es','fr','it','ru']);
const MODEL = 'gpt-5.6-sol';
const PROMPT = 'mathchakchak-tutor-duo-v1.0.0';
const OUTCOMES = new Set(['PASS','FAIL','FALLBACK','PROVIDER_ERROR','BLOCKED']);
const LIMITS = Object.freeze({maxResults:8,maxDurationMs:15*60*1000,maxInputTokens:16000,maxOutputTokens:8000});
const FALSE_EXTERNAL_FIELDS = Object.freeze(['api_key_accessed','student_traffic','public_traffic','production_promotion_allowed']);
const FORBIDDEN_KEYS = new Set(['api_key','authorization_header','password','token','secret_value','prompt_text','raw_input','response_text','student_id','student_name','email','phone','expected_answer']);
const SECRET_PATTERNS = [/\bsk-[A-Za-z0-9_-]{8,}\b/,/\bBearer\s+[A-Za-z0-9._-]+/i,/OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,/postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const validIso=(value)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const validReference=(value)=>typeof value==='string'&&value.length>=3;
const nonNegativeInteger=(value)=>Number.isInteger(value)&&value>=0;
const clone=(value)=>JSON.parse(JSON.stringify(value));
function walk(value,visit){if(Array.isArray(value))return value.forEach((item)=>walk(item,visit));if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){visit(key,item);walk(item,visit);}}

export function hashLimitedProductionObservationSource(register){return crypto.createHash('sha256').update(`${JSON.stringify(register,null,2)}\n`).digest('hex');}

export function inspectLimitedProductionObservationResultRegister(register,{expectedSourceHash}={}){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==59)failures.push('PHASE_MISMATCH');
  if(!['BLOCKED_EXTERNAL','AWAITING_OBSERVATION_RESULTS','OBSERVATION_RESULTS_COLLECTED','READY_FOR_LIMITED_PRODUCTION_OBSERVATION_REVIEW','LIMITED_PRODUCTION_OBSERVATION_REJECTED'].includes(register.status))failures.push('STATUS_INVALID');
  for(const key of FALSE_EXTERNAL_FIELDS)if(register[key]!==false)failures.push(`${key.toUpperCase()}_MUST_REMAIN_FALSE`);
  const source=register.source_handoff||{};
  if(source.phase!==58)failures.push('SOURCE_PHASE_MISMATCH');
  if(typeof source.register_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.register_sha256))failures.push('SOURCE_HASH_INVALID');
  if(expectedSourceHash&&source.register_sha256!==expectedSourceHash)failures.push('SOURCE_HASH_MISMATCH');

  const records=Array.isArray(register.result_records)?register.result_records:[];
  if(records.length>LIMITS.maxResults)failures.push('RESULT_COUNT_EXCEEDED');
  const refs=records.map((item)=>item?.attempt_reference),locales=records.map((item)=>item?.locale);
  if(new Set(refs).size!==refs.length)failures.push('DUPLICATE_ATTEMPT_REFERENCE');
  if(new Set(locales).size!==locales.length)failures.push('DUPLICATE_LOCALE_RESULT');
  for(const item of records){
    const id=item?.attempt_reference||'UNKNOWN';
    if(!validReference(item?.attempt_reference))failures.push(`ATTEMPT_REFERENCE_REQUIRED:${id}`);
    if(!LIMITED_OBSERVATION_LOCALES.includes(item?.locale))failures.push(`LOCALE_INVALID:${id}`);
    if(item?.scenario_reference!==`LIMITED-INTERNAL-OBSERVATION-${item?.locale}`)failures.push(`SCENARIO_REFERENCE_INVALID:${id}`);
    if(!validIso(item?.started_at)||!validIso(item?.completed_at)||Date.parse(item.completed_at)<Date.parse(item.started_at))failures.push(`TIME_INVALID:${id}`);
    if(!OUTCOMES.has(item?.outcome))failures.push(`OUTCOME_INVALID:${id}`);
    if(item?.provider_request_reference!==null&&!validReference(item?.provider_request_reference))failures.push(`PROVIDER_REFERENCE_INVALID:${id}`);
    if(item?.model_reference!==MODEL||item?.prompt_version!==PROMPT)failures.push(`VERSION_PIN_MISMATCH:${id}`);
    for(const key of ['input_tokens','output_tokens','latency_ms'])if(!nonNegativeInteger(item?.[key]))failures.push(`METRIC_INVALID:${key}:${id}`);
    for(const key of ['schema_valid','safety_valid','answer_leak_detected','pii_detected','role_separation_valid','locale_valid','adult_internal_audience_valid','synthetic_data_valid','public_traffic_detected','student_traffic_detected','version_pinned','budget_breached','raw_content_persisted','provider_error','fallback_used'])if(typeof item?.[key]!=='boolean')failures.push(`GATE_INVALID:${key}:${id}`);
    if(item?.outcome==='PASS'&&(!validReference(item.provider_request_reference)||!item.schema_valid||!item.safety_valid||item.answer_leak_detected||item.pii_detected||!item.role_separation_valid||!item.locale_valid||!item.adult_internal_audience_valid||!item.synthetic_data_valid||item.public_traffic_detected||item.student_traffic_detected||!item.version_pinned||item.budget_breached||item.raw_content_persisted||item.provider_error||item.fallback_used||item.fallback_reason!==null))failures.push(`PASS_GATE_CONTRADICTION:${id}`);
    if(item?.fallback_used&&!validReference(item?.fallback_reason))failures.push(`FALLBACK_REASON_REQUIRED:${id}`);
    if(!item?.fallback_used&&item?.fallback_reason!==null)failures.push(`FALLBACK_REASON_MUST_BE_NULL:${id}`);
  }
  const input=records.reduce((sum,item)=>sum+Number(item.input_tokens||0),0),output=records.reduce((sum,item)=>sum+Number(item.output_tokens||0),0);
  if(input>LIMITS.maxInputTokens)failures.push('INPUT_TOKEN_BUDGET_EXCEEDED');
  if(output>LIMITS.maxOutputTokens)failures.push('OUTPUT_TOKEN_BUDGET_EXCEEDED');
  if(records.length){const starts=records.map((item)=>Date.parse(item.started_at)).filter(Number.isFinite),ends=records.map((item)=>Date.parse(item.completed_at)).filter(Number.isFinite);if(starts.length&&ends.length&&Math.max(...ends)-Math.min(...starts)>LIMITS.maxDurationMs)failures.push('OBSERVATION_DURATION_EXCEEDED');}

  if(register.observation_observed===false){
    for(const key of ['execution_observed','dispatch_observed','provider_live_tested','feature_flag_changed','feature_flag_restored_off'])if(register[key]!==false)failures.push('NO_OBSERVATION_CONTRADICTION');
    if(records.length)failures.push('NO_OBSERVATION_RESULTS_MUST_BE_EMPTY');
    for(const key of ['kill_switch','rollback','deletion','incident'])if(register[key]?.status!=='NOT_STARTED')failures.push('NO_OBSERVATION_RECOVERY_MUST_BE_NOT_STARTED');
  }else if(register.observation_observed===true){
    if(register.execution_observed!==true||register.dispatch_observed!==true||register.provider_live_tested!==true||register.feature_flag_changed!==true||register.feature_flag_restored_off!==true||!records.length)failures.push('OBSERVATION_EXECUTION_EVIDENCE_REQUIRED');
    if(register.kill_switch?.status!=='REARMED'||!validReference(register.kill_switch?.evidence_reference)||!validIso(register.kill_switch?.rearmed_at))failures.push('KILL_SWITCH_REARM_EVIDENCE_REQUIRED');
    if(!['NOT_REQUIRED','COMPLETED'].includes(register.rollback?.status)||!validReference(register.rollback?.evidence_reference)||!validIso(register.rollback?.completed_at))failures.push('ROLLBACK_DISPOSITION_EVIDENCE_REQUIRED');
    if(register.deletion?.status!=='COMPLETED'||!validReference(register.deletion?.evidence_reference)||!validIso(register.deletion?.completed_at))failures.push('REFERENCE_DELETION_EVIDENCE_REQUIRED');
    if(!['NONE','CLOSED'].includes(register.incident?.status)||!validReference(register.incident?.evidence_reference)||!validIso(register.incident?.resolved_at))failures.push('INCIDENT_DISPOSITION_EVIDENCE_REQUIRED');
  }else failures.push('OBSERVATION_OBSERVED_BOOLEAN_REQUIRED');

  const review=register.review||{};
  if(!['NOT_REQUESTED','APPROVED','REJECTED'].includes(review.status))failures.push('REVIEW_STATUS_INVALID');
  if(review.status==='NOT_REQUESTED'){if(review.review_reference!==null||review.reviewed_at!==null)failures.push('UNREQUESTED_REVIEW_FIELDS_MUST_BE_NULL');}
  else if(!validReference(review.review_reference)||!validIso(review.reviewed_at)||review.approval_inferred!==false)failures.push('PRODUCT_OWNER_REVIEW_EVIDENCE_REQUIRED');
  walk(register,(key)=>{if(FORBIDDEN_KEYS.has(key.toLowerCase()))failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);});
  const serialized=JSON.stringify(register);for(const pattern of SECRET_PATTERNS)if(pattern.test(serialized))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function sourceAccepted(source){const controls=Array.isArray(source?.control_records)?source.control_records:[];return source?.phase===58&&source?.status==='LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED'&&controls.length===LIMITED_PRODUCTION_SAFETY_CONTROLS.length&&controls.every((item)=>item.status==='VERIFIED')&&source?.execution_window?.status==='APPROVED'&&source?.review?.status==='APPROVED'&&source?.review?.approval_inferred===false&&source?.execution_performed===false&&source?.dispatch_performed===false&&source?.feature_flag_changed===false&&source?.student_traffic===false&&source?.public_traffic===false&&source?.production_promotion_allowed===false;}
function passes(item){return item.outcome==='PASS'&&item.schema_valid&&item.safety_valid&&!item.answer_leak_detected&&!item.pii_detected&&item.role_separation_valid&&item.locale_valid&&item.adult_internal_audience_valid&&item.synthetic_data_valid&&!item.public_traffic_detected&&!item.student_traffic_detected&&item.version_pinned&&!item.budget_breached&&!item.raw_content_persisted&&!item.provider_error&&!item.fallback_used;}

export function evaluateLimitedProductionObservationResults({sourceHandoffRegister,resultRegister,expectedSourceHash}={}){
  const validationFailures=inspectLimitedProductionObservationResultRegister(resultRegister,{expectedSourceHash}),acceptedSource=sourceAccepted(sourceHandoffRegister),records=Array.isArray(resultRegister?.result_records)?resultRegister.result_records:[],passed=records.filter(passes).length,failed=records.length-passed,complete=records.length===8&&LIMITED_OBSERVATION_LOCALES.every((locale)=>records.some((item)=>item.locale===locale)),kill=resultRegister?.kill_switch?.status==='REARMED',flag=resultRegister?.feature_flag_restored_off===true,deletion=resultRegister?.deletion?.status==='COMPLETED',rollback=resultRegister?.rollback?.status==='COMPLETED',incident=['NONE','CLOSED'].includes(resultRegister?.incident?.status),review=resultRegister?.review?.status||'NOT_REQUESTED',blockers=[];
  if(!acceptedSource)blockers.push('PHASE58_SAFETY_HANDOFF_NOT_ACCEPTED');
  if(!records.length)blockers.push('OBSERVATION_RESULTS_PENDING');else if(!complete)blockers.push('OBSERVATION_RESULTS_INCOMPLETE');
  if(records.length&&!kill)blockers.push('KILL_SWITCH_REARM_PENDING');
  if(records.length&&!flag)blockers.push('FEATURE_FLAG_RESTORE_PENDING');
  if(records.length&&!deletion)blockers.push('REFERENCE_DELETION_PENDING');
  if(records.length&&!incident)blockers.push('INCIDENT_DISPOSITION_PENDING');
  if(complete&&failed>0&&!rollback)blockers.push('ROLLBACK_EVIDENCE_PENDING');
  if(validationFailures.length)blockers.push('RESULT_REGISTER_INVALID');
  let status='BLOCKED_EXTERNAL',recommendation='HOLD';
  if(validationFailures.length)status='FAIL';
  else if(acceptedSource&&!records.length)status='AWAITING_OBSERVATION_RESULTS';
  else if(acceptedSource&&records.length&&(!complete||!kill||!flag||!deletion||!incident))status='OBSERVATION_RESULTS_INCOMPLETE';
  else if(acceptedSource&&complete&&failed>0){recommendation='REJECT_DELETE_AND_ROLLBACK';status=rollback?'LIMITED_PRODUCTION_OBSERVATION_REJECTED_AUTOMATICALLY':'REJECTION_EVIDENCE_PENDING';}
  else if(acceptedSource&&complete&&passed===8&&kill&&flag&&deletion&&incident){recommendation='REQUEST_LIMITED_PRODUCTION_OBSERVATION_REVIEW';if(review==='APPROVED')status='LIMITED_PRODUCTION_OBSERVATION_ACCEPTED_FOR_NEXT_HANDOFF';else if(review==='REJECTED'){recommendation='REJECT_DELETE_AND_ROLLBACK';status=rollback?'LIMITED_PRODUCTION_OBSERVATION_REJECTED_BY_PRODUCT_OWNER':'REJECTION_EVIDENCE_PENDING';}else status='READY_FOR_LIMITED_PRODUCTION_OBSERVATION_REVIEW';}
  return {status,recommendation,source_status:sourceHandoffRegister?.status||'UNKNOWN',source_accepted:acceptedSource,records_received:records.length,records_required:8,passed_records:passed,failed_records:failed,complete,kill_switch_rearmed:kill,feature_flag_restored_off:flag,reference_deletion_complete:deletion,incident_resolved:incident,rollback_complete:rollback,review_status:review,blockers,validation_failures:validationFailures,student_traffic_allowed:false,public_traffic_allowed:false,production_promotion_allowed:false};
}

export function createSyntheticAcceptedPhase58(source){const value=clone(source);value.status='LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED';value.control_records=LIMITED_PRODUCTION_SAFETY_CONTROLS.map((controlId,index)=>({control_id:controlId,status:'VERIFIED',evidence_reference:`SYNTHETIC-CONTROL-${index+1}`,verified_at:'2026-08-14T10:00:00+09:00'}));value.execution_window={status:'APPROVED',window_reference:'SYNTHETIC-WINDOW',starts_at:'2026-08-14T10:30:00+09:00',ends_at:'2026-08-14T10:45:00+09:00',approval_inferred:false};value.review={status:'APPROVED',review_reference:'SYNTHETIC-PO',reviewed_at:'2026-08-14T10:10:00+09:00',approval_inferred:false};return value;}
