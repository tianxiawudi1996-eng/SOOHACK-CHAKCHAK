import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLearningQualitySnapshot} from '../../../developer/src/analytics/learning-quality.mjs';

test('learning quality snapshot calculates actionable KPIs without identifiers',()=>{
  const snapshot=buildLearningQualitySnapshot({
    formula_sessions_started:5,formula_sessions_completed:4,formulas_assessed:4,formulas_mastered:3,
    recall_attempts:8,recall_correct:6,formula_responses:10,hinted_responses:3,
    collaboration_phases:10,collaboration_passes:8
  });
  assert.deepEqual(snapshot.primary,{learning_completion_rate:0.8,application_mastery_rate:0.75,durable_recall_rate:0.75});
  assert.deepEqual(snapshot.drivers,{independent_response_rate:0.7,collaboration_pass_rate:0.8});
  assert.equal(snapshot.data_sufficient,true);
  assert.equal(snapshot.target_status,'PROVISIONAL_NO_FIELD_BASELINE');
  assert.equal(JSON.stringify(snapshot).includes('student_id'),false);
});

test('learning quality snapshot returns null rates for absent evidence',()=>{
  const snapshot=buildLearningQualitySnapshot();
  assert.equal(snapshot.primary.learning_completion_rate,null);
  assert.equal(snapshot.primary.application_mastery_rate,null);
  assert.equal(snapshot.primary.durable_recall_rate,null);
  assert.equal(snapshot.data_sufficient,false);
});
