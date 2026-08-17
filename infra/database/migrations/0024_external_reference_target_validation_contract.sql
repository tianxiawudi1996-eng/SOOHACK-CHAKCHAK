BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_target_validation_contract (
  id uuid PRIMARY KEY,
  governance_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_scheme_governance_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_target_validation_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  dns_resolution_authorized boolean NOT NULL DEFAULT false CHECK (dns_resolution_authorized = false),
  network_connection_authorized boolean NOT NULL DEFAULT false CHECK (network_connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (governance_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_target_validation_rule (
  id uuid PRIMARY KEY,
  validation_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_target_validation_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  normalization_steps jsonb NOT NULL CHECK (jsonb_typeof(normalization_steps) = 'array' AND jsonb_array_length(normalization_steps) = 8),
  rejection_rules jsonb NOT NULL CHECK (jsonb_typeof(rejection_rules) = 'array' AND jsonb_array_length(rejection_rules) = 14),
  ownership_proof_types jsonb NOT NULL CHECK (jsonb_typeof(ownership_proof_types) = 'array' AND jsonb_array_length(ownership_proof_types) = 6),
  forbidden_address_classes jsonb NOT NULL CHECK (jsonb_typeof(forbidden_address_classes) = 'array' AND jsonb_array_length(forbidden_address_classes) = 8),
  validation_status varchar(40) NOT NULL CHECK (validation_status = 'POLICY_DEFINED_TARGET_MISSING'),
  target_status varchar(24) NOT NULL CHECK (target_status = 'MISSING_EXTERNAL'),
  dns_proof_status varchar(24) NOT NULL CHECK (dns_proof_status = 'MISSING_EXTERNAL'),
  region_proof_status varchar(24) NOT NULL CHECK (region_proof_status = 'MISSING_EXTERNAL'),
  ownership_proof_status varchar(24) NOT NULL CHECK (ownership_proof_status = 'MISSING_EXTERNAL'),
  fail_closed boolean NOT NULL DEFAULT true CHECK (fail_closed = true),
  single_parse_required boolean NOT NULL DEFAULT true CHECK (single_parse_required = true),
  idna_ascii_required boolean NOT NULL DEFAULT true CHECK (idna_ascii_required = true),
  unicode_confusable_check_required boolean NOT NULL DEFAULT true CHECK (unicode_confusable_check_required = true),
  wildcard_allowed boolean NOT NULL DEFAULT false CHECK (wildcard_allowed = false),
  userinfo_allowed boolean NOT NULL DEFAULT false CHECK (userinfo_allowed = false),
  ip_literal_allowed boolean NOT NULL DEFAULT false CHECK (ip_literal_allowed = false),
  path_traversal_allowed boolean NOT NULL DEFAULT false CHECK (path_traversal_allowed = false),
  encoded_separator_allowed boolean NOT NULL DEFAULT false CHECK (encoded_separator_allowed = false),
  redirect_allowed boolean NOT NULL DEFAULT false CHECK (redirect_allowed = false),
  maximum_redirects integer NOT NULL DEFAULT 0 CHECK (maximum_redirects = 0),
  dns_rebinding_guard_required boolean NOT NULL DEFAULT true CHECK (dns_rebinding_guard_required = true),
  private_network_allowed boolean NOT NULL DEFAULT false CHECK (private_network_allowed = false),
  port_policy_status varchar(24) NOT NULL CHECK (port_policy_status = 'MISSING_EXTERNAL'),
  allowed_ports jsonb NOT NULL CHECK (allowed_ports = '[]'::jsonb),
  normalized_scheme varchar(32),
  normalized_authority varchar(191),
  normalized_bucket_or_container varchar(191),
  normalized_path_prefix varchar(191),
  normalized_region varchar(64),
  normalized_tenant_reference varchar(191),
  ownership_evidence_reference varchar(191),
  ownership_evidence_sha256 char(64),
  dns_snapshot_reference varchar(191),
  dns_snapshot_sha256 char(64),
  validated_at timestamptz,
  proposal_validation_execution_allowed boolean NOT NULL DEFAULT false CHECK (proposal_validation_execution_allowed = false),
  dns_lookup_allowed boolean NOT NULL DEFAULT false CHECK (dns_lookup_allowed = false),
  external_reference_fetch_allowed boolean NOT NULL DEFAULT false CHECK (external_reference_fetch_allowed = false),
  allowlist_write_allowed boolean NOT NULL DEFAULT false CHECK (allowlist_write_allowed = false),
  CHECK (normalized_scheme IS NULL AND normalized_authority IS NULL AND normalized_bucket_or_container IS NULL),
  CHECK (normalized_path_prefix IS NULL AND normalized_region IS NULL AND normalized_tenant_reference IS NULL),
  CHECK (ownership_evidence_reference IS NULL AND ownership_evidence_sha256 IS NULL),
  CHECK (dns_snapshot_reference IS NULL AND dns_snapshot_sha256 IS NULL AND validated_at IS NULL),
  UNIQUE (validation_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_reference_target_validation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_REFERENCE_TARGET_VALIDATION_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_reference_target_validation_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_target_validation_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_target_validation_mutation();

CREATE TRIGGER privacy_external_reference_target_validation_rule_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_target_validation_rule
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_target_validation_mutation();

CREATE INDEX privacy_external_reference_target_validation_governance_idx
  ON mathchakchak.privacy_external_reference_target_validation_contract (governance_contract_id,revision DESC);

COMMIT;
