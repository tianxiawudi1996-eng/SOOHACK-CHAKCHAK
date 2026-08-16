BEGIN;

CREATE TABLE mathchakchak.daechi_field_pilot_protocol (
  id uuid PRIMARY KEY,
  protocol_code varchar(64) NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_EXTERNAL_REVIEW','REGISTERED_LOCKED','ACTIVE','COMPLETED','SUSPENDED','CANCELLED')),
  minimum_academies smallint NOT NULL DEFAULT 2 CHECK (minimum_academies = 2),
  maximum_academies smallint NOT NULL DEFAULT 3 CHECK (maximum_academies = 3),
  planned_weeks smallint NOT NULL CHECK (planned_weeks BETWEEN 1 AND 12),
  protocol_sha256 char(64) NOT NULL CHECK (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  product_owner_identity_reference varchar(191),
  privacy_approval_reference varchar(191),
  registered_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (minimum_academies <= maximum_academies),
  CHECK (
    status = 'DRAFT_EXTERNAL_REVIEW' OR
    (product_owner_identity_reference IS NOT NULL AND privacy_approval_reference IS NOT NULL AND
     registered_at IS NOT NULL AND locked_at IS NOT NULL)
  ),
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR (started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at))
);

CREATE TABLE mathchakchak.daechi_field_pilot_metric (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_protocol(id) ON DELETE CASCADE,
  metric_code varchar(64) NOT NULL CHECK (metric_code IN (
    'TEACHER_CORE_WORKFLOW_COMPLETION_RATE','STUDENT_LEARNING_PLAN_COMPLETION_RATE',
    'PARENT_REPORT_COMPREHENSION_RATE','REUSE_INTENT_RATE','PURCHASE_INTENT_RATE','CRITICAL_INCIDENT_COUNT'
  )),
  metric_category varchar(16) NOT NULL CHECK (metric_category IN ('TEACHER','STUDENT','PARENT','COMMERCIAL','GUARDRAIL')),
  unit varchar(16) NOT NULL CHECK (unit IN ('RATE','COUNT','MINUTES')),
  threshold_direction varchar(8) CHECK (threshold_direction IN ('MIN','MAX')),
  threshold_value numeric(12,6),
  preregistered boolean NOT NULL DEFAULT true CHECK (preregistered = true),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,metric_code),
  UNIQUE (id,protocol_id),
  CHECK ((threshold_direction IS NULL) = (threshold_value IS NULL))
);

CREATE TABLE mathchakchak.daechi_field_pilot_academy (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_protocol(id) ON DELETE RESTRICT,
  academy_identity_reference varchar(191) NOT NULL,
  agreement_evidence_reference varchar(191),
  privacy_acceptance_reference varchar(191),
  operator_identity_reference varchar(191),
  status varchar(16) NOT NULL CHECK (status IN ('INVITED','AGREED','ACTIVE','COMPLETED','WITHDRAWN')),
  enrolled_student_count integer NOT NULL DEFAULT 0 CHECK (enrolled_student_count >= 0),
  consented_student_count integer NOT NULL DEFAULT 0 CHECK (consented_student_count >= 0 AND consented_student_count <= enrolled_student_count),
  teacher_operator_count integer NOT NULL DEFAULT 0 CHECK (teacher_operator_count >= 0),
  parent_respondent_count integer NOT NULL DEFAULT 0 CHECK (parent_respondent_count >= 0),
  agreed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,academy_identity_reference),
  UNIQUE (id,protocol_id),
  CHECK (
    status = 'INVITED' OR
    (agreement_evidence_reference IS NOT NULL AND privacy_acceptance_reference IS NOT NULL AND
     operator_identity_reference IS NOT NULL AND agreed_at IS NOT NULL)
  ),
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR (started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at))
);

CREATE TABLE mathchakchak.daechi_field_pilot_observation (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_protocol(id) ON DELETE RESTRICT,
  academy_id uuid NOT NULL,
  metric_id uuid NOT NULL,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 12),
  numerator numeric(14,4) CHECK (numerator >= 0),
  denominator numeric(14,4) CHECK (denominator > 0),
  numeric_value numeric(14,6) NOT NULL,
  evidence_reference varchar(191) NOT NULL,
  collected_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academy_id,metric_id,week_number),
  FOREIGN KEY (academy_id,protocol_id) REFERENCES mathchakchak.daechi_field_pilot_academy(id,protocol_id) ON DELETE RESTRICT,
  FOREIGN KEY (metric_id,protocol_id) REFERENCES mathchakchak.daechi_field_pilot_metric(id,protocol_id) ON DELETE RESTRICT,
  CHECK (numerator IS NULL OR denominator IS NULL OR numerator <= denominator)
);

CREATE TABLE mathchakchak.daechi_field_pilot_issue (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_protocol(id) ON DELETE RESTRICT,
  academy_id uuid,
  issue_reference varchar(191) NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  severity varchar(16) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  issue_category varchar(24) NOT NULL CHECK (issue_category IN ('PRIVACY','SAFETY','MATH_ACCURACY','OPERATIONS','COMMERCIAL')),
  status varchar(16) NOT NULL CHECK (status IN ('OPEN','MITIGATING','RESOLVED','ACCEPTED_RISK')),
  evidence_reference varchar(191) NOT NULL,
  resolution_reference varchar(191),
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,issue_reference,revision),
  FOREIGN KEY (academy_id,protocol_id) REFERENCES mathchakchak.daechi_field_pilot_academy(id,protocol_id) ON DELETE RESTRICT,
  CHECK (status NOT IN ('RESOLVED','ACCEPTED_RISK') OR resolution_reference IS NOT NULL)
);

CREATE TABLE mathchakchak.daechi_field_pilot_result (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_protocol(id) ON DELETE RESTRICT,
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_INDEPENDENT_REVIEW','INDEPENDENTLY_VERIFIED','REJECTED')),
  academy_count smallint NOT NULL CHECK (academy_count BETWEEN 2 AND 3),
  observed_week_count smallint NOT NULL CHECK (observed_week_count BETWEEN 1 AND 12),
  enrolled_student_count integer NOT NULL CHECK (enrolled_student_count > 0),
  consented_student_count integer NOT NULL CHECK (consented_student_count >= 0 AND consented_student_count <= enrolled_student_count),
  teacher_operator_count integer NOT NULL CHECK (teacher_operator_count > 0),
  parent_respondent_count integer NOT NULL CHECK (parent_respondent_count > 0),
  dataset_sha256 char(64) NOT NULL CHECK (dataset_sha256 ~ '^[0-9a-f]{64}$'),
  report_sha256 char(64) NOT NULL CHECK (report_sha256 ~ '^[0-9a-f]{64}$'),
  independent_reviewer_identity_reference varchar(191) NOT NULL,
  independent_result_reference varchar(191) NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'INDEPENDENTLY_VERIFIED' OR verified_at IS NOT NULL)
);

CREATE TABLE mathchakchak.daechi_field_pilot_product_review (
  id uuid PRIMARY KEY,
  result_id uuid NOT NULL REFERENCES mathchakchak.daechi_field_pilot_result(id) ON DELETE RESTRICT,
  reviewer_identity_reference varchar(191) NOT NULL,
  decision varchar(24) NOT NULL CHECK (decision IN ('APPROVE','APPROVE_WITH_PATCH','REJECT')),
  evidence_reference varchar(191) NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id,reviewer_identity_reference)
);

CREATE INDEX daechi_field_pilot_metric_protocol_idx ON mathchakchak.daechi_field_pilot_metric(protocol_id,metric_code);
CREATE INDEX daechi_field_pilot_academy_protocol_status_idx ON mathchakchak.daechi_field_pilot_academy(protocol_id,status);
CREATE INDEX daechi_field_pilot_observation_protocol_week_idx ON mathchakchak.daechi_field_pilot_observation(protocol_id,week_number,academy_id);
CREATE INDEX daechi_field_pilot_issue_protocol_reference_idx ON mathchakchak.daechi_field_pilot_issue(protocol_id,issue_reference,revision DESC);
CREATE INDEX daechi_field_pilot_result_protocol_status_idx ON mathchakchak.daechi_field_pilot_result(protocol_id,status,verified_at DESC);

CREATE OR REPLACE FUNCTION mathchakchak.prevent_locked_daechi_field_protocol_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('REGISTERED_LOCKED','ACTIVE','COMPLETED') AND
     (NEW.minimum_academies IS DISTINCT FROM OLD.minimum_academies OR
      NEW.maximum_academies IS DISTINCT FROM OLD.maximum_academies OR
      NEW.planned_weeks IS DISTINCT FROM OLD.planned_weeks OR
      NEW.protocol_sha256 IS DISTINCT FROM OLD.protocol_sha256 OR
      NEW.product_owner_identity_reference IS DISTINCT FROM OLD.product_owner_identity_reference OR
      NEW.privacy_approval_reference IS DISTINCT FROM OLD.privacy_approval_reference OR
      NEW.registered_at IS DISTINCT FROM OLD.registered_at OR
      NEW.locked_at IS DISTINCT FROM OLD.locked_at) THEN
    RAISE EXCEPTION 'locked Daechi field pilot protocol fields are immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION mathchakchak.prevent_daechi_field_evidence_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Daechi field pilot evidence history is append-only' USING ERRCODE='23514';
END $$;

CREATE TRIGGER daechi_field_pilot_protocol_lock_guard
BEFORE UPDATE ON mathchakchak.daechi_field_pilot_protocol
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_locked_daechi_field_protocol_mutation();

CREATE TRIGGER daechi_field_pilot_observation_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.daechi_field_pilot_observation
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_daechi_field_evidence_history_mutation();
CREATE TRIGGER daechi_field_pilot_issue_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.daechi_field_pilot_issue
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_daechi_field_evidence_history_mutation();
CREATE TRIGGER daechi_field_pilot_result_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.daechi_field_pilot_result
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_daechi_field_evidence_history_mutation();
CREATE TRIGGER daechi_field_pilot_product_review_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.daechi_field_pilot_product_review
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_daechi_field_evidence_history_mutation();

REVOKE ALL ON
  mathchakchak.daechi_field_pilot_protocol,
  mathchakchak.daechi_field_pilot_metric,
  mathchakchak.daechi_field_pilot_academy,
  mathchakchak.daechi_field_pilot_observation,
  mathchakchak.daechi_field_pilot_issue,
  mathchakchak.daechi_field_pilot_result,
  mathchakchak.daechi_field_pilot_product_review
FROM PUBLIC;

COMMIT;
