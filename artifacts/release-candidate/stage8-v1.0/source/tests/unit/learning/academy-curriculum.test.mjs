import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAcademyCurriculumJourney,buildAcademyCurriculumReadiness} from '../../../developer/src/learning/academy-curriculum.mjs';

const complete={grades:12,tracks:4,plans:48,complete_plans:48,formulas:72,assignments:288,recall_items:72,application_items:216,source_aligned_explanations:72,expert_reviewed_plans:0,licensed_plans:0};

test('complete local track coverage remains blocked by expert and license evidence',()=>{
  const result=buildAcademyCurriculumReadiness(complete);
  assert.equal(result.local_coverage_complete,true);
  assert.equal(result.production_ready,false);
  assert.deepEqual(result.blockers,['MATH_EXPERT_REVIEW_PENDING','LICENSED_CONTENT_GATE_BLOCKED']);
});

test('all external evidence can advance only to product review',()=>{
  const result=buildAcademyCurriculumReadiness({...complete,expert_reviewed_plans:48,licensed_plans:48});
  assert.equal(result.status,'READY_FOR_PRODUCT_REVIEW');
  assert.equal(result.production_ready,true);
});

test('over-reported coverage is rejected',()=>{
  assert.throws(()=>buildAcademyCurriculumReadiness({...complete,plans:49}),/COUNT_EXCEEDS_EXPECTED/);
});

test('student journey uses evidence-gated fallback and excludes answers',()=>{
  const formulas=Array.from({length:6},(_,index)=>({id:`f${index}`,sequence_no:index+1,semantic_key:`s${index}`,title:`t${index}`,notation:'a+b',explanation:'relation',assignment_purpose:'FOUNDATION',required_recall_attempts:1,required_application_items:1,recall_available:true,application_item_count:3}));
  const result=buildAcademyCurriculumJourney({readiness:{student_id:'student',eligible_for_requested_track:false,blockers:['RECALL_BELOW_GATE'],metrics:{}},requestedTrack:'ADVANCED_REASONING',effectiveTrack:'CONCEPT_RECOVERY',gradeCode:'E4',plan:{id:'p',curriculum_version:1,sessions_per_week:4,concept_percent:60,standard_percent:30,advanced_percent:10,objective_codes:['REBUILD'],expert_review_status:'PENDING',license_gate_status:'BLOCKED_EXTERNAL'},formulas});
  assert.equal(result.access_mode,'EVIDENCE_GATED_FALLBACK');
  assert.equal(result.formulas.length,6);
  assert.equal(result.privacy.answer_schemas_included,false);
  assert.equal(JSON.stringify(result).includes('accepted_values'),false);
});
