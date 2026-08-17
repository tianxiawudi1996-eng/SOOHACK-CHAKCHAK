BEGIN;

ALTER TABLE mathchakchak.formula_learning_response
  DROP CONSTRAINT IF EXISTS formula_response_tutor_metadata_complete,
  DROP CONSTRAINT IF EXISTS formula_response_tutor_safety_valid,
  DROP CONSTRAINT IF EXISTS formula_response_tutor_latency_valid,
  DROP CONSTRAINT IF EXISTS formula_response_tutor_mode_valid,
  DROP CONSTRAINT IF EXISTS formula_response_tutor_feedback_object,
  DROP COLUMN IF EXISTS tutor_generated_at,
  DROP COLUMN IF EXISTS tutor_safety_status,
  DROP COLUMN IF EXISTS tutor_latency_ms,
  DROP COLUMN IF EXISTS tutor_model_reference,
  DROP COLUMN IF EXISTS tutor_mode,
  DROP COLUMN IF EXISTS tutor_feedback;

COMMIT;
