import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMathExpertReviewReadiness} from '../../../developer/src/content/math-expert-review-readiness.mjs';

test('empty expert evidence fails closed',()=>{
  const result=buildMathExpertReviewReadiness();
  assert.equal(result.status,'BLOCKED_EXTERNAL_EXPERT_REVIEW_EVIDENCE');
  assert.equal(result.counts.verified_experts,0);
  assert.equal(result.claims.professional_review_complete,false);
});

test('criteria-only draft does not count as expert review',()=>{
  const result=buildMathExpertReviewReadiness({protocol_status:'DRAFT_EXTERNAL_REVIEW',criterion_count:4});
  assert.equal(result.gates.criteria_complete,true);
  assert.equal(result.gates.protocol_locked,false);
  assert.equal(result.gates.verified_experts_available,false);
});

test('one expert cannot satisfy independent dual review',()=>{
  const result=buildMathExpertReviewReadiness({protocol_status:'ACTIVE',criterion_count:4,verified_expert_count:1,target_count:1,assigned_target_count:1,dual_reviewed_target_count:1,dual_approved_target_count:1});
  assert.equal(result.gates.verified_experts_available,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_EXPERT_REVIEW_EVIDENCE');
});

test('reported progress is bounded by registered targets',()=>{
  const result=buildMathExpertReviewReadiness({target_count:3,assigned_target_count:9,dual_reviewed_target_count:8,dual_approved_target_count:7,disagreement_target_count:6,resolved_disagreement_count:5});
  assert.equal(result.counts.assigned_targets,3);
  assert.equal(result.counts.dual_reviewed_targets,3);
  assert.equal(result.counts.dual_approved_targets,3);
  assert.equal(result.counts.disagreement_targets,3);
  assert.equal(result.counts.resolved_disagreements,3);
});

test('unresolved disagreement blocks otherwise complete review',()=>{
  const result=buildMathExpertReviewReadiness({protocol_status:'COMPLETED',criterion_count:4,verified_expert_count:2,target_count:2,assigned_target_count:2,dual_reviewed_target_count:2,dual_approved_target_count:2,disagreement_target_count:1,resolved_disagreement_count:0});
  assert.equal(result.gates.disagreements_resolved,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_EXPERT_REVIEW_EVIDENCE');
});

test('complete external evidence reaches product review without auto-claiming completion',()=>{
  const result=buildMathExpertReviewReadiness({protocol_status:'COMPLETED',criterion_count:4,verified_expert_count:2,target_count:2,assigned_target_count:2,dual_reviewed_target_count:2,dual_approved_target_count:2,disagreement_target_count:1,resolved_disagreement_count:1});
  assert.equal(result.status,'READY_FOR_PRODUCT_OWNER_EVIDENCE_REVIEW');
  assert.equal(result.claims.professional_review_complete,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});
