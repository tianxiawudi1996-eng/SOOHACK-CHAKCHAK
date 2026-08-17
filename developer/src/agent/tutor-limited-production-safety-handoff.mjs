import crypto from 'node:crypto';

export const LIMITED_PRODUCTION_SAFETY_CONTROLS = Object.freeze([
  'SOURCE_ACCEPTED',
  'MODEL_PROMPT_PINNED',
  'ADULT_INTERNAL_AUDIENCE_ONLY',
  'SYNTHETIC_DATA_ONLY',
  'DIRECT_IDENTIFIERS_PROHIBITED',
  'RAW_CONTENT_PERSISTENCE_DISABLED',
  'REFERENCE_METADATA_RETENTION_LIMITED',
  'DELETION_ROUTE_READY',
  'INCIDENT_ROUTE_READY',
  'SAFETY_ESCALATION_READY',
  'MONITORING_ALERTS_READY',
  'KILL_SWITCH_ARMED',
  'ROLLBACK_READY',
  'FEATURE_FLAG_DEFAULT_OFF',
  'RATE_AND_SPEND_LIMITS_READY',
  'STUDENT_AND_PUBLIC_TRAFFIC_DENIED'
]);

const FALSE_EXTERNAL_FIELDS = Object.freeze([
  'api_key_accessed',
  'execution_performed',
  'dispatch_performed',
  'provider_live_tested',
  'feature_flag_changed',
  'student_traffic',
  'public_traffic',
  'production_promotion_allowed'
]);
const FORBIDDEN_KEYS = new Set([
  'api_key','authorization_header','password','token','secret_value','prompt_text',
  'raw_input','response_text','student_id','student_name','email','phone','expected_answer'
]);
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const EXPECTED_LIMITS = Object.freeze({
  maximum_requests: 8,
  maximum_duration_minutes: 15,
  maximum_concurrency: 1,
  automatic_retries: 0,
  reference_metadata_retention_days: 30,
  raw_content_retention_days: 0
});

const validIso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const validReference = (value) => typeof value === 'string' && value.length >= 3;
const clone = (value) => JSON.parse(JSON.stringify(value));
function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item);
    walk(item, visit);
  }
}

export function hashLimitedProductionSafetySource(register) {
  return crypto.createHash('sha256').update(`${JSON.stringify(register, null, 2)}\n`).digest('hex');
}

export function inspectLimitedProductionSafetyHandoffRegister(register, {expectedSourceHash} = {}) {
  const failures = [];
  if (!register || typeof register !== 'object') return ['REGISTER_REQUIRED'];
  if (register.schema_version !== '1.0.0') failures.push('SCHEMA_VERSION_MISMATCH');
  if (register.phase !== 58) failures.push('PHASE_MISMATCH');
  if (!['BLOCKED_EXTERNAL','LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE','READY_FOR_LIMITED_PRODUCTION_SAFETY_REVIEW','LIMITED_PRODUCTION_SAFETY_HANDOFF_REJECTED'].includes(register.status)) failures.push('STATUS_INVALID');
  for (const key of FALSE_EXTERNAL_FIELDS) if (register[key] !== false) failures.push(`${key.toUpperCase()}_MUST_REMAIN_FALSE`);

  const source = register.source_results || {};
  if (source.phase !== 57) failures.push('SOURCE_PHASE_MISMATCH');
  if (typeof source.register_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(source.register_sha256)) failures.push('SOURCE_HASH_INVALID');
  if (expectedSourceHash && source.register_sha256 !== expectedSourceHash) failures.push('SOURCE_HASH_MISMATCH');

  const limits = register.limits || {};
  for (const [key, expected] of Object.entries(EXPECTED_LIMITS)) if (limits[key] !== expected) failures.push(`LIMIT_MISMATCH:${key}`);

  const controls = Array.isArray(register.control_records) ? register.control_records : [];
  const ids = controls.map((item) => item?.control_id);
  if (controls.length !== LIMITED_PRODUCTION_SAFETY_CONTROLS.length) failures.push('CONTROL_COUNT_MISMATCH');
  if (new Set(ids).size !== ids.length) failures.push('DUPLICATE_CONTROL_ID');
  for (const id of LIMITED_PRODUCTION_SAFETY_CONTROLS) if (!ids.includes(id)) failures.push(`CONTROL_MISSING:${id}`);
  for (const item of controls) {
    const id = item?.control_id || 'UNKNOWN';
    if (!LIMITED_PRODUCTION_SAFETY_CONTROLS.includes(id)) failures.push(`CONTROL_UNKNOWN:${id}`);
    if (!['PENDING_EXTERNAL','VERIFIED','REJECTED'].includes(item?.status)) failures.push(`CONTROL_STATUS_INVALID:${id}`);
    if (item?.status === 'PENDING_EXTERNAL') {
      if (item.evidence_reference !== null || item.verified_at !== null) failures.push(`PENDING_CONTROL_EVIDENCE_MUST_BE_NULL:${id}`);
    } else if (!validReference(item?.evidence_reference) || !validIso(item?.verified_at)) failures.push(`CONTROL_EVIDENCE_REQUIRED:${id}`);
  }

  const window = register.execution_window || {};
  if (!['PENDING_EXTERNAL','APPROVED','REJECTED'].includes(window.status)) failures.push('EXECUTION_WINDOW_STATUS_INVALID');
  if (window.status === 'PENDING_EXTERNAL') {
    if (window.window_reference !== null || window.starts_at !== null || window.ends_at !== null) failures.push('PENDING_WINDOW_FIELDS_MUST_BE_NULL');
  } else if (!validReference(window.window_reference) || !validIso(window.starts_at) || !validIso(window.ends_at) || Date.parse(window.ends_at) <= Date.parse(window.starts_at) || window.approval_inferred !== false) failures.push('EXECUTION_WINDOW_EVIDENCE_REQUIRED');

  const review = register.review || {};
  if (!['NOT_REQUESTED','APPROVED','REJECTED'].includes(review.status)) failures.push('REVIEW_STATUS_INVALID');
  if (review.status === 'NOT_REQUESTED') {
    if (review.review_reference !== null || review.reviewed_at !== null) failures.push('UNREQUESTED_REVIEW_FIELDS_MUST_BE_NULL');
  } else if (!validReference(review.review_reference) || !validIso(review.reviewed_at) || review.approval_inferred !== false) failures.push('PRODUCT_OWNER_REVIEW_EVIDENCE_REQUIRED');

  walk(register, (key) => { if (FORBIDDEN_KEYS.has(key.toLowerCase())) failures.push(`FORBIDDEN_CONTENT_KEY:${key}`); });
  const serialized = JSON.stringify(register);
  for (const pattern of SECRET_PATTERNS) if (pattern.test(serialized)) failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function sourceAccepted(source) {
  const records = Array.isArray(source?.result_records) ? source.result_records : [];
  return source?.phase === 57 &&
    source?.status === 'CONTROLLED_ROLLOUT_ACCEPTED_FOR_LIMITED_PRODUCTION_HANDOFF' &&
    source?.rollout_observed === true &&
    source?.feature_flag_restored_off === true &&
    source?.kill_switch?.status === 'REARMED' &&
    records.length === 8 && records.every((item) => item.outcome === 'PASS') &&
    source?.review?.status === 'APPROVED' && source?.review?.approval_inferred === false &&
    source?.student_traffic === false && source?.public_traffic === false &&
    source?.production_promotion_allowed === false;
}

export function evaluateLimitedProductionSafetyHandoff({sourceResultRegister, handoffRegister, expectedSourceHash} = {}) {
  const validationFailures = inspectLimitedProductionSafetyHandoffRegister(handoffRegister, {expectedSourceHash});
  const acceptedSource = sourceAccepted(sourceResultRegister);
  const controls = Array.isArray(handoffRegister?.control_records) ? handoffRegister.control_records : [];
  const verified = controls.filter((item) => item.status === 'VERIFIED').length;
  const rejected = controls.filter((item) => item.status === 'REJECTED').length;
  const controlsComplete = controls.length === LIMITED_PRODUCTION_SAFETY_CONTROLS.length && verified === LIMITED_PRODUCTION_SAFETY_CONTROLS.length;
  const windowStatus = handoffRegister?.execution_window?.status || 'PENDING_EXTERNAL';
  const reviewStatus = handoffRegister?.review?.status || 'NOT_REQUESTED';
  const blockers = [];
  if (!acceptedSource) blockers.push('PHASE57_CONTROLLED_ROLLOUT_RESULTS_NOT_ACCEPTED');
  if (!controlsComplete) blockers.push('SAFETY_CONTROLS_INCOMPLETE');
  if (windowStatus !== 'APPROVED') blockers.push('EXECUTION_WINDOW_NOT_APPROVED');
  if (validationFailures.length) blockers.push('HANDOFF_REGISTER_INVALID');

  let status = 'BLOCKED_EXTERNAL';
  let recommendation = 'HOLD';
  if (validationFailures.length) status = 'FAIL';
  else if (rejected > 0 || windowStatus === 'REJECTED' || reviewStatus === 'REJECTED') {
    status = 'LIMITED_PRODUCTION_SAFETY_HANDOFF_REJECTED';
    recommendation = 'KEEP_FEATURE_FLAG_OFF';
  } else if (acceptedSource && controlsComplete && windowStatus === 'APPROVED') {
    status = reviewStatus === 'APPROVED' ? 'LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED' : 'READY_FOR_LIMITED_PRODUCTION_SAFETY_REVIEW';
    recommendation = reviewStatus === 'APPROVED' ? 'CREATE_NON_EXECUTING_OBSERVATION_HANDOFF' : 'REQUEST_PRODUCT_OWNER_REVIEW';
  } else if (acceptedSource) status = 'LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE';

  return {
    status,
    recommendation,
    source_status: sourceResultRegister?.status || 'UNKNOWN',
    source_accepted: acceptedSource,
    controls_required: LIMITED_PRODUCTION_SAFETY_CONTROLS.length,
    controls_verified: verified,
    controls_rejected: rejected,
    execution_window_status: windowStatus,
    review_status: reviewStatus,
    blockers,
    validation_failures: validationFailures,
    execution_authorized: false,
    student_traffic_allowed: false,
    public_traffic_allowed: false,
    production_promotion_allowed: false
  };
}

export function createSyntheticAcceptedPhase57(source) {
  const value = clone(source);
  value.status = 'CONTROLLED_ROLLOUT_ACCEPTED_FOR_LIMITED_PRODUCTION_HANDOFF';
  value.rollout_observed = true;
  value.dispatch_observed = true;
  value.provider_live_tested = true;
  value.feature_flag_changed = true;
  value.feature_flag_restored_off = true;
  value.result_records = ['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale, index) => ({locale, outcome:'PASS', attempt_reference:`SYNTHETIC-${index + 1}`}));
  value.kill_switch = {status:'REARMED', evidence_reference:'SYNTHETIC-KILL', rearmed_at:'2026-08-13T10:00:00+09:00'};
  value.rollback = {status:'NOT_REQUIRED', evidence_reference:'SYNTHETIC-ROLLBACK-CHECK', completed_at:'2026-08-13T10:00:01+09:00'};
  value.review = {status:'APPROVED', review_reference:'SYNTHETIC-PO', reviewed_at:'2026-08-13T10:01:00+09:00', approval_inferred:false};
  return value;
}
