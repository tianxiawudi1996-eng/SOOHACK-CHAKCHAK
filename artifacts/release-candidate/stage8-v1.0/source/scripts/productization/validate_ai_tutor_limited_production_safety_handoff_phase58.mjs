import crypto from 'node:crypto';
import fs from 'node:fs';

const failures = [];
const required = [
  'developer/contracts/ai-tutor-limited-production-safety-handoff-v1.json',
  'developer/src/agent/tutor-limited-production-safety-handoff.mjs',
  'docs/productization/evidence/PHASE_58_LIMITED_PRODUCTION_SAFETY_HANDOFF_REGISTER.json',
  'docs/productization/evidence/PHASE_58_AI_TUTOR_LIMITED_PRODUCTION_SAFETY_HANDOFF_QA.json',
  'tests/unit/agent/tutor-limited-production-safety-handoff.test.mjs',
  'docs/agent/productization/PHASE_58_AI_TUTOR_LIMITED_PRODUCTION_SAFETY_HANDOFF_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_LIMITED_PRODUCTION_SAFETY_HANDOFF_RUNBOOK_v1.0.md',
  'docs/productization/reports/PHASE_58_AI_TUTOR_LIMITED_PRODUCTION_SAFETY_HANDOFF_REPORT.md'
];
for (const path of required) if (!fs.existsSync(path)) failures.push(`MISSING:${path}`);
if (!failures.length) {
  const contractBytes = fs.readFileSync(required[0]);
  const contract = JSON.parse(contractBytes);
  const sourceCode = fs.readFileSync(required[1],'utf8');
  const registerBytes = fs.readFileSync(required[2]);
  const register = JSON.parse(registerBytes);
  const evidence = JSON.parse(fs.readFileSync(required[3],'utf8'));
  const phase57Bytes = fs.readFileSync('docs/productization/evidence/PHASE_57_CONTROLLED_PRODUCTION_ROLLOUT_RESULT_REGISTER.json');
  if (contract.required_controls.length !== 16 || contract.audience !== 'APPROVED_INTERNAL_ADULT_STAFF_ONLY') failures.push('CONTRACT_BOUNDARY');
  if (contract.mathchakchak_local_policy.maximum_requests !== 8 || contract.mathchakchak_local_policy.reference_metadata_retention_days !== 30 || contract.mathchakchak_local_policy.raw_content_retention_days !== 0) failures.push('LOCAL_POLICY_BOUNDARY');
  if (contract.decision_policy.single_product_owner_review !== true || contract.decision_policy.automatic_execution !== false || contract.decision_policy.automatic_student_traffic !== false || contract.decision_policy.automatic_public_traffic !== false) failures.push('DECISION_BOUNDARY');
  if (register.status !== 'BLOCKED_EXTERNAL' || register.control_records.length !== 16 || register.control_records.some((item)=>item.status !== 'PENDING_EXTERNAL')) failures.push('REGISTER_BOUNDARY');
  for (const key of ['api_key_accessed','execution_performed','dispatch_performed','provider_live_tested','feature_flag_changed','student_traffic','public_traffic','production_promotion_allowed']) if (register[key] !== false) failures.push(`FALSE_CLAIM:${key}`);
  if (register.source_results.register_sha256 !== crypto.createHash('sha256').update(phase57Bytes).digest('hex')) failures.push('SOURCE_HASH');
  for (const marker of ['READY_FOR_LIMITED_PRODUCTION_SAFETY_REVIEW','LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED','KEEP_FEATURE_FLAG_OFF','SECRET_MATERIAL_DETECTED']) if (!sourceCode.includes(marker)) failures.push(`SOURCE_MARKER:${marker}`);
  if (evidence.contract_sha256 !== crypto.createHash('sha256').update(contractBytes).digest('hex') || evidence.handoff_register_sha256 !== crypto.createHash('sha256').update(registerBytes).digest('hex') || evidence.source_result_register_sha256 !== crypto.createHash('sha256').update(phase57Bytes).digest('hex')) failures.push('HASH_EVIDENCE');
  if (evidence.status !== 'AUTO_QA_PASS_LOCAL_LIMITED_PRODUCTION_SAFETY_HANDOFF_BLOCKED_EXTERNAL' || evidence.summary.passed !== 8 || evidence.current_handoff.controls_verified !== 0) failures.push('QA_RESULT');
  if (Object.values(evidence.external_actions).some(Boolean)) failures.push('UNAUTHORIZED_EXTERNAL_ACTION');
}
if (failures.length) {
  console.error('PHASE58_LIMITED_PRODUCTION_SAFETY_HANDOFF_AUDIT_FAIL');
  failures.forEach((item)=>console.error(item));
  process.exit(1);
}
console.log('PHASE58_LIMITED_PRODUCTION_SAFETY_HANDOFF_AUDIT_PASS');
console.log('required_controls=16');
console.log('controls_verified=0');
console.log('execution_performed=false');
console.log('student_traffic=false');
