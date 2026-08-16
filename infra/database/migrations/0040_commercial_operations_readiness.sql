BEGIN;

CREATE TABLE mathchakchak.commercial_ops_protocol (
  id uuid PRIMARY KEY,
  protocol_code varchar(64) NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_EXTERNAL_REVIEW','REGISTERED_LOCKED','ACTIVE','COMPLETED','SUSPENDED','CANCELLED')),
  protocol_sha256 char(64) NOT NULL CHECK (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  environment_count smallint NOT NULL DEFAULT 4 CHECK (environment_count = 4),
  product_owner_identity_reference varchar(191),
  operations_owner_identity_reference varchar(191),
  registered_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    status = 'DRAFT_EXTERNAL_REVIEW' OR
    (product_owner_identity_reference IS NOT NULL AND operations_owner_identity_reference IS NOT NULL AND
     registered_at IS NOT NULL AND locked_at IS NOT NULL)
  ),
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR (started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at))
);

CREATE TABLE mathchakchak.commercial_ops_control (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.commercial_ops_protocol(id) ON DELETE CASCADE,
  control_code varchar(64) NOT NULL CHECK (control_code IN (
    'PRIVACY_CHILD_CONSENT','CONTENT_RIGHTS','PAYMENT_REFUND','SLA_SUPPORT','INCIDENT_RESPONSE',
    'MONITORING_ALERTS','BACKUP_RESTORE','MIGRATION_ROLLBACK','DEPLOYMENT_HEALTHCHECK','SECURITY_ACCESS_REVIEW'
  )),
  control_category varchar(24) NOT NULL CHECK (control_category IN ('LEGAL_PRIVACY','COMMERCIAL','OPERATIONS','SECURITY')),
  required boolean NOT NULL DEFAULT true CHECK (required = true),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,control_code),
  UNIQUE (id,protocol_id)
);

CREATE TABLE mathchakchak.commercial_ops_evidence (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.commercial_ops_protocol(id) ON DELETE RESTRICT,
  control_id uuid NOT NULL,
  evidence_reference varchar(191) NOT NULL,
  evidence_sha256 char(64) NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  status varchar(16) NOT NULL CHECK (status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
  reviewer_identity_reference varchar(191),
  verified_at timestamptz,
  expires_at timestamptz,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (control_id,protocol_id) REFERENCES mathchakchak.commercial_ops_control(id,protocol_id) ON DELETE RESTRICT,
  UNIQUE (protocol_id,evidence_reference),
  CHECK (status <> 'VERIFIED' OR (reviewer_identity_reference IS NOT NULL AND verified_at IS NOT NULL)),
  CHECK (expires_at IS NULL OR expires_at > recorded_at)
);

CREATE TABLE mathchakchak.commercial_ops_recovery_drill (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.commercial_ops_protocol(id) ON DELETE RESTRICT,
  drill_type varchar(24) NOT NULL CHECK (drill_type IN ('BACKUP_RESTORE','MIGRATION_ROLLBACK')),
  environment_code varchar(16) NOT NULL CHECK (environment_code IN ('LOCAL','DEV','STAGING','PRODUCTION')),
  status varchar(16) NOT NULL CHECK (status IN ('PLANNED','PASS','FAIL','CANCELLED')),
  evidence_reference varchar(191) NOT NULL,
  evidence_sha256 char(64) NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  restore_or_rollback_duration_seconds integer CHECK (restore_or_rollback_duration_seconds >= 0),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('PASS','FAIL') OR completed_at IS NOT NULL),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE mathchakchak.commercial_ops_incident (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.commercial_ops_protocol(id) ON DELETE RESTRICT,
  incident_reference varchar(191) NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  severity varchar(16) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  category varchar(24) NOT NULL CHECK (category IN ('PRIVACY','CHILD_SAFETY','CONTENT_RIGHTS','PAYMENT','AVAILABILITY','SECURITY')),
  status varchar(16) NOT NULL CHECK (status IN ('OPEN','MITIGATING','RESOLVED','ACCEPTED_RISK')),
  evidence_reference varchar(191) NOT NULL,
  resolution_reference varchar(191),
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,incident_reference,revision),
  CHECK (status NOT IN ('RESOLVED','ACCEPTED_RISK') OR resolution_reference IS NOT NULL)
);

CREATE TABLE mathchakchak.commercial_ops_product_review (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.commercial_ops_protocol(id) ON DELETE RESTRICT,
  reviewer_identity_reference varchar(191) NOT NULL,
  decision varchar(24) NOT NULL CHECK (decision IN ('APPROVE','APPROVE_WITH_PATCH','REJECT')),
  review_reference varchar(191) NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,reviewer_identity_reference)
);

CREATE INDEX commercial_ops_control_protocol_idx ON mathchakchak.commercial_ops_control(protocol_id,control_code);
CREATE INDEX commercial_ops_evidence_protocol_control_idx ON mathchakchak.commercial_ops_evidence(protocol_id,control_id,status);
CREATE INDEX commercial_ops_recovery_protocol_type_status_idx ON mathchakchak.commercial_ops_recovery_drill(protocol_id,drill_type,status,completed_at DESC);
CREATE INDEX commercial_ops_incident_protocol_reference_idx ON mathchakchak.commercial_ops_incident(protocol_id,incident_reference,revision DESC);
CREATE INDEX commercial_ops_product_review_protocol_idx ON mathchakchak.commercial_ops_product_review(protocol_id,decision,reviewed_at DESC);

CREATE OR REPLACE FUNCTION mathchakchak.prevent_locked_commercial_ops_protocol_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('REGISTERED_LOCKED','ACTIVE','COMPLETED') AND
     (NEW.protocol_sha256 IS DISTINCT FROM OLD.protocol_sha256 OR
      NEW.environment_count IS DISTINCT FROM OLD.environment_count OR
      NEW.product_owner_identity_reference IS DISTINCT FROM OLD.product_owner_identity_reference OR
      NEW.operations_owner_identity_reference IS DISTINCT FROM OLD.operations_owner_identity_reference OR
      NEW.registered_at IS DISTINCT FROM OLD.registered_at OR
      NEW.locked_at IS DISTINCT FROM OLD.locked_at) THEN
    RAISE EXCEPTION 'locked commercial operations protocol fields are immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION mathchakchak.prevent_commercial_ops_evidence_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'commercial operations evidence history is append-only' USING ERRCODE='23514';
END $$;

CREATE TRIGGER commercial_ops_protocol_lock_guard
BEFORE UPDATE ON mathchakchak.commercial_ops_protocol
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_locked_commercial_ops_protocol_mutation();
CREATE TRIGGER commercial_ops_evidence_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.commercial_ops_evidence
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_commercial_ops_evidence_history_mutation();
CREATE TRIGGER commercial_ops_recovery_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.commercial_ops_recovery_drill
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_commercial_ops_evidence_history_mutation();
CREATE TRIGGER commercial_ops_incident_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.commercial_ops_incident
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_commercial_ops_evidence_history_mutation();
CREATE TRIGGER commercial_ops_product_review_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.commercial_ops_product_review
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_commercial_ops_evidence_history_mutation();

REVOKE ALL ON
  mathchakchak.commercial_ops_protocol,
  mathchakchak.commercial_ops_control,
  mathchakchak.commercial_ops_evidence,
  mathchakchak.commercial_ops_recovery_drill,
  mathchakchak.commercial_ops_incident,
  mathchakchak.commercial_ops_product_review
FROM PUBLIC;

COMMIT;
