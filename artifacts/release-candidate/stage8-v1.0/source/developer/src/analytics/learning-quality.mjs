const PROVISIONAL_TARGETS = Object.freeze({
  learning_completion_rate: 0.8,
  application_mastery_rate: 0.8,
  durable_recall_rate: 0.75,
  independent_response_rate: 0.5,
  collaboration_pass_rate: 0.6
});

const integer = (value) => Number.parseInt(value ?? 0, 10) || 0;
const ratio = (numerator, denominator) => denominator > 0 ? Math.round((numerator / denominator) * 10000) / 10000 : null;

export function buildLearningQualitySnapshot(input = {}) {
  const sample = {
    formula_sessions_started:integer(input.formula_sessions_started),
    formula_sessions_completed:integer(input.formula_sessions_completed),
    formulas_assessed:integer(input.formulas_assessed),
    formulas_mastered:integer(input.formulas_mastered),
    recall_attempts:integer(input.recall_attempts),
    recall_correct:integer(input.recall_correct),
    formula_responses:integer(input.formula_responses),
    hinted_responses:integer(input.hinted_responses),
    collaboration_phases:integer(input.collaboration_phases),
    collaboration_passes:integer(input.collaboration_passes)
  };
  return {
    metric_version:'1.0',
    target_status:'PROVISIONAL_NO_FIELD_BASELINE',
    primary:{
      learning_completion_rate:ratio(sample.formula_sessions_completed,sample.formula_sessions_started),
      application_mastery_rate:ratio(sample.formulas_mastered,sample.formulas_assessed),
      durable_recall_rate:ratio(sample.recall_correct,sample.recall_attempts)
    },
    drivers:{
      independent_response_rate:ratio(sample.formula_responses-sample.hinted_responses,sample.formula_responses),
      collaboration_pass_rate:ratio(sample.collaboration_passes,sample.collaboration_phases)
    },
    provisional_targets:PROVISIONAL_TARGETS,
    sample,
    data_sufficient:sample.formula_sessions_completed>=3&&sample.formulas_assessed>=3&&sample.recall_attempts>=3,
    privacy:{aggregation_only:true,raw_answers_included:false,problem_text_included:false,direct_identifiers_included:false}
  };
}
