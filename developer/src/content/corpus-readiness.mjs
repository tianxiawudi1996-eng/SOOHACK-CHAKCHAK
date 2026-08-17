export const CORPUS_TARGET_COUNT = 30_000;

const count = (value) => Math.max(0, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0);
const ratio = (value, denominator) => denominator > 0 ? Math.min(1, value / denominator) : 0;

export function buildCorpusReadiness(input = {}) {
  const metrics = {
    registered: count(input.registered),
    active_rights: count(input.active_rights),
    metadata_complete: count(input.metadata_complete),
    double_math_approved: count(input.double_math_approved),
    rights_approved: count(input.rights_approved),
    published: count(input.published),
    open_blocking_findings: count(input.open_blocking_findings)
  };
  for (const key of ['active_rights','metadata_complete','double_math_approved','rights_approved','published']) {
    metrics[key] = Math.min(metrics[key], metrics.registered);
  }

  const gates = {
    target_count: metrics.published >= CORPUS_TARGET_COUNT,
    rights_coverage: metrics.registered > 0 && metrics.active_rights === metrics.registered,
    metadata_coverage: metrics.registered > 0 && metrics.metadata_complete === metrics.registered,
    math_review_coverage: metrics.registered > 0 && metrics.double_math_approved === metrics.registered,
    rights_review_coverage: metrics.registered > 0 && metrics.rights_approved === metrics.registered,
    no_blocking_findings: metrics.open_blocking_findings === 0
  };

  const blockers = [];
  if (!gates.target_count) blockers.push({code:'CORPUS_TARGET_NOT_MET',missing:Math.max(0,CORPUS_TARGET_COUNT-metrics.published)});
  if (!gates.rights_coverage) blockers.push({code:'RIGHTS_COVERAGE_INCOMPLETE',missing:Math.max(0,metrics.registered-metrics.active_rights)});
  if (!gates.metadata_coverage) blockers.push({code:'METADATA_COVERAGE_INCOMPLETE',missing:Math.max(0,metrics.registered-metrics.metadata_complete)});
  if (!gates.math_review_coverage) blockers.push({code:'DOUBLE_MATH_REVIEW_INCOMPLETE',missing:Math.max(0,metrics.registered-metrics.double_math_approved)});
  if (!gates.rights_review_coverage) blockers.push({code:'RIGHTS_REVIEW_INCOMPLETE',missing:Math.max(0,metrics.registered-metrics.rights_approved)});
  if (!gates.no_blocking_findings) blockers.push({code:'BLOCKING_QUALITY_FINDINGS_OPEN',missing:metrics.open_blocking_findings});

  const coverage = metrics.registered === 0 ? 0 : (
    ratio(metrics.active_rights,metrics.registered) +
    ratio(metrics.metadata_complete,metrics.registered) +
    ratio(metrics.double_math_approved,metrics.registered) +
    ratio(metrics.rights_approved,metrics.registered)
  ) / 4;
  const targetProgress = ratio(metrics.published,CORPUS_TARGET_COUNT);

  return {
    status:Object.values(gates).every(Boolean)?'READY':'BLOCKED_EXTERNAL_CONTENT_EVIDENCE',
    target_count:CORPUS_TARGET_COUNT,
    readiness_score:Math.round((coverage*0.6+targetProgress*0.4)*100),
    metrics,
    gates,
    blockers,
    publication_policy:{automatic_publication:false,two_distinct_math_reviewers_required:true,rights_review_required:true,active_license_required:true},
    claims:{corpus_30000_complete:gates.target_count,learning_effectiveness_proven:false,daechi_fit_proven:false}
  };
}
