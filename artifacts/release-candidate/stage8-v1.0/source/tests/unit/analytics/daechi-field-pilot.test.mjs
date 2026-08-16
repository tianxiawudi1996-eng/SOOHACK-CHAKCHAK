import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDaechiFieldPilotReadiness,
  FIELD_PILOT_METRICS,
  FIELD_PILOT_REQUIREMENTS
} from '../../../developer/src/analytics/daechi-field-pilot.mjs';

const completeInput=()=>({
  protocol_code:'MCC-D80-09-FIELD-001',protocol_status:'COMPLETED',planned_weeks:4,
  metric_count:FIELD_PILOT_METRICS.length,academy_count:2,agreement_count:2,
  privacy_acceptance_count:2,completed_academy_count:2,observed_week_count:4,
  enrolled_student_count:40,consented_student_count:40,teacher_operator_count:4,
  parent_respondent_count:30,open_blocking_issue_count:0,verified_result_count:1,
  independent_result_reference:'FIELD-RESULT-REF-001',product_approval_count:0
});

test('empty field evidence fails closed without a Daechi claim',()=>{
  const result=buildDaechiFieldPilotReadiness();
  assert.equal(result.requirement_id,'D80-09');
  assert.equal(result.status,'BLOCKED_EXTERNAL_FIELD_EVIDENCE');
  assert.deepEqual(result.protocol.academy_range,[2,3]);
  assert.equal(result.counts.academies,0);
  assert.equal(result.claims.daechi_fit_proven,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('one or four academies cannot satisfy the field gate',()=>{
  for(const academy_count of [1,4]){
    const input=completeInput();
    input.academy_count=academy_count;
    input.agreement_count=academy_count;
    input.privacy_acceptance_count=academy_count;
    input.completed_academy_count=academy_count;
    const result=buildDaechiFieldPilotReadiness(input);
    assert.equal(result.gates.academy_count_valid,false);
    assert.equal(result.status,'BLOCKED_EXTERNAL_FIELD_EVIDENCE');
  }
});

test('agreement consent and completion counts are bounded by their parent totals',()=>{
  const result=buildDaechiFieldPilotReadiness({academy_count:2,agreement_count:9,privacy_acceptance_count:8,completed_academy_count:7,enrolled_student_count:3,consented_student_count:11});
  assert.equal(result.counts.agreements,2);
  assert.equal(result.counts.privacy_acceptances,2);
  assert.equal(result.counts.completed_academies,2);
  assert.equal(result.counts.consented_students,3);
});

test('complete aggregate evidence reaches product review without market approval',()=>{
  const result=buildDaechiFieldPilotReadiness(completeInput());
  assert.equal(result.gates.required_metrics_complete,true);
  assert.equal(result.status,'READY_FOR_PRODUCT_REVIEW');
  assert.equal(result.claims.daechi_fit_proven,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('an unresolved high or critical issue blocks otherwise complete evidence',()=>{
  const input=completeInput();
  input.open_blocking_issue_count=1;
  const result=buildDaechiFieldPilotReadiness(input);
  assert.equal(result.gates.no_open_blocking_issue,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_FIELD_EVIDENCE');
});

test('explicit product approval accepts evidence intake but never proves market fit automatically',()=>{
  const input=completeInput();
  input.product_approval_count=1;
  input.product_approval_reference='FIELD-PRODUCT-APPROVAL-001';
  const result=buildDaechiFieldPilotReadiness(input);
  assert.equal(result.status,'EXTERNAL_FIELD_EVIDENCE_ACCEPTED');
  assert.equal(result.claims.daechi_fit_proven,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('planned weeks outside the registered boundary remain blocked',()=>{
  for(const planned_weeks of [0,13]){
    const input=completeInput();
    input.planned_weeks=planned_weeks;
    const result=buildDaechiFieldPilotReadiness(input);
    assert.equal(result.gates.planned_weeks_valid,false);
    assert.equal(result.status,'BLOCKED_EXTERNAL_FIELD_EVIDENCE');
  }
  assert.equal(FIELD_PILOT_REQUIREMENTS.minimum_academies,2);
  assert.equal(FIELD_PILOT_REQUIREMENTS.maximum_academies,3);
});
