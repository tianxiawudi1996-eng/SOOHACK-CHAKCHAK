import {ACADEMY_TRACKS} from './academy-readiness.mjs';

export const ACADEMY_CURRICULUM_EXPECTED=Object.freeze({
  grades:12,tracks:4,plans:48,formulas:72,assignments:288,recall_items:72,application_items:216,source_aligned_explanations:72
});

const integer=(value)=>Math.max(0,Math.trunc(Number(value)||0));

export function buildAcademyCurriculumReadiness(metrics={}){
  const counts={
    grades:integer(metrics.grades),tracks:integer(metrics.tracks),plans:integer(metrics.plans),
    formulas:integer(metrics.formulas),assignments:integer(metrics.assignments),
    recall_items:integer(metrics.recall_items),application_items:integer(metrics.application_items),
    source_aligned_explanations:integer(metrics.source_aligned_explanations),
    complete_plans:integer(metrics.complete_plans),expert_reviewed_plans:integer(metrics.expert_reviewed_plans),
    licensed_plans:integer(metrics.licensed_plans)
  };
  for(const key of Object.keys(ACADEMY_CURRICULUM_EXPECTED)){
    if(counts[key]>ACADEMY_CURRICULUM_EXPECTED[key])throw new RangeError(`ACADEMY_CURRICULUM_COUNT_EXCEEDS_EXPECTED:${key}`);
  }
  const localCoverageComplete=counts.grades===12&&counts.tracks===4&&counts.plans===48&&counts.complete_plans===48&&
    counts.formulas===72&&counts.assignments===288&&counts.recall_items===72&&counts.application_items===216&&
    counts.source_aligned_explanations===72;
  const externalEvidenceComplete=counts.expert_reviewed_plans===48&&counts.licensed_plans===48;
  return {
    schema_version:'1.0.0',requirement_id:'D80-04',status:localCoverageComplete?(externalEvidenceComplete?'READY_FOR_PRODUCT_REVIEW':'LOCAL_CURRICULUM_COMPLETE_EXPERT_REVIEW_BLOCKED'):'LOCAL_CURRICULUM_INCOMPLETE',
    local_coverage_complete:localCoverageComplete,production_ready:localCoverageComplete&&externalEvidenceComplete,
    counts,expected:ACADEMY_CURRICULUM_EXPECTED,
    blockers:[...(counts.expert_reviewed_plans<48?['MATH_EXPERT_REVIEW_PENDING']:[]),...(counts.licensed_plans<48?['LICENSED_CONTENT_GATE_BLOCKED']:[])],
    truth_boundary:{professional_content_claimed:false,daechi_fit_claimed:false,learning_effect_claimed:false}
  };
}

export function buildAcademyCurriculumJourney({readiness,requestedTrack,effectiveTrack,gradeCode,plan,formulas=[]}={}){
  if(!ACADEMY_TRACKS.includes(requestedTrack)||!ACADEMY_TRACKS.includes(effectiveTrack))throw new TypeError('INVALID_ACADEMY_TRACK');
  if(!/^E[1-6]$|^M[1-3]$|^H[1-3]$/.test(String(gradeCode)))throw new TypeError('INVALID_GRADE_CODE');
  if(!plan||formulas.length!==6)throw new RangeError('INCOMPLETE_ACADEMY_CURRICULUM_PLAN');
  const safeFormulas=formulas.map((formula)=>({
    id:formula.id,sequence_no:Number(formula.sequence_no),semantic_key:formula.semantic_key,title:formula.title,
    notation:formula.notation,explanation:formula.explanation,assignment_purpose:formula.assignment_purpose,
    required_recall_attempts:Number(formula.required_recall_attempts),required_application_items:Number(formula.required_application_items),
    recall_available:Boolean(formula.recall_available),application_item_count:Number(formula.application_item_count),
    next_steps:{collaboration:`/api/v1/curriculum/collaboration-plans`,recall:`/api/v1/curriculum/formulas/${formula.id}/recall-check`,application:`/api/v1/curriculum/formulas/${formula.id}/application-checks`}
  }));
  return {
    schema_version:'1.0.0',student_id:readiness.student_id,grade_code:gradeCode,
    requested_track:requestedTrack,effective_track:effectiveTrack,
    access_mode:requestedTrack===effectiveTrack&&readiness.eligible_for_requested_track?'REQUESTED_TRACK':'EVIDENCE_GATED_FALLBACK',
    readiness:{eligible_for_requested_track:readiness.eligible_for_requested_track,blockers:readiness.blockers,metrics:readiness.metrics},
    plan:{id:plan.id,version:Number(plan.curriculum_version),sessions_per_week:Number(plan.sessions_per_week),
      problem_mix:{concept:Number(plan.concept_percent),standard:Number(plan.standard_percent),advanced:Number(plan.advanced_percent)},objective_codes:plan.objective_codes},
    formulas:safeFormulas,
    journey:['COLLABORATION_5_PHASES','FORMULA_RECALL','APPLICATION_3_LEVELS','SPACED_REVIEW'],
    character_roles:{CHAKCHAKI:'REASONING_AND_SCAFFOLDING',GONGSICKYI:'FORMULA_CALCULATION_UNIT_VERIFICATION'},
    privacy:{raw_answers_included:false,answer_schemas_included:false,direct_identity_included:false},
    truth_boundary:{content_scope:'LOCAL_SYNTHETIC',expert_review_status:plan.expert_review_status,license_gate_status:plan.license_gate_status,production_ready:false}
  };
}
