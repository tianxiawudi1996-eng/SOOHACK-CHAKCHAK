BEGIN;

CREATE TABLE mathchakchak.privacy_execution_handoff_packet (
  id uuid PRIMARY KEY,
  readiness_review_id uuid NOT NULL REFERENCES mathchakchak.privacy_execution_readiness_review(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_packet_id uuid REFERENCES mathchakchak.privacy_execution_handoff_packet(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(40) NOT NULL CHECK (status = 'AWAITING_EXTERNAL_SUBMISSION'),
  packet_manifest jsonb NOT NULL,
  packet_sha256 char(64) NOT NULL CHECK (packet_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_packet_id IS NULL) OR (revision > 1 AND predecessor_packet_id IS NOT NULL)),
  UNIQUE (readiness_review_id,revision),
  UNIQUE (predecessor_packet_id)
);

CREATE TABLE mathchakchak.privacy_execution_handoff_requirement (
  id uuid PRIMARY KEY,
  handoff_packet_id uuid NOT NULL REFERENCES mathchakchak.privacy_execution_handoff_packet(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'MANAGED_IDENTITY','JIT_AUTHORIZATION','BACKUP_RESTORE_EVIDENCE',
    'CHANGE_WINDOW','KILL_SWITCH_RELEASE_AUTHORITY','AUDIT_EXPORT_ROUTE'
  )),
  owner_role varchar(48) NOT NULL CHECK (owner_role IN (
    'IDENTITY_PLATFORM_OWNER','PRIVILEGED_ACCESS_OWNER','BACKUP_RECOVERY_OWNER',
    'CHANGE_MANAGER','INCIDENT_CONTROL_OWNER','AUDIT_ARCHIVE_OWNER'
  )),
  required_evidence jsonb NOT NULL CHECK (jsonb_typeof(required_evidence) = 'array' AND jsonb_array_length(required_evidence) = 2),
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  submission_route_policy varchar(64) NOT NULL,
  submission_route_status varchar(24) NOT NULL CHECK (submission_route_status = 'MISSING_EXTERNAL'),
  status varchar(36) NOT NULL CHECK (status = 'EXTERNAL_SUBMISSION_REQUIRED'),
  evidence_reference varchar(256),
  submitted_at timestamptz,
  verified_at timestamptz,
  CHECK (evidence_reference IS NULL AND submitted_at IS NULL AND verified_at IS NULL),
  UNIQUE (handoff_packet_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_execution_handoff_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTION_HANDOFF_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_execution_handoff_packet_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_execution_handoff_packet
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_execution_handoff_mutation();

CREATE TRIGGER privacy_execution_handoff_requirement_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_execution_handoff_requirement
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_execution_handoff_mutation();

CREATE INDEX privacy_execution_handoff_readiness_idx
  ON mathchakchak.privacy_execution_handoff_packet (readiness_review_id,revision DESC);

COMMIT;
