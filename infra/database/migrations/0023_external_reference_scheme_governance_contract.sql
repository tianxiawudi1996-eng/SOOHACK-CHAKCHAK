BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_scheme_governance_contract (
  id uuid PRIMARY KEY,
  envelope_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_submission_envelope_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_scheme_governance_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  connection_authorized boolean NOT NULL DEFAULT false CHECK (connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (envelope_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_scheme_governance_policy (
  id uuid PRIMARY KEY,
  governance_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_scheme_governance_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  proposal_required_fields jsonb NOT NULL CHECK (jsonb_typeof(proposal_required_fields) = 'array' AND jsonb_array_length(proposal_required_fields) = 10),
  target_restriction_fields jsonb NOT NULL CHECK (jsonb_typeof(target_restriction_fields) = 'array' AND jsonb_array_length(target_restriction_fields) = 6),
  lifecycle_states jsonb NOT NULL CHECK (jsonb_typeof(lifecycle_states) = 'array' AND jsonb_array_length(lifecycle_states) = 7),
  reapproval_triggers jsonb NOT NULL CHECK (jsonb_typeof(reapproval_triggers) = 'array' AND jsonb_array_length(reapproval_triggers) = 6),
  governance_status varchar(40) NOT NULL CHECK (governance_status = 'POLICY_DEFINED_PROPOSAL_MISSING'),
  proposal_status varchar(24) NOT NULL CHECK (proposal_status = 'MISSING_EXTERNAL'),
  current_lifecycle_state varchar(24) NOT NULL CHECK (current_lifecycle_state = 'NOT_PROPOSED'),
  approvers_must_be_distinct boolean NOT NULL DEFAULT true CHECK (approvers_must_be_distinct = true),
  proposer_must_differ_from_approvers boolean NOT NULL DEFAULT true CHECK (proposer_must_differ_from_approvers = true),
  target_scope_must_be_exact boolean NOT NULL DEFAULT true CHECK (target_scope_must_be_exact = true),
  wildcard_authority_allowed boolean NOT NULL DEFAULT false CHECK (wildcard_authority_allowed = false),
  unrestricted_path_allowed boolean NOT NULL DEFAULT false CHECK (unrestricted_path_allowed = false),
  revocation_required boolean NOT NULL DEFAULT true CHECK (revocation_required = true),
  expiry_required boolean NOT NULL DEFAULT true CHECK (expiry_required = true),
  reapproval_required boolean NOT NULL DEFAULT true CHECK (reapproval_required = true),
  maximum_validity_status varchar(24) NOT NULL CHECK (maximum_validity_status = 'MISSING_EXTERNAL'),
  maximum_validity_seconds integer,
  proposal_id uuid,
  proposed_scheme_name varchar(32),
  authority_pattern varchar(191),
  bucket_or_container varchar(191),
  path_prefix varchar(191),
  region varchar(64),
  tenant_reference varchar(191),
  proposer_identity_reference varchar(191),
  privacy_reviewer_identity_reference varchar(191),
  security_reviewer_identity_reference varchar(191),
  approved_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  allowlist_activation_allowed boolean NOT NULL DEFAULT false CHECK (allowlist_activation_allowed = false),
  metadata_submission_allowed boolean NOT NULL DEFAULT false CHECK (metadata_submission_allowed = false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed = false),
  CHECK (maximum_validity_seconds IS NULL),
  CHECK (proposal_id IS NULL),
  CHECK (proposed_scheme_name IS NULL AND authority_pattern IS NULL AND bucket_or_container IS NULL AND path_prefix IS NULL),
  CHECK (region IS NULL AND tenant_reference IS NULL),
  CHECK (proposer_identity_reference IS NULL AND privacy_reviewer_identity_reference IS NULL AND security_reviewer_identity_reference IS NULL),
  CHECK (approved_at IS NULL AND expires_at IS NULL AND revoked_at IS NULL),
  UNIQUE (governance_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_reference_scheme_governance_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_reference_scheme_governance_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_scheme_governance_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_scheme_governance_mutation();

CREATE TRIGGER privacy_external_reference_scheme_governance_policy_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_scheme_governance_policy
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_scheme_governance_mutation();

CREATE INDEX privacy_external_reference_scheme_governance_envelope_idx
  ON mathchakchak.privacy_external_reference_scheme_governance_contract (envelope_contract_id,revision DESC);

COMMIT;
