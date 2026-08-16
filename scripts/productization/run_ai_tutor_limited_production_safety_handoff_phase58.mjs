import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  LIMITED_PRODUCTION_SAFETY_CONTROLS,
  createSyntheticAcceptedPhase57,
  evaluateLimitedProductionSafetyHandoff,
  hashLimitedProductionSafetySource,
  inspectLimitedProductionSafetyHandoffRegister
} from '../../developer/src/agent/tutor-limited-production-safety-handoff.mjs';

const sourcePath = 'docs/productization/evidence/PHASE_57_CONTROLLED_PRODUCTION_ROLLOUT_RESULT_REGISTER.json';
const handoffPath = 'docs/productization/evidence/PHASE_58_LIMITED_PRODUCTION_SAFETY_HANDOFF_REGISTER.json';
const contractPath = 'developer/contracts/ai-tutor-limited-production-safety-handoff-v1.json';
const outputPath = 'docs/productization/evidence/PHASE_58_AI_TUTOR_LIMITED_PRODUCTION_SAFETY_HANDOFF_QA.json';
const sourceBytes = fs.readFileSync(sourcePath);
const handoffBytes = fs.readFileSync(handoffPath);
const contractBytes = fs.readFileSync(contractPath);
const source = JSON.parse(sourceBytes);
const handoffRegister = JSON.parse(handoffBytes);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const scenarios = [];
const record = (id, passed, observed) => scenarios.push({id, passed, observed});

function acceptedPair() {
  const acceptedSource = createSyntheticAcceptedPhase57(source);
  const handoff = clone(handoffRegister);
  const hash = hashLimitedProductionSafetySource(acceptedSource);
  handoff.source_results.register_sha256 = hash;
  return {acceptedSource, handoff, hash};
}
function verifyControls(handoff) {
  handoff.control_records = LIMITED_PRODUCTION_SAFETY_CONTROLS.map((controlId, index) => ({control_id:controlId,status:'VERIFIED',evidence_reference:`SYNTHETIC-CONTROL-${index + 1}`,verified_at:'2026-08-13T10:10:00+09:00'}));
  return handoff;
}
function approveWindow(handoff) {
  handoff.execution_window = {status:'APPROVED',window_reference:'SYNTHETIC-WINDOW',starts_at:'2026-08-13T10:30:00+09:00',ends_at:'2026-08-13T10:45:00+09:00',approval_inferred:false};
  return handoff;
}

{
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:source,handoffRegister,expectedSourceHash:sourceHash});
  record('current-handoff-blocked', result.status === 'BLOCKED_EXTERNAL' && result.controls_verified === 0, {status:result.status, blockers:result.blockers});
}
{
  const {acceptedSource,handoff,hash} = acceptedPair();
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource,handoffRegister:handoff,expectedSourceHash:hash});
  record('accepted-source-awaits-controls', result.status === 'LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE', {status:result.status});
}
{
  const {handoff,hash} = acceptedPair();
  handoff.control_records.pop();
  handoff.control_records[1].control_id = handoff.control_records[0].control_id;
  const failures = inspectLimitedProductionSafetyHandoffRegister(handoff,{expectedSourceHash:hash});
  record('control-set-integrity', ['CONTROL_COUNT_MISMATCH','DUPLICATE_CONTROL_ID'].every((item)=>failures.includes(item)), {failures});
}
{
  const {acceptedSource,handoff,hash} = acceptedPair();
  verifyControls(handoff);
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource,handoffRegister:handoff,expectedSourceHash:hash});
  record('window-required', result.status === 'LIMITED_PRODUCTION_SAFETY_HANDOFF_INCOMPLETE' && result.controls_verified === 16, {status:result.status});
}
{
  const {acceptedSource,handoff,hash} = acceptedPair();
  approveWindow(verifyControls(handoff));
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource,handoffRegister:handoff,expectedSourceHash:hash});
  record('ready-for-single-review', result.status === 'READY_FOR_LIMITED_PRODUCTION_SAFETY_REVIEW', {status:result.status});
}
{
  const {acceptedSource,handoff,hash} = acceptedPair();
  approveWindow(verifyControls(handoff));
  handoff.review = {status:'APPROVED',review_reference:'SYNTHETIC-PO',reviewed_at:'2026-08-13T10:20:00+09:00',approval_inferred:false};
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource,handoffRegister:handoff,expectedSourceHash:hash});
  record('approval-remains-non-executing', result.status === 'LIMITED_PRODUCTION_SAFETY_HANDOFF_ACCEPTED' && !result.execution_authorized && !result.student_traffic_allowed, {status:result.status});
}
{
  const {acceptedSource,handoff,hash} = acceptedPair();
  approveWindow(verifyControls(handoff));
  handoff.control_records[5] = {...handoff.control_records[5],status:'REJECTED',evidence_reference:'SYNTHETIC-RAW-STORAGE-FAIL'};
  const result = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:acceptedSource,handoffRegister:handoff,expectedSourceHash:hash});
  record('rejected-control-keeps-flag-off', result.status === 'LIMITED_PRODUCTION_SAFETY_HANDOFF_REJECTED' && result.recommendation === 'KEEP_FEATURE_FLAG_OFF', {status:result.status});
}
{
  const handoff = clone(handoffRegister);
  handoff.response_text = 'raw';
  handoff.secret_reference = 'sk-exampleSecretMaterial123456';
  handoff.execution_performed = true;
  const failures = inspectLimitedProductionSafetyHandoffRegister(handoff,{expectedSourceHash:'a'.repeat(64)});
  record('raw-secret-drift-false-execution-rejected', ['FORBIDDEN_CONTENT_KEY:response_text','SECRET_MATERIAL_DETECTED','SOURCE_HASH_MISMATCH','EXECUTION_PERFORMED_MUST_REMAIN_FALSE'].every((item)=>failures.includes(item)), {failures});
}

const passed = scenarios.filter((item)=>item.passed).length;
const current = evaluateLimitedProductionSafetyHandoff({sourceResultRegister:source,handoffRegister,expectedSourceHash:sourceHash});
const evidence = {
  schema_version:'1.0.0',
  phase:58,
  generated_at:new Date().toISOString(),
  status:passed === scenarios.length && current.status === 'BLOCKED_EXTERNAL' ? 'AUTO_QA_PASS_LOCAL_LIMITED_PRODUCTION_SAFETY_HANDOFF_BLOCKED_EXTERNAL' : 'FAIL',
  current_handoff:current,
  summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},
  scenarios,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),
  source_result_register_sha256:sourceHash,
  handoff_register_sha256:crypto.createHash('sha256').update(handoffBytes).digest('hex'),
  external_actions:{api_key_accessed:false,execution_performed:false,dispatch_performed:false,provider_live_tested:false,feature_flag_changed:false,student_traffic:false,public_traffic:false,production_promotion:false},
  next_authorized_action:'WAIT_FOR_ACCEPTED_PHASE57_AND_SIXTEEN_VERIFIED_SAFETY_CONTROLS'
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence,null,2)}\n`);
if (evidence.status === 'FAIL') {
  console.error('PHASE58_LIMITED_PRODUCTION_SAFETY_HANDOFF_FAIL');
  scenarios.filter((item)=>!item.passed).forEach((item)=>console.error(item.id));
  process.exit(1);
}
console.log('PHASE58_LIMITED_PRODUCTION_SAFETY_HANDOFF_PASS');
console.log(`local_scenarios=${passed}/${scenarios.length}`);
console.log('controls_verified=0/16');
console.log('execution_performed=false');
console.log('student_traffic=false');
