import crypto from 'node:crypto';
import {evaluateTutorStagingReadiness} from './tutor-staging-readiness.mjs';

export const TUTOR_CANARY_LOCALES=Object.freeze(['ko','zh-CN','ja','en','es','fr','it','ru']);
export const TUTOR_CANARY_LIMITS=Object.freeze({
  maxRequests:8,
  maxInputTokens:16_000,
  maxOutputTokens:2_000,
  maxElapsedMs:900_000,
  concurrency:1,
  maxRetriesPerRequest:0
});

const SECRET_PATTERNS=[
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const FORBIDDEN_KEYS=new Set([
  'prompt','prompt_text','raw_input','input_text','response','response_text','output_text',
  'student_id','student_name','email','phone','api_key','authorization'
]);

function walk(value,visit){
  if(Array.isArray(value))return value.forEach((item)=>walk(item,visit));
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){visit(key,item);walk(item,visit);}
}

function validIso(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function sameArray(left,right){return JSON.stringify(left)===JSON.stringify(right);}

export function hashTutorStagingReadinessRegister(register){
  return crypto.createHash('sha256').update(`${JSON.stringify(register,null,2)}\n`).digest('hex');
}

export function inspectTutorCanaryHandoffRegister(register,{expectedReadinessHash}={}){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==51)failures.push('PHASE_MISMATCH');
  if(!['BLOCKED_EXTERNAL','READY_FOR_CANARY_HANDOFF'].includes(register.status))failures.push('STATUS_INVALID');
  for(const field of ['execution_authorized','provider_live_tested','api_key_accessed','dispatch_performed','external_deployment_performed']){
    if(register[field]!==false)failures.push(`${field.toUpperCase()}_MUST_REMAIN_FALSE`);
  }
  const source=register.source_readiness||{};
  if(source.phase!==50)failures.push('SOURCE_PHASE_MISMATCH');
  if(typeof source.register_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.register_sha256))failures.push('SOURCE_HASH_INVALID');
  if(expectedReadinessHash&&source.register_sha256!==expectedReadinessHash)failures.push('SOURCE_HASH_MISMATCH');

  const plan=register.plan||{};
  if(plan.environment!=='STAGING'||plan.production_traffic!==false||plan.synthetic_only!==true)failures.push('STAGING_SYNTHETIC_BOUNDARY');
  if(plan.capture_request_content!==false||plan.capture_response_content!==false)failures.push('CONTENT_CAPTURE_MUST_REMAIN_FALSE');
  if(plan.safety_identifier_mode!=='HASHED_SYNTHETIC_SESSION')failures.push('SAFETY_IDENTIFIER_MODE');
  if(!sameArray(plan.locales,TUTOR_CANARY_LOCALES))failures.push('LOCALE_MATRIX_MISMATCH');
  const expectedLimits={
    max_requests:TUTOR_CANARY_LIMITS.maxRequests,
    max_input_tokens:TUTOR_CANARY_LIMITS.maxInputTokens,
    max_output_tokens:TUTOR_CANARY_LIMITS.maxOutputTokens,
    max_elapsed_ms:TUTOR_CANARY_LIMITS.maxElapsedMs,
    concurrency:TUTOR_CANARY_LIMITS.concurrency,
    max_retries_per_request:TUTOR_CANARY_LIMITS.maxRetriesPerRequest
  };
  for(const [key,value] of Object.entries(expectedLimits))if(plan[key]!==value)failures.push(`LIMIT_MISMATCH:${key}`);
  if(plan.rearm_kill_switch_on_completion!==true||plan.rule_fallback_required!==true||plan.human_review_required!==true)failures.push('SAFETY_EXIT_BOUNDARY');

  const window=register.execution_window||{};
  if(!['PENDING_EXTERNAL','APPROVED'].includes(window.status))failures.push('WINDOW_STATUS_INVALID');
  if(window.status==='APPROVED'){
    if(typeof window.window_reference!=='string'||window.window_reference.length<3)failures.push('WINDOW_REFERENCE_REQUIRED');
    if(!validIso(window.starts_at)||!validIso(window.ends_at)||Date.parse(window.ends_at)<=Date.parse(window.starts_at))failures.push('WINDOW_TIME_INVALID');
  }else if(window.window_reference!==null||window.starts_at!==null||window.ends_at!==null){
    failures.push('PENDING_WINDOW_FIELDS_MUST_BE_NULL');
  }
  if(!Array.isArray(register.result_records)||register.result_records.length!==0)failures.push('PRE_EXECUTION_RESULTS_MUST_BE_EMPTY');
  if(register.rollback?.status!=='NOT_STARTED'||register.rollback?.evidence_reference!==null)failures.push('ROLLBACK_MUST_BE_NOT_STARTED');

  walk(register,(key)=>{if(FORBIDDEN_KEYS.has(key.toLowerCase()))failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);});
  const serialized=JSON.stringify(register);
  for(const pattern of SECRET_PATTERNS)if(pattern.test(serialized))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

export function evaluateTutorCanaryHandoff({readinessRegister,canaryRegister,expectedReadinessHash}={}){
  const validationFailures=inspectTutorCanaryHandoffRegister(canaryRegister,{expectedReadinessHash});
  const readiness=evaluateTutorStagingReadiness(readinessRegister);
  const windowApproved=canaryRegister?.execution_window?.status==='APPROVED';
  const blockers=[];
  if(!readiness.ready_for_canary)blockers.push('PHASE50_READINESS_BLOCKED');
  if(!windowApproved)blockers.push('EXECUTION_WINDOW_PENDING');
  if(validationFailures.length)blockers.push('CANARY_REGISTER_INVALID');
  const ready=validationFailures.length===0&&readiness.ready_for_canary&&windowApproved;
  return {
    status:validationFailures.length?'FAIL':ready?'READY_FOR_CANARY_HANDOFF':'BLOCKED_EXTERNAL',
    handoff_ready:ready,
    readiness_status:readiness.status,
    readiness_verified_controls:readiness.verified_controls,
    execution_window_approved:windowApproved,
    requests_planned:TUTOR_CANARY_LOCALES.length,
    blockers,
    validation_failures:validationFailures,
    execution_authorized:false,
    dispatch_performed:false,
    provider_live_tested:false
  };
}

export function buildTutorCanaryDryRunPlan(input){
  const result=evaluateTutorCanaryHandoff(input);
  if(!result.handoff_ready)throw new Error('CANARY_HANDOFF_NOT_READY');
  return {
    schema_version:'1.0.0',
    status:'DRY_RUN_ONLY',
    dispatch_performed:false,
    execution_authorized:false,
    sequence:[
      'VERIFY_FEATURE_OFF_AND_KILL_SWITCH_ON',
      'VERIFY_HEALTH_METRICS_AND_RULE_FALLBACK',
      'OPEN_APPROVED_SINGLE_CANARY_WINDOW',
      'RUN_ONE_SYNTHETIC_REQUEST_PER_LOCALE',
      'VALIDATE_SCHEMA_SAFETY_ROLE_AND_LOCALE_GATES',
      'REARM_KILL_SWITCH',
      'VERIFY_RULE_FALLBACK',
      'REQUEST_HUMAN_RESULT_REVIEW'
    ],
    slots:TUTOR_CANARY_LOCALES.map((locale,index)=>({
      slot:index+1,
      locale,
      scenario_reference:`CANARY-SAFE-HINT-${locale}`,
      synthetic_only:true,
      capture_content:false,
      max_attempts:1
    })),
    result_fields:[
      'attempt_reference','locale','scenario_reference','started_at','completed_at','outcome',
      'provider_request_reference','model_reference','prompt_version','input_tokens','output_tokens',
      'latency_ms','schema_valid','safety_valid','answer_leak_detected','pii_detected',
      'role_separation_valid','locale_valid','fallback_reason'
    ]
  };
}
