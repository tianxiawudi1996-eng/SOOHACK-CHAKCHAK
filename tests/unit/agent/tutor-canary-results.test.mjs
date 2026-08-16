import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {hashTutorStagingReadinessRegister} from '../../../developer/src/agent/tutor-canary-handoff.mjs';
import {evaluateTutorCanaryResults,hashTutorCanaryHandoffRegister,inspectTutorCanaryResultRegister} from '../../../developer/src/agent/tutor-canary-results.mjs';

const readinessBytes=fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json',import.meta.url));
const handoffBytes=fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json',import.meta.url));
const readiness=JSON.parse(readinessBytes),handoff=JSON.parse(handoffBytes);
const readinessHash=crypto.createHash('sha256').update(readinessBytes).digest('hex');
const handoffHash=crypto.createHash('sha256').update(handoffBytes).digest('hex');
const resultSource=JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json',import.meta.url),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const readySources=()=>{
  const ready=clone(readiness);
  ready.controls=ready.controls.map((control,index)=>({...control,status:'VERIFIED',evidence_reference:`REF-${index+1}`,verified_at:'2026-08-10T17:05:00+09:00'}));
  ready.authorization={status:'APPROVED',approval_reference:'PO-APPROVAL',approved_at:'2026-08-10T17:10:00+09:00',approval_inferred:false};
  const readyHash=hashTutorStagingReadinessRegister(ready);
  const canary=clone(handoff);
  canary.status='READY_FOR_CANARY_HANDOFF';
  canary.source_readiness.register_sha256=readyHash;
  canary.execution_window={status:'APPROVED',window_reference:'WINDOW-REF',starts_at:'2026-08-10T17:15:00+09:00',ends_at:'2026-08-10T17:30:00+09:00'};
  return {ready,readyHash,canary,canaryHash:hashTutorCanaryHandoffRegister(canary)};
};
const passRecords=()=>['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale,index)=>({
  attempt_reference:`ATTEMPT-${index+1}`,
  locale,
  scenario_reference:`CANARY-SAFE-HINT-${locale}`,
  started_at:`2026-08-10T17:${String(15+index).padStart(2,'0')}:00+09:00`,
  completed_at:`2026-08-10T17:${String(15+index).padStart(2,'0')}:01+09:00`,
  outcome:'PASS',
  provider_request_reference:`PROVIDER-REF-${index+1}`,
  model_reference:'gpt-5.6-sol',
  prompt_version:'mathchakchak-tutor-duo-v1.0.0',
  input_tokens:100,
  output_tokens:50,
  latency_ms:500,
  schema_valid:true,
  safety_valid:true,
  answer_leak_detected:false,
  pii_detected:false,
  role_separation_valid:true,
  locale_valid:true,
  fallback_reason:null
}));
const completedResults=()=>{
  const source=readySources();
  const results=clone(resultSource);
  results.status='RESULTS_COLLECTED';
  results.source_handoff.register_sha256=source.canaryHash;
  results.execution_observed=true;
  results.dispatch_observed=true;
  results.provider_live_tested=true;
  results.result_records=passRecords();
  results.kill_switch={status:'REARMED',evidence_reference:'KILL-SWITCH-REF',rearmed_at:'2026-08-10T17:24:00+09:00'};
  results.rollback={status:'NOT_REQUIRED',evidence_reference:'FALLBACK-VERIFY-REF',completed_at:'2026-08-10T17:24:30+09:00'};
  return {...source,results};
};

test('current Phase 52 result intake is blocked without a ready handoff or results',()=>{
  const result=evaluateTutorCanaryResults({readinessRegister:readiness,handoffRegister:handoff,resultRegister:resultSource,expectedReadinessHash:readinessHash,expectedHandoffHash:handoffHash});
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.deepEqual(result.blockers,['PHASE51_HANDOFF_BLOCKED','CANARY_RESULTS_PENDING']);
});

test('ready handoff with no results waits without inventing execution',()=>{
  const source=readySources();
  const results=clone(resultSource);
  results.source_handoff.register_sha256=source.canaryHash;
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  assert.equal(result.status,'AWAITING_RESULTS');
  assert.equal(result.records_received,0);
});

test('eight safe synthetic results become ready for one-person human review',()=>{
  const source=completedResults();
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  assert.equal(result.status,'READY_FOR_HUMAN_CANARY_REVIEW');
  assert.equal(result.passed_records,8);
  assert.equal(result.production_promotion_allowed,false);
});

test('explicit single product-owner review accepts only extended staging',()=>{
  const source=completedResults();
  source.results.human_review={status:'APPROVED',review_reference:'PO-RESULT-REVIEW',reviewed_at:'2026-08-10T17:30:00+09:00',approval_inferred:false};
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  assert.equal(result.status,'CANARY_ACCEPTED_FOR_EXTENDED_STAGING');
  assert.equal(result.recommendation,'ACCEPT_FOR_EXTENDED_STAGING');
  assert.equal(result.production_promotion_allowed,false);
});

test('one safety failure is automatically rejected and requires completed rollback evidence',()=>{
  const source=completedResults();
  source.results.result_records[3].outcome='FAIL';
  source.results.result_records[3].safety_valid=false;
  source.results.result_records[3].fallback_reason='SAFETY_REJECTED';
  const pending=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  assert.equal(pending.status,'RESULTS_INCOMPLETE');
  assert.ok(pending.blockers.includes('ROLLBACK_EVIDENCE_PENDING'));
  source.results.rollback={status:'COMPLETED',evidence_reference:'ROLLBACK-REF',completed_at:'2026-08-10T17:24:30+09:00'};
  const result=evaluateTutorCanaryResults({readinessRegister:source.ready,handoffRegister:source.canary,resultRegister:source.results,expectedReadinessHash:source.readyHash,expectedHandoffHash:source.canaryHash});
  assert.equal(result.status,'CANARY_REJECTED_AUTOMATICALLY');
  assert.equal(result.recommendation,'REJECT_AND_ROLLBACK');
});

test('duplicate locales, token overflow, and duration overflow fail result integrity',()=>{
  const source=completedResults();
  source.results.result_records[1].locale='ko';
  source.results.result_records[0].input_tokens=16001;
  source.results.result_records[7].completed_at='2026-08-10T17:31:00+09:00';
  const failures=inspectTutorCanaryResultRegister(source.results,{expectedHandoffHash:source.canaryHash});
  assert.ok(failures.includes('DUPLICATE_LOCALE_RESULT'));
  assert.ok(failures.includes('INPUT_TOKEN_BUDGET_EXCEEDED'));
  assert.ok(failures.includes('CANARY_DURATION_EXCEEDED'));
});

test('raw output, secret material, and source hash drift are rejected',()=>{
  const register=clone(resultSource);
  register.response_text='raw response';
  register.secret_reference='sk-exampleSecretMaterial123456';
  const failures=inspectTutorCanaryResultRegister(register,{expectedHandoffHash:'a'.repeat(64)});
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:response_text'));
  assert.ok(failures.includes('SECRET_MATERIAL_DETECTED'));
  assert.ok(failures.includes('SOURCE_HASH_MISMATCH'));
});
