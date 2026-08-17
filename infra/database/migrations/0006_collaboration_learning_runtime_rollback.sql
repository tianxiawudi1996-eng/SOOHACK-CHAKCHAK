BEGIN;

DROP TABLE IF EXISTS mathchakchak.student_formula_collaboration_progress;
DROP TABLE IF EXISTS mathchakchak.collaboration_phase_evidence;

ALTER TABLE mathchakchak.formula_collaboration_session
  DROP COLUMN IF EXISTS evidence_score,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS started_at;

COMMIT;
