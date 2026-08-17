import crypto from 'node:crypto';
import fs from 'node:fs';

const failures = [];
const required = [
  'developer/contracts/ai-tutor-limited-production-final-preflight-handoff-v1.json',
  'developer/src/agent/tutor-limited-production-final-preflight-handoff.mjs',
  'docs/productization/evidence/PHASE_62_LIMITED_PRODUCTION_FINAL_PREFLIGHT_HANDOFF_REGISTER.json',
  'docs/productization/evidence/PHASE_62_AI_TUTOR_FINAL_PREFLIGHT_HANDOFF_QA.json',
  'tests/unit/agent/tutor-limited-production-final-preflight-handoff.test.mjs',
  'docs/agent/productization/PHASE_62_AI_TUTOR_FINAL_PREFLIGHT_HANDOFF_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_FINAL_PREFLIGHT_HANDOFF_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_62_AI_TUTOR_FINAL_PREFLIGHT_HANDOFF_REPORT.md'
];
for (const path of required) if (!fs.existsSync(path)) failures.push(`MISSING:${path}`);

if (!failures.length) {
  const contractBytes = fs.readFileSync(required[0]);
  const contract = JSON.parse(contractBytes);
  const sourceCode = fs.readFileSync(required[1], 'utf8');
  const registerBytes = fs.readFileSync(required[2]);
  const register = JSON.parse(registerBytes);
  const evidence = JSON.parse(fs.readFileSync(required[3], 'utf8'));
  const phase61Bytes = fs.readFileSync('docs/productization/evidence/PHASE_61_LIMITED_PRODUCTION_EXPANSION_PLAN_REGISTER.json');
  if (contract.required_preflight_controls.length !== 16 || contract.inherited_limits.locales.length !== 8 || contract.inherited_limits.maximum_requests !== 64) failures.push('CONTRACT_BOUNDARY');
  if (contract.version_pins.model_reference !== 'gpt-5.6-sol' || contract.version_pins.prompt_version !== 'mathchakchak-tutor-duo-v1.0.0') failures.push('VERSION_PIN_BOUNDARY');
  if (contract.decision_policy.single_product_owner_review !== true || contract.decision_policy.automatic_execution !== false || contract.decision_policy.automatic_dispatch !== false) failures.push('DECISION_BOUNDARY');
  if (register.status !== 'BLOCKED_EXTERNAL' || register.handoff_packets.length !== 8 || register.preflight_records.length !== 16 || register.preflight_records.some((item) => item.status !== 'PENDING_EXTERNAL')) failures.push('REGISTER_BOUNDARY');
  for (const key of ['api_key_accessed', 'preflight_executed', 'handoff_dispatched', 'provider_live_tested', 'feature_flag_changed', 'student_traffic', 'public_traffic', 'production_promotion_allowed']) if (register[key] !== false) failures.push(`FALSE_CLAIM:${key}`);
  if (register.source_plan.register_sha256 !== crypto.createHash('sha256').update(phase61Bytes).digest('hex')) failures.push('SOURCE_HASH');
  for (const marker of ['READY_FOR_FINAL_HANDOFF_REVIEW', 'FINAL_PREFLIGHT_ACCEPTED_FOR_EXTERNAL_EXECUTION_DECISION', 'KEEP_FEATURE_FLAG_OFF', 'SECRET_MATERIAL_DETECTED']) if (!sourceCode.includes(marker)) failures.push(`SOURCE_MARKER:${marker}`);
  if (evidence.contract_sha256 !== crypto.createHash('sha256').update(contractBytes).digest('hex') || evidence.handoff_register_sha256 !== crypto.createHash('sha256').update(registerBytes).digest('hex') || evidence.source_plan_register_sha256 !== crypto.createHash('sha256').update(phase61Bytes).digest('hex')) failures.push('HASH_EVIDENCE');
  if (evidence.status !== 'AUTO_QA_PASS_LOCAL_FINAL_PREFLIGHT_HANDOFF_BLOCKED_EXTERNAL' || evidence.summary.passed !== 8 || evidence.current_handoff.preflight_verified !== 0) failures.push('QA_RESULT');
  if (Object.values(evidence.external_actions).some(Boolean)) failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}

if (failures.length) {
  console.error('PHASE62_FINAL_PREFLIGHT_HANDOFF_AUDIT_FAIL');
  failures.forEach((item) => console.error(item));
  process.exit(1);
}
console.log('PHASE62_FINAL_PREFLIGHT_HANDOFF_AUDIT_PASS');
console.log('handoff_packets=8');
console.log('required_preflight_controls=16');
console.log('preflight_verified=0');
console.log('handoff_dispatched=false');
