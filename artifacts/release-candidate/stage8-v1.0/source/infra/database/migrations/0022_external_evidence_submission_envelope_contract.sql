BEGIN;

CREATE TABLE mathchakchak.privacy_external_evidence_submission_envelope_contract (
  id uuid PRIMARY KEY,
  queue_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_configuration_evidence_queue_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_evidence_submission_envelope_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(64) NOT NULL CHECK (status = 'ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  connection_authorized boolean NOT NULL DEFAULT false CHECK (connection_authorized = false),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (queue_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_evidence_submission_envelope_rule (
  id uuid PRIMARY KEY,
  envelope_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_submission_envelope_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION',
    'CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE'
  )),
  owner_role varchar(48) NOT NULL,
  allowed_evidence_types jsonb NOT NULL CHECK (jsonb_typeof(allowed_evidence_types) = 'array' AND jsonb_array_length(allowed_evidence_types) = 2),
  required_approver_roles jsonb NOT NULL CHECK (required_approver_roles = '["PRIVACY_APPROVER","SECURITY_APPROVER"]'::jsonb),
  required_envelope_fields jsonb NOT NULL CHECK (jsonb_typeof(required_envelope_fields) = 'array' AND jsonb_array_length(required_envelope_fields) = 10),
  envelope_schema_status varchar(32) NOT NULL CHECK (envelope_schema_status = 'DEFINED_LOCAL_POLICY'),
  reference_scheme_allowlist_status varchar(40) NOT NULL CHECK (reference_scheme_allowlist_status = 'MISSING_EXTERNAL_APPROVAL'),
  allowed_reference_schemes jsonb NOT NULL CHECK (allowed_reference_schemes = '[]'::jsonb),
  allowlist_approval_steps jsonb NOT NULL CHECK (allowlist_approval_steps = '["SCHEME_PROPOSAL","PRIVACY_REVIEW","SECURITY_REVIEW","ACTIVATION_APPROVAL"]'::jsonb),
  allowlist_activation_allowed boolean NOT NULL DEFAULT false CHECK (allowlist_activation_allowed = false),
  submission_id_format varchar(16) NOT NULL CHECK (submission_id_format = 'UUID_V4'),
  idempotency_scope varchar(64) NOT NULL CHECK (idempotency_scope = 'QUEUE_CONTRACT_CONTROL_KEY_SUBMISSION_ID'),
  idempotency_retention_status varchar(24) NOT NULL CHECK (idempotency_retention_status = 'MISSING_EXTERNAL'),
  idempotency_retention_seconds integer,
  rejection_reason_codes jsonb NOT NULL CHECK (jsonb_typeof(rejection_reason_codes) = 'array' AND jsonb_array_length(rejection_reason_codes) = 10),
  ingress_validation_mode varchar(48) NOT NULL CHECK (ingress_validation_mode = 'REJECT_ALL_UNTIL_ALLOWLIST_APPROVED'),
  submission_acceptance_status varchar(24) NOT NULL CHECK (submission_acceptance_status = 'NOT_ACCEPTING'),
  submission_id uuid,
  artifact_reference varchar(191),
  artifact_sha256 char(64),
  issuer_reference varchar(191),
  submitted_at timestamptz,
  raw_payload_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_payload_storage_allowed = false),
  credential_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (credential_material_storage_allowed = false),
  secret_material_storage_allowed boolean NOT NULL DEFAULT false CHECK (secret_material_storage_allowed = false),
  automatic_promotion_allowed boolean NOT NULL DEFAULT false CHECK (automatic_promotion_allowed = false),
  CHECK (idempotency_retention_seconds IS NULL),
  CHECK (submission_id IS NULL),
  CHECK (artifact_reference IS NULL),
  CHECK (artifact_sha256 IS NULL),
  CHECK (issuer_reference IS NULL),
  CHECK (submitted_at IS NULL),
  UNIQUE (envelope_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_evidence_submission_envelope_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_evidence_submission_envelope_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_submission_envelope_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_submission_envelope_mutation();

CREATE TRIGGER privacy_external_evidence_submission_envelope_rule_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_submission_envelope_rule
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_submission_envelope_mutation();

CREATE INDEX privacy_external_evidence_submission_envelope_queue_idx
  ON mathchakchak.privacy_external_evidence_submission_envelope_contract (queue_contract_id,revision DESC);

COMMIT;
