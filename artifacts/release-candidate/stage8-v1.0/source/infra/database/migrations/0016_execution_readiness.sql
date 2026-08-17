BEGIN;

CREATE TABLE mathchakchak.privacy_execution_readiness_review (
  id uuid PRIMARY KEY,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_review_id uuid REFERENCES mathchakchak.privacy_execution_readiness_review(id) ON DELETE RESTRICT,
  evaluated_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  status varchar(32) NOT NULL CHECK (status IN ('BLOCKED_LOCAL_PREREQUISITE','BLOCKED_EXTERNAL')),
  package_manifest_sha256 char(64) NOT NULL CHECK (package_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  local_checks jsonb NOT NULL,
  local_blockers jsonb NOT NULL,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_review_id IS NULL) OR (revision > 1 AND predecessor_review_id IS NOT NULL)),
  UNIQUE (package_manifest_id,revision),
  UNIQUE (predecessor_review_id)
);

CREATE TABLE mathchakchak.privacy_execution_readiness_control (
  id uuid PRIMARY KEY,
  readiness_review_id uuid NOT NULL REFERENCES mathchakchak.privacy_execution_readiness_review(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'MANAGED_IDENTITY','JIT_AUTHORIZATION','BACKUP_RESTORE_EVIDENCE',
    'CHANGE_WINDOW','KILL_SWITCH_RELEASE_AUTHORITY','AUDIT_EXPORT_ROUTE'
  )),
  status varchar(24) NOT NULL CHECK (status = 'MISSING_EXTERNAL'),
  evidence_reference varchar(256),
  verified_at timestamptz,
  CHECK (evidence_reference IS NULL AND verified_at IS NULL),
  UNIQUE (readiness_review_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_execution_readiness_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTION_READINESS_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_execution_readiness_review_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_execution_readiness_review
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_execution_readiness_mutation();

CREATE TRIGGER privacy_execution_readiness_control_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_execution_readiness_control
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_execution_readiness_mutation();

CREATE INDEX privacy_execution_readiness_package_idx
  ON mathchakchak.privacy_execution_readiness_review (package_manifest_id,revision DESC);

COMMIT;
