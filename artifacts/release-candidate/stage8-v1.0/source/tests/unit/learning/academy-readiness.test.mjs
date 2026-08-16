import test from 'node:test';
import assert from 'node:assert/strict';
import {ACADEMY_TRACKS,buildAcademyReadiness,normalizeAcademyTrack} from '../../../developer/src/learning/academy-readiness.mjs';

const quality=(overrides={})=>({
  primary:{durable_recall_rate:0.82,application_mastery_rate:0.81,learning_completion_rate:0.9},
  drivers:{independent_response_rate:0.8},data_sufficient:true,...overrides
});

test('academy track contract is ordered from recovery to contest bridge',()=>{
  assert.deepEqual(ACADEMY_TRACKS,['CONCEPT_RECOVERY','SCHOOL_EXAM','ADVANCED_REASONING','CONTEST_BRIDGE']);
  assert.equal(normalizeAcademyTrack('advanced_reasoning'),'ADVANCED_REASONING');
  assert.equal(normalizeAcademyTrack('unknown'),null);
});

test('insufficient evidence fails closed into concept recovery',()=>{
  const result=buildAcademyReadiness({progress:{answered:2,accuracy:1,dataSufficient:false},quality:quality({data_sufficient:false}),targetTrack:'CONTEST_BRIDGE'});
  assert.equal(result.recommended_track,'CONCEPT_RECOVERY');
  assert.equal(result.eligible_for_requested_track,false);
  assert.ok(result.blockers.includes('INSUFFICIENT_BASELINE'));
});

test('strong evidence can reach contest bridge without bypassing gates',()=>{
  const result=buildAcademyReadiness({progress:{answered:60,accuracy:0.94,dataSufficient:true},quality:quality(),targetTrack:'CONTEST_BRIDGE'});
  assert.equal(result.recommended_track,'CONTEST_BRIDGE');
  assert.equal(result.eligible_for_requested_track,true);
  assert.equal(result.weekly_plan.problem_mix.advanced,70);
});

test('high accuracy alone cannot bypass recall and application evidence',()=>{
  const result=buildAcademyReadiness({progress:{answered:60,accuracy:0.98,dataSufficient:true},quality:quality({primary:{durable_recall_rate:0.4,application_mastery_rate:0.3,learning_completion_rate:1}}),targetTrack:'ADVANCED_REASONING'});
  assert.equal(result.eligible_for_requested_track,false);
  assert.ok(result.blockers.includes('RECALL_BELOW_GATE'));
  assert.ok(result.blockers.includes('APPLICATION_BELOW_GATE'));
});

test('readiness output excludes raw answers and score improvement claims',()=>{
  const result=buildAcademyReadiness({progress:{answered:30,accuracy:0.82,dataSufficient:true},quality:quality(),targetTrack:'ADVANCED_REASONING'});
  assert.equal(result.privacy.raw_answers_included,false);
  assert.equal(result.commercial_claim_boundary.score_improvement_claimed,false);
  assert.equal(JSON.stringify(result).includes('expected_answer'),false);
});

test('invalid track is rejected',()=>{
  assert.throws(()=>buildAcademyReadiness({targetTrack:'SUPER_ELITE'}),/INVALID_ACADEMY_TRACK/);
});
