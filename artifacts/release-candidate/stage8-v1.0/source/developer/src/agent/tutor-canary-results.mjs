import crypto from 'node:crypto';
import {evaluateTutorCanaryHandoff,TUTOR_CANARY_LIMITS,TUTOR_CANARY_LOCALES} from './tutor-canary-handoff.mjs';

const APPROVED_MODEL='gpt-5.6-sol';
const APPROVED_PROMPT='mathchakchak-tutor-duo-v1.0.0';
const SECRET_PATTERNS=[
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const FORBIDDEN_KEYS=new Set([
  'prompt','prompt_text','raw_input','input_text','response','response_text','output_text',
  'student_id','student_name','email','phone','api_key','authorization','expected_answer'
]);
const OUTCOMES=new Set(['PASS','FAIL','FALLBACK','BLOCKED']);

function validIso(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function validReference(value){return typeof value==='string'&&value.length>=3;}
function walk(value,visit){
  if(Array.isArray(value))return value.forEach((item)=>walk(item,visit));
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){visit(key,item);walk(item,visit);}
}
function nonNegativeInteger(value){return Number.isInteger(value)&&value>=0;}

export function hashTutorCanaryHandoffRegister(register){
  return crypto.createHash('sha256').update(`${JSON.stringify(register,null,2)}\n`).digest('hex');
}

export function inspectTutorCanaryResultRegister(register,{expectedHandoffHash}={}){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==52)failures.push('PHASE_MISMATCH');
  if(!['BLOCKED_EXTERNAL','AWAITING_RESULTS','RESULTS_COLLECTED','READY_FOR_HUMAN_REVIEW','REJECTED'].includes(register.status))failures.push('STATUS_INVALID');
  if(register.api_key_accessed!==false)failures.push('API_KEY_ACCESS_MUST_REMAIN_FALSE');
  if(register.production_promotion_allowed!==false)failures.push('PRODUCTION_PROMOTION_MUST_REMAIN_FALSE');
  const source=register.source_handoff||{};
  if(source.phase!==51)failures.push('SOURCE_PHASE_MISMATCH');
  if(typeof source.register_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.register_sha256))failures.push('SOURCE_HASH_INVALID');
  if(expectedHandoffHash&&source.register_sha256!==expectedHandoffHash)failures.push('SOURCE_HASH_MISMATCH');

  const records=Array.isArray(register.result_records)?register.result_records:[];
  if(records.length>TUTOR_CANARY_LIMITS.maxRequests)failures.push('RESULT_COUNT_EXCEEDED');
  const attemptRefs=records.map((item)=>item?.attempt_reference);
  const locales=records.map((item)=>item?.locale);
  if(new Set(attemptRefs).size!==attemptRefs.length)failures.push('DUPLICATE_ATTEMPT_REFERENCE');
  if(new Set(locales).size!==locales.length)failures.push('DUPLICATE_LOCALE_RESULT');
  for(const record of records){
    const id=record?.attempt_reference||'UNKNOWN';
    if(!validReference(record?.attempt_reference))failures.push(`ATTEMPT_REFERENCE_REQUIRED:${id}`);
    if(!TUTOR_CANARY_LOCALES.includes(record?.locale))failures.push(`LOCALE_INVALID:${id}`);
    if(record?.scenario_reference!==`CANARY-SAFE-HINT-${record?.locale}`)failures.push(`SCENARIO_REFERENCE_INVALID:${id}`);
    if(!validIso(record?.started_at)||!validIso(record?.completed_at)||Date.parse(record.completed_at)<Date.parse(record.started_at))failures.push(`TIME_INVALID:${id}`);
    if(!OUTCOMES.has(record?.outcome))failures.push(`OUTCOME_INVALID:${id}`);
    for(const key of ['input_tokens','output_tokens','latency_ms'])if(!nonNegativeInteger(record?.[key]))failures.push(`METRIC_INVALID:${key}:${id}`);
    for(const key of ['schema_valid','safety_valid','answer_leak_detected','pii_detected','role_separation_valid','locale_valid'])if(typeof record?.[key]!=='boolean')failures.push(`GATE_INVALID:${key}:${id}`);
    if(record?.model_reference!==APPROVED_MODEL||record?.prompt_version!==APPROVED_PROMPT)failures.push(`VERSION_PIN_MISMATCH:${id}`);
    if(record?.outcome==='PASS'){
      if(!validReference(record.provider_request_reference))failures.push(`PROVIDER_REFERENCE_REQUIRED:${id}`);
      if(!record.schema_valid||!record.safety_valid||record.answer_leak_detected||record.pii_detected||!record.role_separation_valid||!record.locale_valid)failures.push(`PASS_GATE_CONTRADICTION:${id}`);
      if(record.fallback_reason!==null)failures.push(`PASS_FALLBACK_MUST_BE_NULL:${id}`);
    }else if(record.fallback_reason!==null&&!validReference(record.fallback_reason))failures.push(`FALLBACK_REASON_INVALID:${id}`);
  }
  const totalInput=records.reduce((sum,item)=>sum+Number(item.input_tokens||0),0);
  const totalOutput=records.reduce((sum,item)=>sum+Number(item.output_tokens||0),0);
  if(totalInput>TUTOR_CANARY_LIMITS.maxInputTokens)failures.push('INPUT_TOKEN_BUDGET_EXCEEDED');
  if(totalOutput>TUTOR_CANARY_LIMITS.maxOutputTokens)failures.push('OUTPUT_TOKEN_BUDGET_EXCEEDED');
  if(records.length){
    const starts=records.map((item)=>Date.parse(item.started_at)).filter(Number.isFinite);
    const ends=records.map((item)=>Date.parse(item.completed_at)).filter(Number.isFinite);
    if(starts.length&&ends.length&&Math.max(...ends)-Math.min(...starts)>TUTOR_CANARY_LIMITS.maxElapsedMs)failures.push('CANARY_DURATION_EXCEEDED');
  }

  if(register.execution_observed===false){
    if(register.provider_live_tested!==false||register.dispatch_observed!==false||records.length)failures.push('NO_EXECUTION_CONTRADICTION');
    if(register.kill_switch?.status!=='NOT_STARTED'||register.kill_switch?.evidence_reference!==null||register.kill_switch?.rearmed_at!==null)failures.push('KILL_SWITCH_MUST_BE_NOT_STARTED');
    if(register.rollback?.status!=='NOT_STARTED'||register.rollback?.evidence_reference!==null||register.rollback?.completed_at!==null)failures.push('ROLLBACK_MUST_BE_NOT_STARTED');
  }else if(register.execution_observed===true){
    if(register.dispatch_observed!==true||!records.length)failures.push('EXECUTION_RESULTS_REQUIRED');
    if(register.kill_switch?.status!=='REARMED'||!validReference(register.kill_switch?.evidence_reference)||!validIso(register.kill_switch?.rearmed_at))failures.push('KILL_SWITCH_REARM_EVIDENCE_REQUIRED');
    if(!['NOT_REQUIRED','COMPLETED'].includes(register.rollback?.status)||!validReference(register.rollback?.evidence_reference)||!validIso(register.rollback?.completed_at))failures.push('ROLLBACK_DISPOSITION_EVIDENCE_REQUIRED');
  }else failures.push('EXECUTION_OBSERVED_BOOLEAN_REQUIRED');

  const review=register.human_review||{};
  if(!['NOT_REQUESTED','APPROVED','REJECTED'].includes(review.status))failures.push('HUMAN_REVIEW_STATUS_INVALID');
  if(review.status==='NOT_REQUESTED'){
    if(review.review_reference!==null||review.reviewed_at!==null)failures.push('UNREQUESTED_REVIEW_FIELDS_MUST_BE_NULL');
  }else if(!validReference(review.review_reference)||!validIso(review.reviewed_at)||review.approval_inferred!==false)failures.push('HUMAN_REVIEW_EVIDENCE_REQUIRED');

  walk(register,(key)=>{if(FORBIDDEN_KEYS.has(key.toLowerCase()))failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);});
  const serialized=JSON.stringify(register);
  for(const pattern of SECRET_PATTERNS)if(pattern.test(serialized))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function recordPasses(record){
  return record.outcome==='PASS'&&record.schema_valid&&record.safety_valid&&!record.answer_leak_detected&&!record.pii_detected&&record.role_separation_valid&&record.locale_valid;
}

export function evaluateTutorCanaryResults({readinessRegister,handoffRegister,resultRegister,expectedReadinessHash,expectedHandoffHash}={}){
  const validationFailures=inspectTutorCanaryResultRegister(resultRegister,{expectedHandoffHash});
  const handoff=evaluateTutorCanaryHandoff({readinessRegister,canaryRegister:handoffRegister,expectedReadinessHash});
  const records=Array.isArray(resultRegister?.result_records)?resultRegister.result_records:[];
  const passedRecords=records.filter(recordPasses).length;
  const failedRecords=records.length-passedRecords;
  const complete=records.length===TUTOR_CANARY_LOCALES.length&&TUTOR_CANARY_LOCALES.every((locale)=>records.some((item)=>item.locale===locale));
  const killSwitchRearmed=resultRegister?.kill_switch?.status==='REARMED';
  const rollbackComplete=resultRegister?.rollback?.status==='COMPLETED';
  const review=resultRegister?.human_review?.status||'NOT_REQUESTED';
  const blockers=[];
  if(!handoff.handoff_ready)blockers.push('PHASE51_HANDOFF_BLOCKED');
  if(!records.length)blockers.push('CANARY_RESULTS_PENDING');
  else if(!complete)blockers.push('CANARY_RESULTS_INCOMPLETE');
  if(records.length&&!killSwitchRearmed)blockers.push('KILL_SWITCH_REARM_PENDING');
  if(failedRecords>0&&!rollbackComplete)blockers.push('ROLLBACK_EVIDENCE_PENDING');
  if(validationFailures.length)blockers.push('RESULT_REGISTER_INVALID');

  let status='BLOCKED_EXTERNAL',recommendation='HOLD';
  if(validationFailures.length)status='FAIL';
  else if(handoff.handoff_ready&&!records.length)status='AWAITING_RESULTS';
  else if(handoff.handoff_ready&&records.length&&(!complete||!killSwitchRearmed||(failedRecords>0&&!rollbackComplete)))status='RESULTS_INCOMPLETE';
  else if(handoff.handoff_ready&&complete&&failedRecords>0){status='CANARY_REJECTED_AUTOMATICALLY';recommendation='REJECT_AND_ROLLBACK';}
  else if(handoff.handoff_ready&&complete&&passedRecords===8&&killSwitchRearmed){
    recommendation='ACCEPT_FOR_EXTENDED_STAGING';
    if(review==='APPROVED')status='CANARY_ACCEPTED_FOR_EXTENDED_STAGING';
    else if(review==='REJECTED'){status='CANARY_REJECTED_BY_HUMAN_REVIEW';recommendation='REJECT_AND_ROLLBACK';}
    else status='READY_FOR_HUMAN_CANARY_REVIEW';
  }
  return {
    status,recommendation,
    handoff_status:handoff.status,
    records_received:records.length,
    records_required:TUTOR_CANARY_LOCALES.length,
    passed_records:passedRecords,
    failed_records:failedRecords,
    kill_switch_rearmed:killSwitchRearmed,
    rollback_complete:rollbackComplete,
    human_review_status:review,
    blockers,
    validation_failures:validationFailures,
    production_promotion_allowed:false,
    execution_authorized:false
  };
}
