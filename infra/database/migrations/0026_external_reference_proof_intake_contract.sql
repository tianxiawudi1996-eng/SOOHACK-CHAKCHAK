BEGIN;

CREATE TABLE mathchakchak.privacy_external_reference_proof_intake_contract (
  id uuid PRIMARY KEY,
  proof_handoff_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_handoff_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_reference_proof_intake_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  proof_intake_authorized boolean NOT NULL DEFAULT false CHECK (proof_intake_authorized = false),
  validation_execution_authorized boolean NOT NULL DEFAULT false CHECK (validation_execution_authorized = false),
  network_connection_authorized boolean NOT NULL DEFAULT false CHECK (network_connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (proof_handoff_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_reference_proof_intake_rule (
  id uuid PRIMARY KEY,
  intake_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_reference_proof_intake_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  intake_states jsonb NOT NULL CHECK (jsonb_typeof(intake_states) = 'array' AND jsonb_array_length(intake_states) = 9),
  allowed_transitions jsonb NOT NULL CHECK (jsonb_typeof(allowed_transitions) = 'array' AND jsonb_array_length(allowed_transitions) = 14),
  rejection_codes jsonb NOT NULL CHECK (jsonb_typeof(rejection_codes) = 'array' AND jsonb_array_length(rejection_codes) = 12),
  replay_controls jsonb NOT NULL CHECK (jsonb_typeof(replay_controls) = 'array' AND jsonb_array_length(replay_controls) = 6),
  review_decisions jsonb NOT NULL CHECK (jsonb_typeof(review_decisions) = 'array' AND jsonb_array_length(review_decisions) = 3),
  current_state varchar(32) NOT NULL CHECK (current_state = 'NOT_ACCEPTING'),
  intake_channel_status varchar(24) NOT NULL CHECK (intake_channel_status = 'MISSING_EXTERNAL'),
  quarantine_policy_status varchar(40) NOT NULL CHECK (quarantine_policy_status = 'POLICY_DEFINED_CHANNEL_MISSING'),
  duplicate_policy_status varchar(48) NOT NULL CHECK (duplicate_policy_status = 'POLICY_DEFINED_EXECUTION_DISABLED'),
  replay_policy_status varchar(48) NOT NULL CHECK (replay_policy_status = 'POLICY_DEFINED_EXECUTION_DISABLED'),
  signature_policy_status varchar(48) NOT NULL CHECK (signature_policy_status = 'POLICY_DEFINED_EXECUTION_DISABLED'),
  issuer_policy_status varchar(48) NOT NULL CHECK (issuer_policy_status = 'POLICY_DEFINED_EXECUTION_DISABLED'),
  dual_review_policy_status varchar(48) NOT NULL CHECK (dual_review_policy_status = 'POLICY_DEFINED_REVIEWERS_MISSING'),
  metadata_only boolean NOT NULL DEFAULT true CHECK (metadata_only = true),
  fail_closed boolean NOT NULL DEFAULT true CHECK (fail_closed = true),
  quarantine_required boolean NOT NULL DEFAULT true CHECK (quarantine_required = true),
  duplicate_check_required boolean NOT NULL DEFAULT true CHECK (duplicate_check_required = true),
  replay_check_required boolean NOT NULL DEFAULT true CHECK (replay_check_required = true),
  signature_check_required boolean NOT NULL DEFAULT true CHECK (signature_check_required = true),
  issuer_check_required boolean NOT NULL DEFAULT true CHECK (issuer_check_required = true),
  two_distinct_reviewers_required boolean NOT NULL DEFAULT true CHECK (two_distinct_reviewers_required = true),
  raw_evidence_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_evidence_storage_allowed = false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  quarantine_retention_seconds integer,
  replay_window_seconds integer,
  review_sla_seconds integer,
  intake_channel_reference varchar(191),
  proof_id uuid,
  evidence_reference varchar(191),
  evidence_sha256 char(64),
  signature_reference varchar(191),
  issuer_identity_reference varchar(191),
  nonce varchar(191),
  duplicate_fingerprint char(64),
  replay_registration_reference varchar(191),
  first_reviewer_identity_reference varchar(191),
  second_reviewer_identity_reference varchar(191),
  first_review_decision varchar(32),
  second_review_decision varchar(32),
  received_at timestamptz,
  quarantined_at timestamptz,
  reviewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  proof_submission_allowed boolean NOT NULL DEFAULT false CHECK (proof_submission_allowed = false),
  quarantine_write_allowed boolean NOT NULL DEFAULT false CHECK (quarantine_write_allowed = false),
  intake_state_transition_allowed boolean NOT NULL DEFAULT false CHECK (intake_state_transition_allowed = false),
  duplicate_check_execution_allowed boolean NOT NULL DEFAULT false CHECK (duplicate_check_execution_allowed = false),
  replay_check_execution_allowed boolean NOT NULL DEFAULT false CHECK (replay_check_execution_allowed = false),
  signature_validation_execution_allowed boolean NOT NULL DEFAULT false CHECK (signature_validation_execution_allowed = false),
  issuer_validation_execution_allowed boolean NOT NULL DEFAULT false CHECK (issuer_validation_execution_allowed = false),
  review_decision_write_allowed boolean NOT NULL DEFAULT false CHECK (review_decision_write_allowed = false),
  quarantine_release_allowed boolean NOT NULL DEFAULT false CHECK (quarantine_release_allowed = false),
  allowlist_write_allowed boolean NOT NULL DEFAULT false CHECK (allowlist_write_allowed = false),
  automatic_activation_allowed boolean NOT NULL DEFAULT false CHECK (automatic_activation_allowed = false),
  CHECK (quarantine_retention_seconds IS NULL AND replay_window_seconds IS NULL AND review_sla_seconds IS NULL),
  CHECK (intake_channel_reference IS NULL AND proof_id IS NULL),
  CHECK (evidence_reference IS NULL AND evidence_sha256 IS NULL AND signature_reference IS NULL),
  CHECK (issuer_identity_reference IS NULL AND nonce IS NULL AND duplicate_fingerprint IS NULL AND replay_registration_reference IS NULL),
  CHECK (first_reviewer_identity_reference IS NULL AND second_reviewer_identity_reference IS NULL),
  CHECK (first_review_decision IS NULL AND second_review_decision IS NULL),
  CHECK (received_at IS NULL AND quarantined_at IS NULL AND reviewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL),
  UNIQUE (intake_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_reference_proof_intake_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_REFERENCE_PROOF_INTAKE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_reference_proof_intake_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_intake_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_intake_mutation();

CREATE TRIGGER privacy_external_reference_proof_intake_rule_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_reference_proof_intake_rule
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_reference_proof_intake_mutation();

CREATE INDEX privacy_external_reference_proof_intake_handoff_idx
  ON mathchakchak.privacy_external_reference_proof_intake_contract (proof_handoff_contract_id,revision DESC);

COMMIT;
