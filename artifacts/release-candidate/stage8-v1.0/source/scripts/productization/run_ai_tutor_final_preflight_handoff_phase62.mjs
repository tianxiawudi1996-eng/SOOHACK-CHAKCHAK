import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  FINAL_PREFLIGHT_CONTROLS,
  createSyntheticAcceptedPhase61,
  evaluateFinalPreflightHandoff,
  hashFinalPreflightSource,
  inspectFinalPreflightRegister
} from '../../developer/src/agent/tutor-limited-production-final-preflight-handoff.mjs';

const sourcePath = 'docs/productization/evidence/PHASE_61_LIMITED_PRODUCTION_EXPANSION_PLAN_REGISTER.json';
const handoffPath = 'docs/productization/evidence/PHASE_62_LIMITED_PRODUCTION_FINAL_PREFLIGHT_HANDOFF_REGISTER.json';
const contractPath = 'developer/contracts/ai-tutor-limited-production-final-preflight-handoff-v1.json';
const outputPath = 'docs/productization/evidence/PHASE_62_AI_TUTOR_FINAL_PREFLIGHT_HANDOFF_QA.json';
const sourceBytes = fs.readFileSync(sourcePath);
const handoffBytes = fs.readFileSync(handoffPath);
const contractBytes = fs.readFileSync(contractPath);
const source = JSON.parse(sourceBytes);
const handoffRegister = JSON.parse(handoffBytes);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const scenarios = [];
const record = (id, passed, observed) => scenarios.push({ id, passed, observed });

function pair() {
  const acceptedSource = createSyntheticAcceptedPhase61(source);
  const handoff = clone(handoffRegister);
  const hash = hashFinalPreflightSource(acceptedSource);
  handoff.source_plan.register_sha256 = hash;
  return { acceptedSource, handoff, hash };
}

function verify(handoff) {
  handoff.preflight_records = FINAL_PREFLIGHT_CONTROLS.map((id, index) => ({ control_id: id, status: 'VERIFIED', evidence_reference: `SYNTHETIC-${index + 1}`, verified_at: '2026-08-17T10:10:00+09:00' }));
  return handoff;
}

function assign(handoff) {
  handoff.operator_assignment = { status: 'VERIFIED', operator_reference: 'SYNTHETIC-OPERATOR', authorized_channel_reference: 'SYNTHETIC-CHANNEL', assigned_at: '2026-08-17T10:15:00+09:00', acknowledged_at: '2026-08-17T10:20:00+09:00', conflict_declaration: 'NO_CONFLICT', approval_inferred: false };
  return handoff;
}

{
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: source, handoffRegister, expectedSourceHash: sourceHash });
  record('current-handoff-blocked', result.status === 'BLOCKED_EXTERNAL' && result.preflight_verified === 0, { status: result.status });
}
{
  const value = pair();
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  record('accepted-source-awaits-preflight', result.status === 'FINAL_PREFLIGHT_INCOMPLETE', { status: result.status });
}
{
  const failures = inspectFinalPreflightRegister(handoffRegister, { expectedSourceHash: sourceHash });
  record('eight-locale-sixty-four-request-handoff', failures.length === 0 && handoffRegister.handoff_packets.length === 8 && handoffRegister.handoff_packets.reduce((sum, item) => sum + item.maximum_requests, 0) === 64, { failures });
}
{
  const value = pair();
  value.handoff.handoff_packets.pop();
  value.handoff.handoff_packets[1].locale = 'ko';
  value.handoff.limits.maximum_concurrency = 3;
  const failures = inspectFinalPreflightRegister(value.handoff, { expectedSourceHash: value.hash });
  record('handoff-boundary-relaxation-rejected', ['HANDOFF_PACKET_COUNT_MISMATCH', 'DUPLICATE_PACKET_LOCALE', 'LIMIT_MISMATCH:maximum_concurrency'].every((item) => failures.includes(item)), { failures });
}
{
  const value = pair();
  assign(verify(value.handoff));
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  record('ready-for-single-review', result.status === 'READY_FOR_FINAL_HANDOFF_REVIEW', { status: result.status });
}
{
  const value = pair();
  assign(verify(value.handoff));
  value.handoff.final_review = { status: 'APPROVED', review_reference: 'SYNTHETIC-PO', reviewed_at: '2026-08-17T10:25:00+09:00', approval_inferred: false };
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  record('approval-non-dispatching-only', result.status === 'FINAL_PREFLIGHT_ACCEPTED_FOR_EXTERNAL_EXECUTION_DECISION' && !result.execution_authorized && !result.dispatch_allowed, { status: result.status });
}
{
  const value = pair();
  assign(verify(value.handoff));
  value.handoff.preflight_records[5] = { ...value.handoff.preflight_records[5], status: 'REJECTED', evidence_reference: 'SPEND-CAP-FAIL' };
  const result = evaluateFinalPreflightHandoff({ sourcePlanRegister: value.acceptedSource, handoffRegister: value.handoff, expectedSourceHash: value.hash });
  record('rejection-keeps-flag-off', result.status === 'FINAL_HANDOFF_REJECTED' && result.recommendation === 'KEEP_FEATURE_FLAG_OFF', { status: result.status });
}
{
  const value = pair();
  value.handoff.response_text = 'raw';
  value.handoff.secret_reference = 'sk-exampleSecretMaterial123456';
  value.handoff.preflight_executed = true;
  value.handoff.operator_name = 'Synthetic Name';
  const failures = inspectFinalPreflightRegister(value.handoff, { expectedSourceHash: 'a'.repeat(64) });
  record('raw-secret-drift-false-execution-identity-rejected', ['FORBIDDEN_CONTENT_KEY:response_text', 'FORBIDDEN_CONTENT_KEY:operator_name', 'SECRET_MATERIAL_DETECTED', 'SOURCE_HASH_MISMATCH', 'PREFLIGHT_EXECUTED_MUST_REMAIN_FALSE'].every((item) => failures.includes(item)), { failures });
}

const passed = scenarios.filter((item) => item.passed).length;
const current = evaluateFinalPreflightHandoff({ sourcePlanRegister: source, handoffRegister, expectedSourceHash: sourceHash });
const evidence = {
  schema_version: '1.0.0',
  phase: 62,
  generated_at: new Date().toISOString(),
  status: passed === scenarios.length && current.status === 'BLOCKED_EXTERNAL' ? 'AUTO_QA_PASS_LOCAL_FINAL_PREFLIGHT_HANDOFF_BLOCKED_EXTERNAL' : 'FAIL',
  current_handoff: current,
  summary: { scenarios: scenarios.length, passed, failed: scenarios.length - passed },
  scenarios,
  contract_sha256: crypto.createHash('sha256').update(contractBytes).digest('hex'),
  source_plan_register_sha256: sourceHash,
  handoff_register_sha256: crypto.createHash('sha256').update(handoffBytes).digest('hex'),
  official_guidance_applied: ['SEPARATE_STAGING_PRODUCTION_PROJECTS', 'SECURE_API_KEY_BOUNDARY', 'RATE_AND_SPEND_LIMITS', 'UNDER_18_SAFETY_MONITORING_ESCALATION'],
  external_actions: { api_key_accessed: false, preflight_executed: false, handoff_dispatched: false, provider_live_tested: false, feature_flag_changed: false, student_traffic: false, public_traffic: false, production_promotion: false },
  next_authorized_action: 'WAIT_FOR_ACCEPTED_PHASE61_AND_SIXTEEN_VERIFIED_PREFLIGHT_CONTROLS_AND_AUTHORIZED_OPERATOR'
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
if (evidence.status === 'FAIL') {
  console.error('PHASE62_FINAL_PREFLIGHT_HANDOFF_FAIL');
  scenarios.filter((item) => !item.passed).forEach((item) => console.error(item.id));
  process.exit(1);
}
console.log('PHASE62_FINAL_PREFLIGHT_HANDOFF_PASS');
console.log(`local_scenarios=${passed}/${scenarios.length}`);
console.log('handoff_packets=8/8');
console.log('preflight_verified=0/16');
console.log('handoff_dispatched=false');
