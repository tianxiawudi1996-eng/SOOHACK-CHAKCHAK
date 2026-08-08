BEGIN;

CREATE TABLE mathchakchak.privacy_external_evidence_validation_contract (
  id uuid PRIMARY KEY,
  handoff_packet_id uuid NOT NULL REFERENCES mathchakchak.privacy_execution_handoff_packet(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_evidence_validation_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(48) NOT NULL CHECK (status = 'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (handoff_packet_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_evidence_validation_rule (
  id uuid PRIMARY KEY,
  validation_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_validation_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'MANAGED_IDENTITY','JIT_AUTHORIZATION','BACKUP_RESTORE_EVIDENCE',
    'CHANGE_WINDOW','KILL_SWITCH_RELEASE_AUTHORITY','AUDIT_EXPORT_ROUTE'
  )),
  initial_state varchar(24) NOT NULL CHECK (initial_state = 'NOT_SUBMITTED'),
  current_status varchar(40) NOT NULL CHECK (current_status = 'AWAITING_EXTERNAL_CHANNEL'),
  allowed_evidence_types jsonb NOT NULL CHECK (jsonb_typeof(allowed_evidence_types) = 'array' AND jsonb_array_length(allowed_evidence_types) = 2),
  allowed_metadata_fields jsonb NOT NULL CHECK (jsonb_typeof(allowed_metadata_fields) = 'array' AND jsonb_array_length(allowed_metadata_fields) = 6),
  forbidden_fields jsonb NOT NULL CHECK (jsonb_typeof(forbidden_fields) = 'array' AND jsonb_array_length(forbidden_fields) = 7),
  state_transitions jsonb NOT NULL CHECK (jsonb_typeof(state_transitions) = 'array' AND jsonb_array_length(state_transitions) = 13),
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  distinct_reviewers_required boolean NOT NULL DEFAULT true CHECK (distinct_reviewers_required = true),
  self_review_allowed boolean NOT NULL DEFAULT false CHECK (self_review_allowed = false),
  expiry_required boolean NOT NULL DEFAULT true CHECK (expiry_required = true),
  expiry_policy_status varchar(24) NOT NULL CHECK (expiry_policy_status = 'MISSING_EXTERNAL'),
  max_age_seconds integer,
  revocation_check_required boolean NOT NULL DEFAULT true CHECK (revocation_check_required = true),
  raw_content_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_content_storage_allowed = false),
  submission_channel_status varchar(24) NOT NULL CHECK (submission_channel_status = 'MISSING_EXTERNAL'),
  CHECK (max_age_seconds IS NULL),
  UNIQUE (validation_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_evidence_validation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_EVIDENCE_VALIDATION_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_evidence_validation_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_validation_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_validation_mutation();

CREATE TRIGGER privacy_external_evidence_validation_rule_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_validation_rule
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_validation_mutation();

CREATE INDEX privacy_external_evidence_validation_handoff_idx
  ON mathchakchak.privacy_external_evidence_validation_contract (handoff_packet_id,revision DESC);

COMMIT;
