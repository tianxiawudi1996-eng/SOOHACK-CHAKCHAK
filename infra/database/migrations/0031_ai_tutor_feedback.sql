BEGIN;

ALTER TABLE mathchakchak.formula_learning_response
  ADD COLUMN tutor_feedback jsonb,
  ADD COLUMN tutor_mode varchar(32),
  ADD COLUMN tutor_model_reference varchar(191),
  ADD COLUMN tutor_latency_ms integer,
  ADD COLUMN tutor_safety_status varchar(32),
  ADD COLUMN tutor_generated_at timestamptz,
  ADD CONSTRAINT formula_response_tutor_feedback_object CHECK (tutor_feedback IS NULL OR jsonb_typeof(tutor_feedback) = 'object'),
  ADD CONSTRAINT formula_response_tutor_mode_valid CHECK (tutor_mode IS NULL OR tutor_mode IN ('GENERATIVE_ASSISTED','RULE_FALLBACK')),
  ADD CONSTRAINT formula_response_tutor_latency_valid CHECK (tutor_latency_ms IS NULL OR tutor_latency_ms >= 0),
  ADD CONSTRAINT formula_response_tutor_safety_valid CHECK (tutor_safety_status IS NULL OR tutor_safety_status IN ('VALIDATED','SAFE_FALLBACK')),
  ADD CONSTRAINT formula_response_tutor_metadata_complete CHECK (
    tutor_feedback IS NULL OR
    (tutor_mode IS NOT NULL AND tutor_latency_ms IS NOT NULL AND tutor_safety_status IS NOT NULL AND tutor_generated_at IS NOT NULL)
  );

COMMIT;
