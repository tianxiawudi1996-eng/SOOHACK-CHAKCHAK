import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSolutionRecognition} from '../../../developer/src/learning/solution-recognition.mjs';

test('manual text remains student-confirmed before scoring',()=>{
  const result=evaluateSolutionRecognition({source_type:'MANUAL_TEXT',candidates:[{expression:'1/2 + 1/3 = 5/6',confidence:1}],math_consistency:1,step_continuity:1});
  assert.equal(result.decision,'STUDENT_CONFIRMATION_REQUIRED');
  assert.equal(result.safety.automatic_scoring_allowed,false);
  assert.equal(result.top_candidate_preview,'1/2 + 1/3 = 5/6');
});

test('image recognition fails closed when provider is not verified',()=>{
  const result=evaluateSolutionRecognition({source_type:'HANDWRITING_IMAGE',provider_verified:false,candidates:[{expression:'x=3',confidence:.99}],image_quality:.99,math_consistency:1,step_continuity:1});
  assert.equal(result.decision,'MANUAL_ENTRY_REQUIRED');
  assert.ok(result.reason_codes.includes('OCR_PROVIDER_NOT_VERIFIED'));
});

test('low image quality routes to manual entry',()=>{
  const result=evaluateSolutionRecognition({source_type:'CAMERA_IMAGE',provider_verified:true,candidates:[{expression:'12+3=15',confidence:.9}],image_quality:.4,math_consistency:1,step_continuity:1});
  assert.equal(result.decision,'MANUAL_ENTRY_REQUIRED');
  assert.equal(result.next_action,'OPEN_MANUAL_ENTRY');
});

test('mathematical inconsistency routes to teacher review',()=>{
  const result=evaluateSolutionRecognition({source_type:'HANDWRITING_IMAGE',provider_verified:true,candidates:[{expression:'2+2=5',confidence:.98}],image_quality:.95,math_consistency:.2,step_continuity:.9});
  assert.equal(result.decision,'TEACHER_REVIEW_REQUIRED');
  assert.ok(result.reason_codes.includes('MATH_CONSISTENCY_LOW'));
});

test('unsafe expression is rejected',()=>{
  const result=evaluateSolutionRecognition({source_type:'MANUAL_TEXT',candidates:[{expression:'<script>alert(1)</script>',confidence:1}],math_consistency:1,step_continuity:1});
  assert.equal(result.decision,'REJECTED');
  assert.equal(result.valid_candidate_count,0);
});

test('ambiguous candidates require confirmation and are hash-minimized',()=>{
  const result=evaluateSolutionRecognition({source_type:'HANDWRITING_IMAGE',provider_verified:true,candidates:[{expression:'7x=21',confidence:.9},{expression:'7x=27',confidence:.86}],image_quality:.9,math_consistency:.9,step_continuity:.9});
  assert.equal(result.decision,'STUDENT_CONFIRMATION_REQUIRED');
  assert.equal(result.candidate_hashes.length,2);
  assert.match(result.candidate_hashes[0],/^[0-9a-f]{64}$/);
  assert.equal(result.safety.raw_candidates_persisted,false);
});

test('invalid source type is rejected by contract',()=>{
  assert.throws(()=>evaluateSolutionRecognition({source_type:'MAGIC_OCR'}),/INVALID_SOLUTION_SOURCE_TYPE/);
});
