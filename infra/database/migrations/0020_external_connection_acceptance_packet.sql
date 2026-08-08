BEGIN;

CREATE TABLE mathchakchak.privacy_external_connection_acceptance_packet (
  id uuid PRIMARY KEY,
  intake_adapter_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_intake_adapter_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_packet_id uuid REFERENCES mathchakchak.privacy_external_connection_acceptance_packet(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(56) NOT NULL CHECK (status = 'PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL'),
  packet_manifest jsonb NOT NULL,
  packet_sha256 char(64) NOT NULL CHECK (packet_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  connection_authorized boolean NOT NULL DEFAULT false CHECK (connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_packet_id IS NULL) OR (revision > 1 AND predecessor_packet_id IS NOT NULL)),
  UNIQUE (intake_adapter_contract_id,revision),
  UNIQUE (predecessor_packet_id)
);

CREATE TABLE mathchakchak.privacy_external_connection_acceptance_requirement (
  id uuid PRIMARY KEY,
  acceptance_packet_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_connection_acceptance_packet(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  required_evidence jsonb NOT NULL CHECK (jsonb_typeof(required_evidence) = 'array' AND jsonb_array_length(required_evidence) = 2),
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  status varchar(40) NOT NULL CHECK (status = 'EXTERNAL_CONFIGURATION_REQUIRED'),
  configuration_status varchar(24) NOT NULL CHECK (configuration_status = 'MISSING_EXTERNAL'),
  artifact_reference varchar(191),
  artifact_sha256 char(64),
  verified_at timestamptz,
  dual_approval_required boolean NOT NULL DEFAULT true CHECK (dual_approval_required = true),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  external_test_required boolean NOT NULL DEFAULT true CHECK (external_test_required = true),
  external_test_status varchar(24) NOT NULL CHECK (external_test_status = 'NOT_RUN_EXTERNAL'),
  acceptance_decision_status varchar(32) NOT NULL CHECK (acceptance_decision_status = 'NOT_REVIEWED_EXTERNAL'),
  connection_enablement_allowed boolean NOT NULL DEFAULT false CHECK (connection_enablement_allowed = false),
  CHECK (artifact_reference IS NULL),
  CHECK (artifact_sha256 IS NULL),
  CHECK (verified_at IS NULL),
  UNIQUE (acceptance_packet_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_connection_acceptance_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_CONNECTION_ACCEPTANCE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_connection_acceptance_packet_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_connection_acceptance_packet
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_connection_acceptance_mutation();

CREATE TRIGGER privacy_external_connection_acceptance_requirement_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_connection_acceptance_requirement
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_connection_acceptance_mutation();

CREATE INDEX privacy_external_connection_acceptance_adapter_idx
  ON mathchakchak.privacy_external_connection_acceptance_packet (intake_adapter_contract_id,revision DESC);

COMMIT;
