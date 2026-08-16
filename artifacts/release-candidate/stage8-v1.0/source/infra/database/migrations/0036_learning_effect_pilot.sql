BEGIN;

CREATE TABLE mathchakchak.learning_effect_pilot_protocol (
  id uuid PRIMARY KEY,
  protocol_code varchar(64) NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_EXTERNAL_REVIEW','REGISTERED_LOCKED','ACTIVE','COMPLETED','SUSPENDED','CANCELLED')),
  minimum_participants integer NOT NULL DEFAULT 100 CHECK (minimum_participants >= 100),
  duration_weeks smallint NOT NULL CHECK (duration_weeks BETWEEN 8 AND 12),
  assignment_method varchar(48) NOT NULL CHECK (assignment_method IN ('PENDING_EXTERNAL_APPROVAL','INDEPENDENT_CONTROLLED_ASSIGNMENT','STRATIFIED_RANDOMIZED')),
  analysis_plan_sha256 char(64) NOT NULL CHECK (analysis_plan_sha256 ~ '^[0-9a-f]{64}$'),
  research_owner_identity_reference varchar(191),
  ethics_reference varchar(191),
  independent_statistician_reference varchar(191),
  registered_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    status = 'DRAFT_EXTERNAL_REVIEW' OR
    (research_owner_identity_reference IS NOT NULL AND ethics_reference IS NOT NULL AND
     independent_statistician_reference IS NOT NULL AND registered_at IS NOT NULL AND locked_at IS NOT NULL)
  ),
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR (started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at))
);

CREATE TABLE mathchakchak.learning_effect_pilot_cohort (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.learning_effect_pilot_protocol(id) ON DELETE CASCADE,
  cohort_code varchar(24) NOT NULL CHECK (cohort_code IN ('INTERVENTION','COMPARATOR')),
  target_count integer NOT NULL CHECK (target_count > 0),
  delivery_definition_reference varchar(191),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,cohort_code),
  UNIQUE (id,protocol_id)
);

CREATE TABLE mathchakchak.learning_effect_pilot_metric (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.learning_effect_pilot_protocol(id) ON DELETE CASCADE,
  metric_code varchar(64) NOT NULL,
  metric_role varchar(16) NOT NULL CHECK (metric_role IN ('PRIMARY','DRIVER','GUARDRAIL')),
  estimand varchar(48) NOT NULL CHECK (estimand IN ('ADJUSTED_MEAN_DIFFERENCE','RATE','RATE_DIFFERENCE','COUNT')),
  reporting_timepoint varchar(16) NOT NULL CHECK (reporting_timepoint IN ('POST','RETENTION','ALL')),
  unit varchar(32) NOT NULL,
  preregistered boolean NOT NULL DEFAULT true CHECK (preregistered = true),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,metric_code),
  UNIQUE (id,protocol_id)
);

CREATE TABLE mathchakchak.learning_effect_pilot_participant (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.learning_effect_pilot_protocol(id) ON DELETE RESTRICT,
  cohort_id uuid NOT NULL,
  pseudonymous_key_hash char(64) NOT NULL CHECK (pseudonymous_key_hash ~ '^[0-9a-f]{64}$'),
  consent_evidence_reference varchar(191) NOT NULL,
  consent_status varchar(16) NOT NULL CHECK (consent_status IN ('GRANTED','WITHDRAWN','EXPIRED')),
  enrollment_status varchar(16) NOT NULL CHECK (enrollment_status IN ('ENROLLED','WITHDRAWN','COMPLETED')),
  grade_code varchar(2) NOT NULL REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE RESTRICT,
  enrolled_at timestamptz NOT NULL,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,pseudonymous_key_hash),
  UNIQUE (id,protocol_id),
  FOREIGN KEY (cohort_id,protocol_id) REFERENCES mathchakchak.learning_effect_pilot_cohort(id,protocol_id) ON DELETE RESTRICT,
  CHECK (enrollment_status <> 'WITHDRAWN' OR withdrawn_at IS NOT NULL),
  CHECK (enrollment_status <> 'COMPLETED' OR completed_at IS NOT NULL),
  CHECK (consent_status <> 'WITHDRAWN' OR withdrawn_at IS NOT NULL)
);

CREATE TABLE mathchakchak.learning_effect_pilot_measurement (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.learning_effect_pilot_protocol(id) ON DELETE RESTRICT,
  participant_id uuid NOT NULL,
  metric_id uuid NOT NULL,
  timepoint varchar(16) NOT NULL CHECK (timepoint IN ('PRE','POST','RETENTION')),
  numeric_value numeric(14,6) NOT NULL,
  measured_at timestamptz NOT NULL,
  source_reference varchar(191) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id,metric_id,timepoint),
  FOREIGN KEY (participant_id,protocol_id) REFERENCES mathchakchak.learning_effect_pilot_participant(id,protocol_id) ON DELETE RESTRICT,
  FOREIGN KEY (metric_id,protocol_id) REFERENCES mathchakchak.learning_effect_pilot_metric(id,protocol_id) ON DELETE RESTRICT
);

CREATE TABLE mathchakchak.learning_effect_pilot_analysis_result (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.learning_effect_pilot_protocol(id) ON DELETE RESTRICT,
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_INDEPENDENT_REVIEW','INDEPENDENTLY_VERIFIED','REJECTED')),
  independent_analysis_reference varchar(191) NOT NULL,
  dataset_sha256 char(64) NOT NULL CHECK (dataset_sha256 ~ '^[0-9a-f]{64}$'),
  report_sha256 char(64) NOT NULL CHECK (report_sha256 ~ '^[0-9a-f]{64}$'),
  analyzed_participant_count integer NOT NULL CHECK (analyzed_participant_count >= 0),
  severe_privacy_incident_count integer NOT NULL DEFAULT 0 CHECK (severe_privacy_incident_count >= 0),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'INDEPENDENTLY_VERIFIED' OR verified_at IS NOT NULL)
);

CREATE INDEX learning_effect_pilot_cohort_protocol_idx ON mathchakchak.learning_effect_pilot_cohort (protocol_id,cohort_code);
CREATE INDEX learning_effect_pilot_metric_protocol_role_idx ON mathchakchak.learning_effect_pilot_metric (protocol_id,metric_role);
CREATE INDEX learning_effect_pilot_participant_protocol_status_idx ON mathchakchak.learning_effect_pilot_participant (protocol_id,enrollment_status,cohort_id);
CREATE INDEX learning_effect_pilot_participant_cohort_idx ON mathchakchak.learning_effect_pilot_participant (cohort_id);
CREATE INDEX learning_effect_pilot_measurement_participant_timepoint_idx ON mathchakchak.learning_effect_pilot_measurement (participant_id,timepoint);
CREATE INDEX learning_effect_pilot_measurement_metric_idx ON mathchakchak.learning_effect_pilot_measurement (protocol_id,metric_id);

CREATE OR REPLACE FUNCTION mathchakchak.prevent_locked_pilot_protocol_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('REGISTERED_LOCKED','ACTIVE','COMPLETED') AND
     (NEW.minimum_participants IS DISTINCT FROM OLD.minimum_participants OR
      NEW.duration_weeks IS DISTINCT FROM OLD.duration_weeks OR
      NEW.assignment_method IS DISTINCT FROM OLD.assignment_method OR
      NEW.analysis_plan_sha256 IS DISTINCT FROM OLD.analysis_plan_sha256 OR
      NEW.research_owner_identity_reference IS DISTINCT FROM OLD.research_owner_identity_reference OR
      NEW.ethics_reference IS DISTINCT FROM OLD.ethics_reference OR
      NEW.independent_statistician_reference IS DISTINCT FROM OLD.independent_statistician_reference OR
      NEW.registered_at IS DISTINCT FROM OLD.registered_at OR
      NEW.locked_at IS DISTINCT FROM OLD.locked_at) THEN
    RAISE EXCEPTION 'locked pilot protocol fields are immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE TRIGGER learning_effect_pilot_protocol_lock_guard
BEFORE UPDATE ON mathchakchak.learning_effect_pilot_protocol
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_locked_pilot_protocol_mutation();

REVOKE ALL ON
  mathchakchak.learning_effect_pilot_protocol,
  mathchakchak.learning_effect_pilot_cohort,
  mathchakchak.learning_effect_pilot_metric,
  mathchakchak.learning_effect_pilot_participant,
  mathchakchak.learning_effect_pilot_measurement,
  mathchakchak.learning_effect_pilot_analysis_result
FROM PUBLIC;

COMMIT;
