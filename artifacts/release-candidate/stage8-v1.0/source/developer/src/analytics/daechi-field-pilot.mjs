export const FIELD_PILOT_REQUIREMENTS=Object.freeze({
  minimum_academies:2,
  maximum_academies:3,
  minimum_planned_weeks:1,
  maximum_planned_weeks:12
});

export const FIELD_PILOT_METRICS=Object.freeze([
  'TEACHER_CORE_WORKFLOW_COMPLETION_RATE',
  'STUDENT_LEARNING_PLAN_COMPLETION_RATE',
  'PARENT_REPORT_COMPREHENSION_RATE',
  'REUSE_INTENT_RATE',
  'PURCHASE_INTENT_RATE',
  'CRITICAL_INCIDENT_COUNT'
]);

const count=value=>Math.max(0,Number.isFinite(Number(value))?Math.trunc(Number(value)):0);
const bounded=(value,maximum)=>Math.min(count(value),maximum);

export function buildDaechiFieldPilotReadiness(input={}){
  const academies=count(input.academy_count);
  const agreements=bounded(input.agreement_count,academies);
  const privacyAcceptances=bounded(input.privacy_acceptance_count,academies);
  const completedAcademies=bounded(input.completed_academy_count,academies);
  const enrolledStudents=count(input.enrolled_student_count);
  const consentedStudents=bounded(input.consented_student_count,enrolledStudents);
  const plannedWeeks=count(input.planned_weeks);
  const observedWeeks=count(input.observed_week_count);
  const metricCount=count(input.metric_count);
  const verifiedResults=count(input.verified_result_count);
  const productApprovals=count(input.product_approval_count);
  const protocolLocked=['REGISTERED_LOCKED','ACTIVE','COMPLETED'].includes(input.protocol_status);

  const gates={
    protocol_locked:protocolLocked,
    planned_weeks_valid:plannedWeeks>=FIELD_PILOT_REQUIREMENTS.minimum_planned_weeks&&plannedWeeks<=FIELD_PILOT_REQUIREMENTS.maximum_planned_weeks,
    academy_count_valid:academies>=FIELD_PILOT_REQUIREMENTS.minimum_academies&&academies<=FIELD_PILOT_REQUIREMENTS.maximum_academies,
    academy_agreements_complete:academies>0&&agreements===academies,
    privacy_acceptance_complete:academies>0&&privacyAcceptances===academies,
    academies_completed:academies>0&&completedAcademies===academies,
    required_metrics_complete:metricCount===FIELD_PILOT_METRICS.length,
    observation_complete:plannedWeeks>0&&observedWeeks>=plannedWeeks,
    student_consent_complete:enrolledStudents>0&&consentedStudents===enrolledStudents,
    stakeholder_evidence_present:count(input.teacher_operator_count)>0&&count(input.parent_respondent_count)>0,
    no_open_blocking_issue:count(input.open_blocking_issue_count)===0,
    independent_result_verified:verifiedResults>0&&Boolean(input.independent_result_reference)
  };
  const evidenceComplete=Object.values(gates).every(Boolean);
  const productReviewAccepted=evidenceComplete&&productApprovals>0&&Boolean(input.product_approval_reference);

  return {
    requirement_id:'D80-09',
    status:productReviewAccepted?'EXTERNAL_FIELD_EVIDENCE_ACCEPTED':evidenceComplete?'READY_FOR_PRODUCT_REVIEW':'BLOCKED_EXTERNAL_FIELD_EVIDENCE',
    protocol:{
      code:input.protocol_code||null,
      status:input.protocol_status||'NOT_REGISTERED',
      planned_weeks:plannedWeeks,
      academy_range:[FIELD_PILOT_REQUIREMENTS.minimum_academies,FIELD_PILOT_REQUIREMENTS.maximum_academies]
    },
    counts:{
      academies,
      agreements,
      privacy_acceptances:privacyAcceptances,
      completed_academies:completedAcademies,
      observed_weeks:observedWeeks,
      required_metrics:metricCount,
      enrolled_students:enrolledStudents,
      consented_students:consentedStudents,
      teacher_operators:count(input.teacher_operator_count),
      parent_respondents:count(input.parent_respondent_count),
      open_blocking_issues:count(input.open_blocking_issue_count),
      verified_results:verifiedResults,
      product_approvals:productApprovals
    },
    gates,
    claims:{
      daechi_fit_proven:false,
      market_score_80_confirmed:false,
      automatic_market_approval:false,
      note:evidenceComplete?'현장 집계 증거가 제품 검토 조건을 충족했지만 대치동 적합성과 시장 점수는 전체 D80 증거의 별도 책임자 판정 대상입니다.':'실제 학원 계약·동의·관찰·독립 결과 없이 현장 적합성을 선언할 수 없습니다.'
    },
    privacy:{
      aggregate_metrics_only:true,
      academy_name:false,
      academy_address:false,
      personal_contact:false,
      student_identifier:false,
      raw_answer:false,
      raw_survey_response:false
    }
  };
}
