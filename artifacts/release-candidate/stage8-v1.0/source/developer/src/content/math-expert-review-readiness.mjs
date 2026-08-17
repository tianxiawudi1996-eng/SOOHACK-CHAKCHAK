export const EXPERT_REVIEW_REQUIREMENTS=Object.freeze({
  minimum_distinct_reviewers:2,
  criteria:Object.freeze(['FORMULA_ACCURACY','EXPLANATION_VALIDITY','ANSWER_CORRECTNESS','DIFFICULTY_ALIGNMENT'])
});

const count=value=>Math.max(0,Number.isFinite(Number(value))?Math.trunc(Number(value)):0);
const bounded=(value,maximum)=>Math.min(count(value),maximum);

export function buildMathExpertReviewReadiness(input={}){
  const targets=count(input.target_count);
  const verifiedExperts=count(input.verified_expert_count);
  const assignedTargets=bounded(input.assigned_target_count,targets);
  const dualReviewed=bounded(input.dual_reviewed_target_count,targets);
  const dualApproved=bounded(input.dual_approved_target_count,dualReviewed);
  const disagreements=bounded(input.disagreement_target_count,dualReviewed);
  const resolved=bounded(input.resolved_disagreement_count,disagreements);
  const unresolved=Math.max(0,disagreements-resolved);
  const criterionCount=count(input.criterion_count);
  const protocolLocked=['REGISTERED_LOCKED','ACTIVE','COMPLETED'].includes(input.protocol_status);
  const gates={
    protocol_locked:protocolLocked,
    criteria_complete:criterionCount===EXPERT_REVIEW_REQUIREMENTS.criteria.length,
    verified_experts_available:verifiedExperts>=EXPERT_REVIEW_REQUIREMENTS.minimum_distinct_reviewers,
    targets_registered:targets>0,
    every_target_assigned:targets>0&&assignedTargets===targets,
    every_target_dual_reviewed:targets>0&&dualReviewed===targets,
    every_target_approved:targets>0&&dualApproved===targets,
    disagreements_resolved:unresolved===0
  };
  const evidenceComplete=Object.values(gates).every(Boolean);
  return {
    requirement_id:'D80-07',
    status:evidenceComplete?'READY_FOR_PRODUCT_OWNER_EVIDENCE_REVIEW':'BLOCKED_EXTERNAL_EXPERT_REVIEW_EVIDENCE',
    protocol:{code:input.protocol_code||null,status:input.protocol_status||'NOT_REGISTERED',minimum_distinct_reviewers:2},
    counts:{
      criteria:criterionCount,
      verified_experts:verifiedExperts,
      targets,
      assigned_targets:assignedTargets,
      dual_reviewed_targets:dualReviewed,
      dual_approved_targets:dualApproved,
      disagreement_targets:disagreements,
      resolved_disagreements:resolved,
      unresolved_disagreements:unresolved
    },
    gates,
    controls:{same_hash_required:true,blind_review_required:true,conflict_declaration_required:true,independent_adjudicator_required:true,automatic_approval:false},
    claims:{professional_review_complete:false,daechi_fit_proven:false,market_score_80_confirmed:false}
  };
}
