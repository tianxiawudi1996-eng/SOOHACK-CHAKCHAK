BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract (
  id uuid PRIMARY KEY,
  proof_intake_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_intake_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  quarantine_storage_authorized boolean NOT NULL DEFAULT false CHECK (quarantine_storage_authorized = false),
  inspection_execution_authorized boolean NOT NULL DEFAULT false CHECK (inspection_execution_authorized = false),
  network_connection_authorized boolean NOT NULL DEFAULT false CHECK (network_connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (proof_intake_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_proof_quarantine_requirement (
  id uuid PRIMARY KEY,
  readiness_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  storage_security_controls jsonb NOT NULL CHECK (jsonb_typeof(storage_security_controls) = 'array' AND jsonb_array_length(storage_security_controls) = 8),
  content_inspection_stages jsonb NOT NULL CHECK (jsonb_typeof(content_inspection_stages) = 'array' AND jsonb_array_length(content_inspection_stages) = 8),
  content_rejection_codes jsonb NOT NULL CHECK (jsonb_typeof(content_rejection_codes) = 'array' AND jsonb_array_length(content_rejection_codes) = 12),
  retention_lifecycle_events jsonb NOT NULL CHECK (jsonb_typeof(retention_lifecycle_events) = 'array' AND jsonb_array_length(retention_lifecycle_events) = 7),
  audit_required_fields jsonb NOT NULL CHECK (jsonb_typeof(audit_required_fields) = 'array' AND jsonb_array_length(audit_required_fields) = 10),
  allowed_content_types jsonb NOT NULL CHECK (allowed_content_types = '[]'::jsonb),
  readiness_status varchar(48) NOT NULL CHECK (readiness_status = 'POLICY_DEFINED_EXTERNAL_CONTROLS_MISSING'),
  storage_status varchar(24) NOT NULL CHECK (storage_status = 'MISSING_EXTERNAL'),
  scanner_status varchar(24) NOT NULL CHECK (scanner_status = 'MISSING_EXTERNAL'),
  retention_policy_status varchar(24) NOT NULL CHECK (retention_policy_status = 'MISSING_EXTERNAL'),
  deletion_policy_status varchar(24) NOT NULL CHECK (deletion_policy_status = 'MISSING_EXTERNAL'),
  audit_sink_status varchar(24) NOT NULL CHECK (audit_sink_status = 'MISSING_EXTERNAL'),
  metadata_only boolean NOT NULL DEFAULT true CHECK (metadata_only = true),
  fail_closed boolean NOT NULL DEFAULT true CHECK (fail_closed = true),
  encryption_at_rest_required boolean NOT NULL DEFAULT true CHECK (encryption_at_rest_required = true),
  deny_public_access_required boolean NOT NULL DEFAULT true CHECK (deny_public_access_required = true),
  object_lock_required boolean NOT NULL DEFAULT true CHECK (object_lock_required = true),
  malware_scan_required boolean NOT NULL DEFAULT true CHECK (malware_scan_required = true),
  content_type_allowlist_required boolean NOT NULL DEFAULT true CHECK (content_type_allowlist_required = true),
  deletion_attestation_required boolean NOT NULL DEFAULT true CHECK (deletion_attestation_required = true),
  immutable_audit_required boolean NOT NULL DEFAULT true CHECK (immutable_audit_required = true),
  raw_evidence_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_evidence_storage_allowed = false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  maximum_object_bytes bigint,
  maximum_archive_depth integer,
  quarantine_retention_seconds integer,
  deletion_sla_seconds integer,
  storage_namespace_reference varchar(191),
  storage_policy_evidence_reference varchar(191),
  storage_policy_evidence_sha256 char(64),
  scanner_identity_reference varchar(191),
  scanner_policy_reference varchar(191),
  retention_policy_reference varchar(191),
  deletion_policy_reference varchar(191),
  audit_sink_reference varchar(191),
  object_reference varchar(191),
  object_sha256 char(64),
  scan_result_reference varchar(191),
  deletion_attestation_reference varchar(191),
  stored_at timestamptz,
  scanned_at timestamptz,
  retention_expires_at timestamptz,
  deleted_at timestamptz,
  storage_write_allowed boolean NOT NULL DEFAULT false CHECK (storage_write_allowed = false),
  content_inspection_execution_allowed boolean NOT NULL DEFAULT false CHECK (content_inspection_execution_allowed = false),
  malware_scan_execution_allowed boolean NOT NULL DEFAULT false CHECK (malware_scan_execution_allowed = false),
  retention_timer_write_allowed boolean NOT NULL DEFAULT false CHECK (retention_timer_write_allowed = false),
  deletion_execution_allowed boolean NOT NULL DEFAULT false CHECK (deletion_execution_allowed = false),
  deletion_attestation_write_allowed boolean NOT NULL DEFAULT false CHECK (deletion_attestation_write_allowed = false),
  audit_event_write_allowed boolean NOT NULL DEFAULT false CHECK (audit_event_write_allowed = false),
  quarantine_release_allowed boolean NOT NULL DEFAULT false CHECK (quarantine_release_allowed = false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed = false),
  CHECK (maximum_object_bytes IS NULL AND maximum_archive_depth IS NULL),
  CHECK (quarantine_retention_seconds IS NULL AND deletion_sla_seconds IS NULL),
  CHECK (storage_namespace_reference IS NULL AND storage_policy_evidence_reference IS NULL AND storage_policy_evidence_sha256 IS NULL),
  CHECK (scanner_identity_reference IS NULL AND scanner_policy_reference IS NULL),
  CHECK (retention_policy_reference IS NULL AND deletion_policy_reference IS NULL AND audit_sink_reference IS NULL),
  CHECK (object_reference IS NULL AND object_sha256 IS NULL AND scan_result_reference IS NULL AND deletion_attestation_reference IS NULL),
  CHECK (stored_at IS NULL AND scanned_at IS NULL AND retention_expires_at IS NULL AND deleted_at IS NULL),
  UNIQUE (readiness_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_reference_proof_quarantine_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_REFERENCE_PROOF_QUARANTINE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER proof_quarantine_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_quarantine_mutation();

CREATE TRIGGER proof_quarantine_requirement_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_quarantine_requirement
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_quarantine_mutation();

CREATE INDEX proof_quarantine_readiness_intake_idx
  ON mathchakchak.privacy_external_reference_proof_quarantine_readiness_contract (proof_intake_contract_id,revision DESC);

COMMIT;
