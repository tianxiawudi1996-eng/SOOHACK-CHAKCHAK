import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPilotReadiness,PILOT_METRICS,PILOT_REQUIREMENTS} from '../../../developer/src/analytics/learning-effect-pilot.mjs';

test('empty pilot evidence fails closed without an effect claim',()=>{
  const result=buildPilotReadiness();
  assert.equal(result.status,'BLOCKED_EXTERNAL_PILOT_EVIDENCE');
  assert.equal(result.protocol.minimum_participants,100);
  assert.deepEqual(result.protocol.duration_range_weeks,[8,12]);
  assert.equal(result.counts.enrolled_participants,0);
  assert.equal(result.claims.learning_effect_proven,false);
});

test('draft protocol and metric definitions do not count as field evidence',()=>{
  const result=buildPilotReadiness({
    protocol_code:'MCC-D80-06-PILOT-001',protocol_status:'DRAFT_EXTERNAL_REVIEW',duration_weeks:8,
    cohort_count:2,primary_metric_count:2,driver_metric_count:2,guardrail_metric_count:4
  });
  assert.equal(result.gates.metrics_preregistered,true);
  assert.equal(result.gates.protocol_locked,false);
  assert.equal(result.gates.minimum_sample_reached,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_PILOT_EVIDENCE');
});

test('reported measurement and consent counts are bounded by enrollment',()=>{
  const result=buildPilotReadiness({enrolled_participants:3,consented_participants:9,pre_measurements:8,post_measurements:7,retention_measurements:6,withdrawn_participants:5});
  assert.equal(result.counts.consented_participants,3);
  assert.equal(result.counts.pre_measurements,3);
  assert.equal(result.counts.post_measurements,3);
  assert.equal(result.counts.retention_measurements,3);
  assert.equal(result.counts.withdrawn_participants,3);
});

test('complete measurements become ready for independent analysis but never prove effect',()=>{
  const result=buildPilotReadiness({
    protocol_code:'MCC-D80-06-PILOT-001',protocol_status:'COMPLETED',duration_weeks:10,
    cohort_count:PILOT_REQUIREMENTS.cohorts.length,
    primary_metric_count:PILOT_METRICS.primary.length,driver_metric_count:PILOT_METRICS.drivers.length,guardrail_metric_count:PILOT_METRICS.guardrails.length,
    enrolled_participants:100,consented_participants:100,pre_measurements:100,post_measurements:100,retention_measurements:100,completed_participants:100
  });
  assert.equal(result.status,'READY_FOR_INDEPENDENT_ANALYSIS');
  assert.equal(result.claims.learning_effect_proven,false);
});

test('independently verified result completes evidence intake without auto-approving product claims',()=>{
  const result=buildPilotReadiness({
    protocol_status:'COMPLETED',duration_weeks:12,cohort_count:2,
    primary_metric_count:2,driver_metric_count:2,guardrail_metric_count:4,
    enrolled_participants:100,consented_participants:100,pre_measurements:100,post_measurements:96,retention_measurements:96,withdrawn_participants:4,
    completed_participants:96,verified_analysis_count:1,independent_analysis_reference:'ANALYSIS-REF-001'
  });
  assert.equal(result.status,'EXTERNAL_PILOT_EVIDENCE_COMPLETE');
  assert.equal(result.claims.learning_effect_proven,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('duration outside 8 to 12 weeks remains blocked',()=>{
  for(const duration_weeks of [7,13]){
    const result=buildPilotReadiness({protocol_status:'COMPLETED',duration_weeks,cohort_count:2,primary_metric_count:2,driver_metric_count:2,guardrail_metric_count:4,enrolled_participants:100,consented_participants:100,pre_measurements:100,post_measurements:100,retention_measurements:100});
    assert.equal(result.gates.duration_valid,false);
    assert.equal(result.status,'BLOCKED_EXTERNAL_PILOT_EVIDENCE');
  }
});
