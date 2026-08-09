BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_proof_scanner_readiness_contract (
  id uuid PRIMARY KEY,
  quarantine_readiness_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_proof_scanner_readiness_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  scanner_execution_authorized boolean NOT NULL DEFAULT false CHECK (scanner_execution_authorized = false),
  attestation_write_authorized boolean NOT NULL DEFAULT false CHECK (attestation_write_authorized = false),
  network_connection_authorized boolean NOT NULL DEFAULT false CHECK (network_connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (quarantine_readiness_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_proof_scanner_requirement (
  id uuid PRIMARY KEY,
  scanner_readiness_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_scanner_readiness_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  trust_requirements jsonb NOT NULL CHECK (jsonb_typeof(trust_requirements)='array' AND jsonb_array_length(trust_requirements)=8),
  signature_freshness_controls jsonb NOT NULL CHECK (jsonb_typeof(signature_freshness_controls)='array' AND jsonb_array_length(signature_freshness_controls)=7),
  execution_stages jsonb NOT NULL CHECK (jsonb_typeof(execution_stages)='array' AND jsonb_array_length(execution_stages)=9),
  failure_policies jsonb NOT NULL CHECK (jsonb_typeof(failure_policies)='array' AND jsonb_array_length(failure_policies)=10),
  attestation_required_fields jsonb NOT NULL CHECK (jsonb_typeof(attestation_required_fields)='array' AND jsonb_array_length(attestation_required_fields)=12),
  approved_scanner_engines jsonb NOT NULL CHECK (approved_scanner_engines='[]'::jsonb),
  readiness_status varchar(56) NOT NULL CHECK (readiness_status='POLICY_DEFINED_EXTERNAL_SCANNER_MISSING'),
  scanner_identity_status varchar(24) NOT NULL CHECK (scanner_identity_status='MISSING_EXTERNAL'),
  trust_anchor_status varchar(24) NOT NULL CHECK (trust_anchor_status='MISSING_EXTERNAL'),
  engine_attestation_status varchar(24) NOT NULL CHECK (engine_attestation_status='MISSING_EXTERNAL'),
  signature_database_status varchar(24) NOT NULL CHECK (signature_database_status='MISSING_EXTERNAL'),
  isolation_status varchar(24) NOT NULL CHECK (isolation_status='MISSING_EXTERNAL'),
  secondary_engine_status varchar(24) NOT NULL CHECK (secondary_engine_status='MISSING_EXTERNAL'),
  attestation_sink_status varchar(24) NOT NULL CHECK (attestation_sink_status='MISSING_EXTERNAL'),
  metadata_only boolean NOT NULL DEFAULT true CHECK (metadata_only=true),
  fail_closed boolean NOT NULL DEFAULT true CHECK (fail_closed=true),
  trust_anchor_required boolean NOT NULL DEFAULT true CHECK (trust_anchor_required=true),
  signature_freshness_required boolean NOT NULL DEFAULT true CHECK (signature_freshness_required=true),
  isolated_execution_required boolean NOT NULL DEFAULT true CHECK (isolated_execution_required=true),
  multiple_engine_required boolean NOT NULL DEFAULT true CHECK (multiple_engine_required=true),
  bounded_retry_required boolean NOT NULL DEFAULT true CHECK (bounded_retry_required=true),
  timeout_required boolean NOT NULL DEFAULT true CHECK (timeout_required=true),
  attestation_required boolean NOT NULL DEFAULT true CHECK (attestation_required=true),
  raw_evidence_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_evidence_storage_allowed=false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed=false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed=false),
  maximum_signature_age_seconds integer,
  scan_timeout_seconds integer,
  maximum_retries integer,
  minimum_independent_engines integer,
  scanner_identity_reference varchar(191),trust_anchor_reference varchar(191),engine_binary_attestation_reference varchar(191),
  engine_name varchar(96),engine_version varchar(96),signature_database_version varchar(96),signature_database_updated_at timestamptz,
  isolation_policy_reference varchar(191),secondary_scanner_identity_reference varchar(191),attestation_sink_reference varchar(191),
  object_reference varchar(191),object_sha256 char(64),scan_result varchar(32),scan_result_reference varchar(191),attestation_reference varchar(191),
  scan_started_at timestamptz,scan_completed_at timestamptz,
  object_read_allowed boolean NOT NULL DEFAULT false CHECK (object_read_allowed=false),
  engine_identity_validation_allowed boolean NOT NULL DEFAULT false CHECK (engine_identity_validation_allowed=false),
  signature_update_allowed boolean NOT NULL DEFAULT false CHECK (signature_update_allowed=false),
  scan_execution_allowed boolean NOT NULL DEFAULT false CHECK (scan_execution_allowed=false),
  retry_execution_allowed boolean NOT NULL DEFAULT false CHECK (retry_execution_allowed=false),
  failover_execution_allowed boolean NOT NULL DEFAULT false CHECK (failover_execution_allowed=false),
  attestation_write_allowed boolean NOT NULL DEFAULT false CHECK (attestation_write_allowed=false),
  result_reconciliation_allowed boolean NOT NULL DEFAULT false CHECK (result_reconciliation_allowed=false),
  release_decision_write_allowed boolean NOT NULL DEFAULT false CHECK (release_decision_write_allowed=false),
  quarantine_release_allowed boolean NOT NULL DEFAULT false CHECK (quarantine_release_allowed=false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed=false),
  CHECK (maximum_signature_age_seconds IS NULL AND scan_timeout_seconds IS NULL AND maximum_retries IS NULL AND minimum_independent_engines IS NULL),
  CHECK (scanner_identity_reference IS NULL AND trust_anchor_reference IS NULL AND engine_binary_attestation_reference IS NULL),
  CHECK (engine_name IS NULL AND engine_version IS NULL AND signature_database_version IS NULL AND signature_database_updated_at IS NULL),
  CHECK (isolation_policy_reference IS NULL AND secondary_scanner_identity_reference IS NULL AND attestation_sink_reference IS NULL),
  CHECK (object_reference IS NULL AND object_sha256 IS NULL AND scan_result IS NULL AND scan_result_reference IS NULL AND attestation_reference IS NULL),
  CHECK (scan_started_at IS NULL AND scan_completed_at IS NULL),
  UNIQUE (scanner_readiness_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_proof_scanner_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EXTERNAL_REFERENCE_PROOF_SCANNER_APPEND_ONLY'; END; $$;

CREATE TRIGGER proof_scanner_contract_immutable BEFORE UPDATE OR DELETE
ON mathchakchak.privacy_external_reference_proof_scanner_readiness_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_proof_scanner_mutation();

CREATE TRIGGER proof_scanner_requirement_immutable BEFORE UPDATE OR DELETE
ON mathchakchak.privacy_external_reference_proof_scanner_requirement
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_proof_scanner_mutation();

CREATE INDEX proof_scanner_readiness_quarantine_idx
ON mathchakchak.privacy_external_reference_proof_scanner_readiness_contract (quarantine_readiness_contract_id,revision DESC);

COMMIT;
