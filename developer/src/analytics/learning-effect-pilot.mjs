export const PILOT_REQUIREMENTS=Object.freeze({
  minimum_participants:100,
  minimum_duration_weeks:8,
  maximum_duration_weeks:12,
  cohorts:Object.freeze(['INTERVENTION','COMPARATOR']),
  timepoints:Object.freeze(['PRE','POST','RETENTION'])
});

export const PILOT_METRICS=Object.freeze({
  primary:Object.freeze(['ADJUSTED_POST_SCORE_DIFFERENCE','ADJUSTED_RETENTION_SCORE_DIFFERENCE']),
  drivers:Object.freeze(['LEARNING_PLAN_COMPLETION_RATE','INDEPENDENT_RESPONSE_RATE']),
  guardrails:Object.freeze(['DROPOUT_RATE_DIFFERENCE','MISSING_PRIMARY_OUTCOME_RATE','ADVERSE_LEARNING_EVENT_RATE','SEVERE_PRIVACY_INCIDENT_COUNT'])
});

const count=value=>Math.max(0,Number.isFinite(Number(value))?Math.trunc(Number(value)):0);
const bounded=(value,maximum)=>Math.min(count(value),maximum);

export function buildPilotReadiness(input={}){
  const enrolled=count(input.enrolled_participants);
  const consented=bounded(input.consented_participants,enrolled);
  const pre=bounded(input.pre_measurements,enrolled);
  const post=bounded(input.post_measurements,enrolled);
  const retention=bounded(input.retention_measurements,enrolled);
  const completed=bounded(input.completed_participants,enrolled);
  const withdrawn=bounded(input.withdrawn_participants,enrolled);
  const duration=count(input.duration_weeks);
  const cohortCount=count(input.cohort_count);
  const primaryMetricCount=count(input.primary_metric_count);
  const driverMetricCount=count(input.driver_metric_count);
  const guardrailMetricCount=count(input.guardrail_metric_count);
  const verifiedAnalysisCount=count(input.verified_analysis_count);
  const protocolLocked=['REGISTERED_LOCKED','ACTIVE','COMPLETED'].includes(input.protocol_status);

  const gates={
    protocol_locked:protocolLocked,
    duration_valid:duration>=PILOT_REQUIREMENTS.minimum_duration_weeks&&duration<=PILOT_REQUIREMENTS.maximum_duration_weeks,
    cohorts_complete:cohortCount===PILOT_REQUIREMENTS.cohorts.length,
    metrics_preregistered:primaryMetricCount===PILOT_METRICS.primary.length&&driverMetricCount===PILOT_METRICS.drivers.length&&guardrailMetricCount===PILOT_METRICS.guardrails.length,
    minimum_sample_reached:enrolled>=PILOT_REQUIREMENTS.minimum_participants,
    active_consent_complete:enrolled>0&&consented===enrolled,
    measurements_complete:enrolled>0&&pre===enrolled&&post+withdrawn>=enrolled&&retention+withdrawn>=enrolled,
    independent_analysis_verified:verifiedAnalysisCount>0&&Boolean(input.independent_analysis_reference)
  };
  const readyForIndependentAnalysis=Object.entries(gates).filter(([key])=>key!=='independent_analysis_verified').every(([,value])=>value);
  const evidenceComplete=Object.values(gates).every(Boolean);

  return {
    requirement_id:'D80-06',
    status:evidenceComplete?'EXTERNAL_PILOT_EVIDENCE_COMPLETE':readyForIndependentAnalysis?'READY_FOR_INDEPENDENT_ANALYSIS':'BLOCKED_EXTERNAL_PILOT_EVIDENCE',
    protocol:{
      code:input.protocol_code||null,
      status:input.protocol_status||'NOT_REGISTERED',
      duration_weeks:duration,
      minimum_participants:PILOT_REQUIREMENTS.minimum_participants,
      duration_range_weeks:[PILOT_REQUIREMENTS.minimum_duration_weeks,PILOT_REQUIREMENTS.maximum_duration_weeks]
    },
    counts:{
      cohort_count:cohortCount,
      enrolled_participants:enrolled,
      consented_participants:consented,
      pre_measurements:pre,
      post_measurements:post,
      retention_measurements:retention,
      completed_participants:completed,
      withdrawn_participants:withdrawn,
      verified_analysis_count:verifiedAnalysisCount
    },
    metric_counts:{primary:primaryMetricCount,drivers:driverMetricCount,guardrails:guardrailMetricCount},
    gates,
    claims:{
      learning_effect_proven:false,
      daechi_fit_proven:false,
      market_score_80_confirmed:false,
      note:evidenceComplete?'독립 분석 증거가 접수되었으나 제품 효과 선언은 별도 제품 책임자 검토 대상입니다.':'실제 파일럿 증거 없이 학습효과를 선언할 수 없습니다.'
    },
    privacy:{direct_identity_fields:false,raw_answers:false,problem_text:false,pseudonymous_identifier_only:true}
  };
}
