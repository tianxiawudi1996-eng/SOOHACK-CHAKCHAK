BEGIN;

CREATE TABLE mathchakchak.privacy_external_configuration_evidence_queue_contract (
  id uuid PRIMARY KEY,
  acceptance_packet_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_connection_acceptance_packet(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_configuration_evidence_queue_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  connection_authorized boolean NOT NULL DEFAULT false CHECK (connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (acceptance_packet_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_configuration_evidence_queue_slot (
  id uuid PRIMARY KEY,
  queue_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_configuration_evidence_queue_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  allowed_evidence_types jsonb NOT NULL CHECK (jsonb_typeof(allowed_evidence_types) = 'array' AND jsonb_array_length(allowed_evidence_types) = 2),
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  queue_status varchar(48) NOT NULL CHECK (queue_status = 'AWAITING_EXTERNAL_SUBMISSION_CHANNEL'),
  submission_channel_status varchar(24) NOT NULL CHECK (submission_channel_status = 'MISSING_EXTERNAL'),
  reference_policy_status varchar(24) NOT NULL CHECK (reference_policy_status = 'MISSING_EXTERNAL'),
  allowed_reference_schemes jsonb NOT NULL CHECK (allowed_reference_schemes = '[]'::jsonb),
  immutable_reference_required boolean NOT NULL DEFAULT true CHECK (immutable_reference_required = true),
  sha256_required boolean NOT NULL DEFAULT true CHECK (sha256_required = true),
  issuer_provenance_required boolean NOT NULL DEFAULT true CHECK (issuer_provenance_required = true),
  duplicate_guard_required boolean NOT NULL DEFAULT true CHECK (duplicate_guard_required = true),
  artifact_reference varchar(191),
  artifact_sha256 char(64),
  submission_id varchar(191),
  queue_entry_id uuid,
  submitted_at timestamptz,
  validation_status varchar(24) NOT NULL CHECK (validation_status = 'NOT_SUBMITTED'),
  review_ttl_policy_status varchar(24) NOT NULL CHECK (review_ttl_policy_status = 'MISSING_EXTERNAL'),
  review_ttl_seconds integer,
  raw_payload_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_payload_storage_allowed = false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed = false),
  CHECK (artifact_reference IS NULL),
  CHECK (artifact_sha256 IS NULL),
  CHECK (submission_id IS NULL),
  CHECK (queue_entry_id IS NULL),
  CHECK (submitted_at IS NULL),
  CHECK (review_ttl_seconds IS NULL),
  UNIQUE (queue_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_configuration_evidence_queue_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_configuration_evidence_queue_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_configuration_evidence_queue_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_configuration_evidence_queue_mutation();

CREATE TRIGGER privacy_external_configuration_evidence_queue_slot_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_configuration_evidence_queue_slot
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_configuration_evidence_queue_mutation();

CREATE INDEX privacy_external_configuration_evidence_queue_acceptance_idx
  ON mathchakchak.privacy_external_configuration_evidence_queue_contract (acceptance_packet_id,revision DESC);

COMMIT;
