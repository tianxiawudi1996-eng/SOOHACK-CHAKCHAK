import crypto from 'node:crypto';
import { EXPANSION_PLAN_CONTROLS } from './tutor-limited-production-expansion-plan.mjs';

export const FINAL_HANDOFF_LOCALES = Object.freeze(['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru']);
export const FINAL_PREFLIGHT_CONTROLS = Object.freeze([
  'SOURCE_PLAN_ACCEPTED',
  'SOURCE_HASH_PINNED',
  'MODEL_PROMPT_PIN_VERIFIED',
  'PRODUCTION_PROJECT_ISOLATED',
  'SECRET_MANAGER_BOUNDARY_VERIFIED',
  'RATE_AND_SPEND_LIMITS_VERIFIED',
  'INTERNAL_ADULT_ALLOWLIST_VERIFIED',
  'SYNTHETIC_DATASET_HASH_VERIFIED',
  'RAW_RETENTION_ZERO_VERIFIED',
  'REFERENCE_DELETION_VERIFIED',
  'MONITORING_ALERTS_VERIFIED',
  'SAFETY_ESCALATION_VERIFIED',
  'INCIDENT_ROUTE_VERIFIED',
  'KILL_SWITCH_REHEARSAL_VERIFIED',
  'ROLLBACK_REHEARSAL_VERIFIED',
  'STUDENT_PUBLIC_ROUTE_DENY_VERIFIED'
]);

const EXPECTED_LIMITS = Object.freeze({
  maximum_requests: 64,
  maximum_requests_per_locale: 8,
  maximum_duration_minutes: 60,
  maximum_concurrency: 2,
  automatic_retries: 0,
  raw_content_retention_days: 0,
  reference_metadata_retention_days: 30
});
const FALSE_FIELDS = [
  'api_key_accessed',
  'preflight_executed',
  'handoff_dispatched',
  'provider_live_tested',
  'feature_flag_changed',
  'student_traffic',
  'public_traffic',
  'production_promotion_allowed'
];
const FORBIDDEN_KEYS = new Set([
  'api_key', 'authorization_header', 'password', 'token', 'secret_value',
  'prompt_text', 'raw_input', 'response_text', 'student_id', 'student_name',
  'operator_name', 'reviewer_name', 'email', 'phone', 'expected_answer'
]);
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /OPENAI_API_KEY\s*[:=]\s*[^\s"']+/i,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];

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

export function hashFinalPreflightSource(register) {
  return crypto.createHash('sha256').update(`${JSON.stringify(register, null, 2)}\n`).digest('hex');
}

export function inspectFinalPreflightRegister(register, { expectedSourceHash } = {}) {
  const failures = [];
  if (!register || typeof register !== 'object') return ['REGISTER_REQUIRED'];
  if (register.schema_version !== '1.0.0') failures.push('SCHEMA_VERSION_MISMATCH');
  if (register.phase !== 62) failures.push('PHASE_MISMATCH');
  if (!['BLOCKED_EXTERNAL', 'FINAL_PREFLIGHT_INCOMPLETE', 'READY_FOR_FINAL_HANDOFF_REVIEW', 'FINAL_HANDOFF_REJECTED'].includes(register.status)) failures.push('STATUS_INVALID');
  for (const key of FALSE_FIELDS) if (register[key] !== false) failures.push(`${key.toUpperCase()}_MUST_REMAIN_FALSE`);

  const source = register.source_plan || {};
  if (source.phase !== 61) failures.push('SOURCE_PHASE_MISMATCH');
  if (typeof source.register_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(source.register_sha256)) failures.push('SOURCE_HASH_INVALID');
  if (expectedSourceHash && source.register_sha256 !== expectedSourceHash) failures.push('SOURCE_HASH_MISMATCH');
  if (register.version_pins?.model_reference !== 'gpt-5.6-sol') failures.push('MODEL_PIN_MISMATCH');
  if (register.version_pins?.prompt_version !== 'mathchakchak-tutor-duo-v1.0.0') failures.push('PROMPT_PIN_MISMATCH');
  for (const [key, expected] of Object.entries(EXPECTED_LIMITS)) if (register.limits?.[key] !== expected) failures.push(`LIMIT_MISMATCH:${key}`);

  const packets = Array.isArray(register.handoff_packets) ? register.handoff_packets : [];
  const packetIds = packets.map((item) => item?.packet_id);
  const locales = packets.map((item) => item?.locale);
  if (packets.length !== 8) failures.push('HANDOFF_PACKET_COUNT_MISMATCH');
  if (new Set(packetIds).size !== packetIds.length) failures.push('DUPLICATE_PACKET_ID');
  if (new Set(locales).size !== locales.length) failures.push('DUPLICATE_PACKET_LOCALE');
  for (const locale of FINAL_HANDOFF_LOCALES) if (!locales.includes(locale)) failures.push(`HANDOFF_LOCALE_MISSING:${locale}`);
  for (const item of packets) {
    const id = item?.packet_id || 'UNKNOWN';
    if (item?.packet_id !== `FINAL-HANDOFF-${item?.locale}` || item?.scenario_reference !== `EXPANSION-INTERNAL-SYNTHETIC-${item?.locale}`) failures.push(`HANDOFF_PACKET_MAPPING_INVALID:${id}`);
    if (item?.maximum_requests !== 8 || item?.status !== 'DRAFT_NON_DISPATCHING') failures.push(`HANDOFF_PACKET_BOUNDARY_INVALID:${id}`);
  }
  if (packets.reduce((sum, item) => sum + Number(item.maximum_requests || 0), 0) !== 64) failures.push('HANDOFF_REQUEST_TOTAL_MISMATCH');

  const controls = Array.isArray(register.preflight_records) ? register.preflight_records : [];
  const controlIds = controls.map((item) => item?.control_id);
  if (controls.length !== 16) failures.push('PREFLIGHT_CONTROL_COUNT_MISMATCH');
  if (new Set(controlIds).size !== controlIds.length) failures.push('DUPLICATE_PREFLIGHT_CONTROL_ID');
  for (const id of FINAL_PREFLIGHT_CONTROLS) if (!controlIds.includes(id)) failures.push(`PREFLIGHT_CONTROL_MISSING:${id}`);
  for (const item of controls) {
    const id = item?.control_id || 'UNKNOWN';
    if (!FINAL_PREFLIGHT_CONTROLS.includes(id)) failures.push(`PREFLIGHT_CONTROL_UNKNOWN:${id}`);
    if (!['PENDING_EXTERNAL', 'VERIFIED', 'REJECTED'].includes(item?.status)) failures.push(`PREFLIGHT_STATUS_INVALID:${id}`);
    if (item?.status === 'PENDING_EXTERNAL') {
      if (item.evidence_reference !== null || item.verified_at !== null) failures.push(`PENDING_PREFLIGHT_FIELDS_MUST_BE_NULL:${id}`);
    } else if (!validReference(item?.evidence_reference) || !validIso(item?.verified_at)) failures.push(`PREFLIGHT_EVIDENCE_REQUIRED:${id}`);
  }

  const operator = register.operator_assignment || {};
  if (!['PENDING_EXTERNAL', 'VERIFIED', 'REJECTED'].includes(operator.status)) failures.push('OPERATOR_STATUS_INVALID');
  if (operator.status === 'PENDING_EXTERNAL') {
    for (const key of ['operator_reference', 'authorized_channel_reference', 'assigned_at', 'acknowledged_at', 'conflict_declaration']) if (operator[key] !== null) failures.push('PENDING_OPERATOR_FIELDS_MUST_BE_NULL');
  } else if (
    !validReference(operator.operator_reference) ||
    !validReference(operator.authorized_channel_reference) ||
    !validIso(operator.assigned_at) ||
    !validIso(operator.acknowledged_at) ||
    Date.parse(operator.acknowledged_at) < Date.parse(operator.assigned_at) ||
    !['NO_CONFLICT', 'DISCLOSED_ACCEPTED'].includes(operator.conflict_declaration) ||
    operator.approval_inferred !== false
  ) failures.push('OPERATOR_EVIDENCE_REQUIRED');

  const review = register.final_review || {};
  if (!['NOT_REQUESTED', 'APPROVED', 'REJECTED'].includes(review.status)) failures.push('FINAL_REVIEW_STATUS_INVALID');
  if (review.status === 'NOT_REQUESTED') {
    if (review.review_reference !== null || review.reviewed_at !== null) failures.push('UNREQUESTED_FINAL_REVIEW_FIELDS_MUST_BE_NULL');
  } else if (!validReference(review.review_reference) || !validIso(review.reviewed_at) || review.approval_inferred !== false) failures.push('PRODUCT_OWNER_FINAL_REVIEW_EVIDENCE_REQUIRED');

  walk(register, (key) => {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) failures.push(`FORBIDDEN_CONTENT_KEY:${key}`);
  });
  const serialized = JSON.stringify(register);
  for (const pattern of SECRET_PATTERNS) if (pattern.test(serialized)) failures.push('SECRET_MATERIAL_DETECTED');
  return [...new Set(failures)];
}

function sourceAccepted(source) {
  const controls = Array.isArray(source?.control_records) ? source.control_records : [];
  return source?.phase === 61 &&
    source?.status === 'EXPANSION_PLAN_ACCEPTED_FOR_EXECUTION_HANDOFF' &&
    controls.length === EXPANSION_PLAN_CONTROLS.length &&
    controls.every((item) => item.status === 'VERIFIED') &&
    source?.execution_window?.status === 'APPROVED' &&
    source?.review?.status === 'APPROVED' &&
    source?.review?.approval_inferred === false &&
    source?.plan_executed === false &&
    source?.dispatch_performed === false &&
    source?.feature_flag_changed === false &&
    source?.student_traffic === false &&
    source?.public_traffic === false &&
    source?.production_promotion_allowed === false;
}

export function evaluateFinalPreflightHandoff({ sourcePlanRegister, handoffRegister, expectedSourceHash } = {}) {
  const validationFailures = inspectFinalPreflightRegister(handoffRegister, { expectedSourceHash });
  const sourceOk = sourceAccepted(sourcePlanRegister);
  const controls = Array.isArray(handoffRegister?.preflight_records) ? handoffRegister.preflight_records : [];
  const verified = controls.filter((item) => item.status === 'VERIFIED').length;
  const rejected = controls.filter((item) => item.status === 'REJECTED').length;
  const complete = controls.length === 16 && verified === 16;
  const operatorStatus = handoffRegister?.operator_assignment?.status || 'PENDING_EXTERNAL';
  const reviewStatus = handoffRegister?.final_review?.status || 'NOT_REQUESTED';
  const blockers = [];
  if (!sourceOk) blockers.push('PHASE61_EXPANSION_PLAN_NOT_ACCEPTED');
  if (!complete) blockers.push('FINAL_PREFLIGHT_CONTROLS_INCOMPLETE');
  if (operatorStatus !== 'VERIFIED') blockers.push('AUTHORIZED_OPERATOR_NOT_VERIFIED');
  if (validationFailures.length) blockers.push('FINAL_PREFLIGHT_REGISTER_INVALID');

  let status = 'BLOCKED_EXTERNAL';
  let recommendation = 'HOLD';
  if (validationFailures.length) status = 'FAIL';
  else if (rejected > 0 || operatorStatus === 'REJECTED' || reviewStatus === 'REJECTED') {
    status = 'FINAL_HANDOFF_REJECTED';
    recommendation = 'KEEP_FEATURE_FLAG_OFF';
  } else if (sourceOk && complete && operatorStatus === 'VERIFIED') {
    if (reviewStatus === 'APPROVED') {
      status = 'FINAL_PREFLIGHT_ACCEPTED_FOR_EXTERNAL_EXECUTION_DECISION';
      recommendation = 'CREATE_NON_DISPATCHING_EXTERNAL_EXECUTION_DECISION_PACKET';
    } else {
      status = 'READY_FOR_FINAL_HANDOFF_REVIEW';
      recommendation = 'REQUEST_SINGLE_PRODUCT_OWNER_REVIEW';
    }
  } else if (sourceOk) status = 'FINAL_PREFLIGHT_INCOMPLETE';

  return {
    status,
    recommendation,
    source_status: sourcePlanRegister?.status || 'UNKNOWN',
    source_accepted: sourceOk,
    handoff_packets: handoffRegister?.handoff_packets?.length || 0,
    preflight_required: 16,
    preflight_verified: verified,
    preflight_rejected: rejected,
    operator_status: operatorStatus,
    final_review_status: reviewStatus,
    blockers,
    validation_failures: validationFailures,
    execution_authorized: false,
    dispatch_allowed: false,
    feature_flag_change_allowed: false,
    student_traffic_allowed: false,
    public_traffic_allowed: false,
    production_promotion_allowed: false
  };
}

export function createSyntheticAcceptedPhase61(source) {
  const value = clone(source);
  value.status = 'EXPANSION_PLAN_ACCEPTED_FOR_EXECUTION_HANDOFF';
  value.control_records = EXPANSION_PLAN_CONTROLS.map((id, index) => ({
    control_id: id,
    status: 'VERIFIED',
    evidence_reference: `SYNTHETIC-PLAN-CONTROL-${index + 1}`,
    verified_at: '2026-08-17T10:00:00+09:00'
  }));
  value.execution_window = {
    status: 'APPROVED',
    window_reference: 'SYNTHETIC-PLAN-WINDOW',
    starts_at: '2026-08-17T10:30:00+09:00',
    ends_at: '2026-08-17T11:30:00+09:00',
    approval_inferred: false
  };
  value.review = {
    status: 'APPROVED',
    review_reference: 'SYNTHETIC-PLAN-PO',
    reviewed_at: '2026-08-17T10:10:00+09:00',
    approval_inferred: false
  };
  return value;
}
