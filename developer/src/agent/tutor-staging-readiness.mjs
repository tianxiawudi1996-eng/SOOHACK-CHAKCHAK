export const STAGING_READINESS_CONTROL_IDS=Object.freeze([
  'STAGING_PROJECT_SEPARATION',
  'SECRET_MANAGER_BINDING',
  'RATE_LIMIT_CONFIGURATION',
  'SPEND_LIMIT_CONFIGURATION',
  'UNDER_18_DATA_CONTROL_REVIEW',
  'RETENTION_AND_ZDR_DECISION',
  'IMMUTABLE_MODEL_SNAPSHOT_PIN',
  'HUMAN_EVAL_CALIBRATION',
  'CENTRAL_METRICS_AND_ALERT_ROUTE',
  'ROLLBACK_REHEARSAL'
]);

const SECRET_PATTERNS=[
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];

function serialized(value){return JSON.stringify(value);}

export function inspectStagingReadinessRegister(register){
  const failures=[];
  if(!register||typeof register!=='object')return ['REGISTER_REQUIRED'];
  if(register.schema_version!=='1.0.0')failures.push('SCHEMA_VERSION_MISMATCH');
  if(register.phase!==50)failures.push('PHASE_MISMATCH');
  if(register.execution_authorized!==false)failures.push('EXECUTION_MUST_REMAIN_FALSE');
  if(register.provider_live_tested!==false)failures.push('LIVE_TEST_MUST_REMAIN_FALSE');
  if(register.api_key_accessed!==false)failures.push('API_KEY_ACCESS_MUST_REMAIN_FALSE');
  const controls=Array.isArray(register.controls)?register.controls:[];
  if(controls.length!==STAGING_READINESS_CONTROL_IDS.length)failures.push('CONTROL_COUNT_MISMATCH');
  const ids=controls.map((control)=>control?.id);
  if(new Set(ids).size!==ids.length)failures.push('DUPLICATE_CONTROL_ID');
  for(const id of STAGING_READINESS_CONTROL_IDS)if(!ids.includes(id))failures.push(`MISSING_CONTROL:${id}`);
  for(const control of controls){
    if(!['PENDING_EXTERNAL','VERIFIED','REJECTED'].includes(control?.status))failures.push(`INVALID_STATUS:${control?.id||'UNKNOWN'}`);
    if(control?.status==='VERIFIED'){
      if(typeof control.evidence_reference!=='string'||control.evidence_reference.length<3)failures.push(`EVIDENCE_REQUIRED:${control.id}`);
      if(typeof control.verified_at!=='string'||!Number.isFinite(Date.parse(control.verified_at)))failures.push(`VERIFIED_AT_REQUIRED:${control.id}`);
    }else if(control?.evidence_reference!==null||control?.verified_at!==null){
      failures.push(`UNVERIFIED_EVIDENCE_MUST_BE_NULL:${control?.id||'UNKNOWN'}`);
    }
  }
  const text=serialized(register);
  for(const pattern of SECRET_PATTERNS)if(pattern.test(text))failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

export function evaluateTutorStagingReadiness(register){
  const validationFailures=inspectStagingReadinessRegister(register);
  const controls=Array.isArray(register?.controls)?register.controls:[];
  const verified=controls.filter((control)=>control.status==='VERIFIED').length;
  const rejected=controls.filter((control)=>control.status==='REJECTED').map((control)=>control.id);
  const pending=STAGING_READINESS_CONTROL_IDS.filter((id)=>!controls.some((control)=>control.id===id&&control.status==='VERIFIED'));
  const approval=register?.authorization||{};
  const approvalValid=approval.status==='APPROVED'&&
    typeof approval.approval_reference==='string'&&approval.approval_reference.length>=3&&
    typeof approval.approved_at==='string'&&Number.isFinite(Date.parse(approval.approved_at));
  const ready=validationFailures.length===0&&verified===STAGING_READINESS_CONTROL_IDS.length&&rejected.length===0&&approvalValid;
  return {
    status:ready?'READY_FOR_CONTROLLED_STAGING_CANARY':'BLOCKED_EXTERNAL',
    ready_for_canary:ready,
    verified_controls:verified,
    required_controls:STAGING_READINESS_CONTROL_IDS.length,
    pending_controls:pending,
    rejected_controls:rejected,
    authorization_valid:approvalValid,
    validation_failures:validationFailures,
    execution_authorized:false,
    provider_live_tested:false
  };
}
