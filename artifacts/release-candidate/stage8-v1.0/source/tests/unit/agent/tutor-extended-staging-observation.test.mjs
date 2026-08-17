import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTutorExtendedStagingDryRunPlan,evaluateTutorExtendedStagingReadiness,hashTutorCanaryResultRegister,inspectTutorExtendedStagingRegister} from '../../../developer/src/agent/tutor-extended-staging-observation.mjs';

const sourceBytes=fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_52_CANARY_RESULT_REGISTER.json',import.meta.url));
const source=JSON.parse(sourceBytes),sourceHash=crypto.createHash('sha256').update(sourceBytes).digest('hex');
const observation=JSON.parse(fs.readFileSync(new URL('../../../docs/productization/evidence/PHASE_53_EXTENDED_STAGING_OBSERVATION_REGISTER.json',import.meta.url),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const acceptedSource=()=>{
  const candidate=clone(source);
  candidate.status='CANARY_ACCEPTED_FOR_EXTENDED_STAGING';candidate.execution_observed=true;candidate.dispatch_observed=true;candidate.provider_live_tested=true;
  candidate.result_records=['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale)=>({locale}));
  candidate.kill_switch={status:'REARMED',evidence_reference:'KILL-SWITCH-REF',rearmed_at:'2026-08-10T17:50:00+09:00'};
  candidate.human_review={status:'APPROVED',review_reference:'PO-CANARY-REVIEW',reviewed_at:'2026-08-10T17:55:00+09:00',approval_inferred:false};
  return candidate;
};
const readyObservation=(accepted)=>{
  const candidate=clone(observation);candidate.source_canary_results.register_sha256=hashTutorCanaryResultRegister(accepted);
  candidate.status='READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF';
  candidate.observation_window={status:'APPROVED',window_reference:'WINDOW-REF',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:00+09:00'};
  candidate.authorization={status:'APPROVED',approval_reference:'PO-OBSERVATION-APPROVAL',approved_at:'2026-08-10T18:00:00+09:00',approval_inferred:false};
  return candidate;
};

test('current Phase 53 is blocked by source, window, and product-owner authorization',()=>{
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:source,observationRegister:observation,expectedSourceHash:sourceHash});
  assert.equal(result.status,'BLOCKED_EXTERNAL');
  assert.deepEqual(result.blockers,['PHASE52_CANARY_RESULTS_NOT_ACCEPTED','OBSERVATION_WINDOW_PENDING','PRODUCT_OWNER_AUTHORIZATION_PENDING']);
});

test('accepted canary alone still requires an approved observation window and authorization',()=>{
  const accepted=acceptedSource(),candidate=clone(observation);candidate.source_canary_results.register_sha256=hashTutorCanaryResultRegister(accepted);
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hashTutorCanaryResultRegister(accepted)});
  assert.equal(result.status,'BLOCKED_EXTERNAL');assert.deepEqual(result.blockers,['OBSERVATION_WINDOW_PENDING','PRODUCT_OWNER_AUTHORIZATION_PENDING']);
});

test('approved window without product-owner authorization remains blocked',()=>{
  const accepted=acceptedSource(),candidate=clone(observation);candidate.source_canary_results.register_sha256=hashTutorCanaryResultRegister(accepted);
  candidate.observation_window={status:'APPROVED',window_reference:'WINDOW-REF',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:00+09:00'};
  const result=evaluateTutorExtendedStagingReadiness({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hashTutorCanaryResultRegister(accepted)});
  assert.equal(result.status,'BLOCKED_EXTERNAL');assert.deepEqual(result.blockers,['PRODUCT_OWNER_AUTHORIZATION_PENDING']);
});

test('complete synthetic prerequisites produce an 80-item dry-run plan without dispatch',()=>{
  const accepted=acceptedSource(),candidate=readyObservation(accepted),hash=hashTutorCanaryResultRegister(accepted);
  const readiness=evaluateTutorExtendedStagingReadiness({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hash});
  const dryRun=buildTutorExtendedStagingDryRunPlan({sourceResultRegister:accepted,observationRegister:candidate,expectedSourceHash:hash});
  assert.equal(readiness.status,'READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF');assert.equal(readiness.execution_authorized,false);
  assert.equal(dryRun.items.length,80);assert.equal(dryRun.dispatch_performed,false);assert.ok(dryRun.items.every((item)=>item.dispatch===false));
});

test('sample, concurrency, duration, or threshold relaxation is rejected',()=>{
  const candidate=clone(observation);candidate.plan.min_samples_per_locale=1;candidate.plan.concurrency=4;candidate.plan.duration_hours=48;candidate.thresholds.safety_violation_count_max=1;
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:sourceHash});
  assert.ok(failures.includes('OBSERVATION_PLAN_CHANGED'));assert.ok(failures.includes('PROJECT_THRESHOLDS_CHANGED'));
});

test('production traffic, student traffic, raw content, and secret material are rejected',()=>{
  const candidate=clone(observation);candidate.production_traffic=true;candidate.student_traffic=true;candidate.response_text='raw output';candidate.secret_reference='sk-exampleSecretMaterial123456';
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:sourceHash});
  assert.ok(failures.includes('PRODUCTION_TRAFFIC_MUST_REMAIN_FALSE'));assert.ok(failures.includes('STUDENT_TRAFFIC_MUST_REMAIN_FALSE'));
  assert.ok(failures.includes('FORBIDDEN_CONTENT_KEY:response_text'));assert.ok(failures.includes('SECRET_MATERIAL_DETECTED'));
});

test('source hash drift and observation windows over 24 hours are rejected',()=>{
  const candidate=clone(observation);candidate.observation_window={status:'APPROVED',window_reference:'WINDOW-REF',starts_at:'2026-08-11T09:00:00+09:00',ends_at:'2026-08-12T09:00:01+09:00'};
  const failures=inspectTutorExtendedStagingRegister(candidate,{expectedSourceHash:'a'.repeat(64)});
  assert.ok(failures.includes('SOURCE_HASH_MISMATCH'));assert.ok(failures.includes('OBSERVATION_WINDOW_TOO_LONG'));
});
