BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_proof_handoff_contract (
  id uuid PRIMARY KEY,
  target_validation_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_target_validation_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_proof_handoff_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  proof_intake_authorized boolean NOT NULL DEFAULT false CHECK (proof_intake_authorized = false),
  dns_resolution_authorized boolean NOT NULL DEFAULT false CHECK (dns_resolution_authorized = false),
  network_connection_authorized boolean NOT NULL DEFAULT false CHECK (network_connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (target_validation_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_proof_handoff_requirement (
  id uuid PRIMARY KEY,
  handoff_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_handoff_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  proof_required_fields jsonb NOT NULL CHECK (jsonb_typeof(proof_required_fields) = 'array' AND jsonb_array_length(proof_required_fields) = 12),
  issuer_trust_requirements jsonb NOT NULL CHECK (jsonb_typeof(issuer_trust_requirements) = 'array' AND jsonb_array_length(issuer_trust_requirements) = 8),
  lifecycle_states jsonb NOT NULL CHECK (jsonb_typeof(lifecycle_states) = 'array' AND jsonb_array_length(lifecycle_states) = 7),
  revalidation_triggers jsonb NOT NULL CHECK (jsonb_typeof(revalidation_triggers) = 'array' AND jsonb_array_length(revalidation_triggers) = 8),
  dns_snapshot_required_fields jsonb NOT NULL CHECK (jsonb_typeof(dns_snapshot_required_fields) = 'array' AND jsonb_array_length(dns_snapshot_required_fields) = 8),
  handoff_status varchar(40) NOT NULL CHECK (handoff_status = 'POLICY_DEFINED_EVIDENCE_MISSING'),
  evidence_status varchar(24) NOT NULL CHECK (evidence_status = 'MISSING_EXTERNAL'),
  issuer_trust_status varchar(24) NOT NULL CHECK (issuer_trust_status = 'MISSING_EXTERNAL'),
  dns_snapshot_status varchar(24) NOT NULL CHECK (dns_snapshot_status = 'MISSING_EXTERNAL'),
  ttl_policy_status varchar(24) NOT NULL CHECK (ttl_policy_status = 'MISSING_EXTERNAL'),
  revocation_channel_status varchar(24) NOT NULL CHECK (revocation_channel_status = 'MISSING_EXTERNAL'),
  revalidation_sla_status varchar(24) NOT NULL CHECK (revalidation_sla_status = 'MISSING_EXTERNAL'),
  metadata_only boolean NOT NULL DEFAULT true CHECK (metadata_only = true),
  immutable_reference_required boolean NOT NULL DEFAULT true CHECK (immutable_reference_required = true),
  signature_required boolean NOT NULL DEFAULT true CHECK (signature_required = true),
  expiry_required boolean NOT NULL DEFAULT true CHECK (expiry_required = true),
  revocation_check_required boolean NOT NULL DEFAULT true CHECK (revocation_check_required = true),
  issuer_must_differ_from_reviewer boolean NOT NULL DEFAULT true CHECK (issuer_must_differ_from_reviewer = true),
  raw_evidence_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_evidence_storage_allowed = false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  maximum_proof_ttl_seconds integer,
  minimum_dns_ttl_seconds integer,
  revalidation_sla_seconds integer,
  revocation_poll_interval_seconds integer,
  proof_id uuid,
  proof_type varchar(64),
  target_scope_reference varchar(191),
  issuer_identity_reference varchar(191),
  evidence_reference varchar(191),
  evidence_sha256 char(64),
  signature_reference varchar(191),
  signature_algorithm varchar(64),
  revocation_endpoint_reference varchar(191),
  nonce varchar(191),
  dns_snapshot_reference varchar(191),
  dns_snapshot_sha256 char(64),
  issued_at timestamptz,
  expires_at timestamptz,
  received_at timestamptz,
  verified_at timestamptz,
  revoked_at timestamptz,
  handoff_submission_allowed boolean NOT NULL DEFAULT false CHECK (handoff_submission_allowed = false),
  proof_validation_execution_allowed boolean NOT NULL DEFAULT false CHECK (proof_validation_execution_allowed = false),
  dns_snapshot_capture_allowed boolean NOT NULL DEFAULT false CHECK (dns_snapshot_capture_allowed = false),
  revocation_polling_allowed boolean NOT NULL DEFAULT false CHECK (revocation_polling_allowed = false),
  allowlist_write_allowed boolean NOT NULL DEFAULT false CHECK (allowlist_write_allowed = false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed = false),
  CHECK (maximum_proof_ttl_seconds IS NULL AND minimum_dns_ttl_seconds IS NULL),
  CHECK (revalidation_sla_seconds IS NULL AND revocation_poll_interval_seconds IS NULL),
  CHECK (proof_id IS NULL AND proof_type IS NULL AND target_scope_reference IS NULL),
  CHECK (issuer_identity_reference IS NULL AND evidence_reference IS NULL AND evidence_sha256 IS NULL),
  CHECK (signature_reference IS NULL AND signature_algorithm IS NULL AND revocation_endpoint_reference IS NULL AND nonce IS NULL),
  CHECK (dns_snapshot_reference IS NULL AND dns_snapshot_sha256 IS NULL),
  CHECK (issued_at IS NULL AND expires_at IS NULL AND received_at IS NULL AND verified_at IS NULL AND revoked_at IS NULL),
  UNIQUE (handoff_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_reference_proof_handoff_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_REFERENCE_PROOF_HANDOFF_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_reference_proof_handoff_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_handoff_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_handoff_mutation();

CREATE TRIGGER privacy_external_reference_proof_handoff_requirement_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_handoff_requirement
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_handoff_mutation();

CREATE INDEX privacy_external_reference_proof_handoff_target_idx
  ON mathchakchak.privacy_external_reference_proof_handoff_contract (target_validation_contract_id,revision DESC);

COMMIT;
