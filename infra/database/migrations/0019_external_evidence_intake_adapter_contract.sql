BEGIN;

CREATE TABLE mathchakchak.privacy_external_evidence_intake_adapter_contract (
  id uuid PRIMARY KEY,
  validation_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_validation_contract(id) ON DELETE RESTRICT,
  package_manifest_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_contract_id uuid REFERENCES mathchakchak.privacy_external_evidence_intake_adapter_contract(id) ON DELETE RESTRICT,
  schema_version varchar(16) NOT NULL CHECK (schema_version = '1.0.0'),
  status varchar(56) NOT NULL CHECK (status = 'CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING'),
  contract_manifest jsonb NOT NULL,
  contract_sha256 char(64) NOT NULL CHECK (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  kill_switch_engaged boolean NOT NULL DEFAULT true CHECK (kill_switch_engaged = true),
  execution_authorized boolean NOT NULL DEFAULT false CHECK (execution_authorized = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((revision = 1 AND predecessor_contract_id IS NULL) OR (revision > 1 AND predecessor_contract_id IS NOT NULL)),
  UNIQUE (validation_contract_id,revision),
  UNIQUE (predecessor_contract_id)
);

CREATE TABLE mathchakchak.privacy_external_evidence_intake_port (
  id uuid PRIMARY KEY,
  intake_adapter_contract_id uuid NOT NULL REFERENCES mathchakchak.privacy_external_evidence_intake_adapter_contract(id) ON DELETE RESTRICT,
  control_key varchar(48) NOT NULL CHECK (control_key IN (
    'MANAGED_IDENTITY','JIT_AUTHORIZATION','BACKUP_RESTORE_EVIDENCE',
    'CHANGE_WINDOW','KILL_SWITCH_RELEASE_AUTHORITY','AUDIT_EXPORT_ROUTE'
  )),
  port_status varchar(24) NOT NULL CHECK (port_status = 'MISSING_EXTERNAL'),
  endpoint_reference varchar(191),
  transport_identity_reference varchar(191),
  network_connection_enabled boolean NOT NULL DEFAULT false CHECK (network_connection_enabled = false),
  mtls_required boolean NOT NULL DEFAULT true CHECK (mtls_required = true),
  transport_policy_status varchar(24) NOT NULL CHECK (transport_policy_status = 'MISSING_EXTERNAL'),
  signature_verification_required boolean NOT NULL DEFAULT true CHECK (signature_verification_required = true),
  signature_policy_status varchar(24) NOT NULL CHECK (signature_policy_status = 'MISSING_EXTERNAL'),
  accepted_signature_algorithms jsonb NOT NULL CHECK (accepted_signature_algorithms = '[]'::jsonb),
  trusted_issuer_list_status varchar(24) NOT NULL CHECK (trusted_issuer_list_status = 'MISSING_EXTERNAL'),
  trusted_issuer_count integer NOT NULL DEFAULT 0 CHECK (trusted_issuer_count = 0),
  replay_guard_required boolean NOT NULL DEFAULT true CHECK (replay_guard_required = true),
  submission_id_required boolean NOT NULL DEFAULT true CHECK (submission_id_required = true),
  content_hash_required boolean NOT NULL DEFAULT true CHECK (content_hash_required = true),
  replay_window_status varchar(24) NOT NULL CHECK (replay_window_status = 'MISSING_EXTERNAL'),
  replay_window_seconds integer,
  quarantine_required boolean NOT NULL DEFAULT true CHECK (quarantine_required = true),
  quarantine_route_status varchar(24) NOT NULL CHECK (quarantine_route_status = 'MISSING_EXTERNAL'),
  automatic_release_allowed boolean NOT NULL DEFAULT false CHECK (automatic_release_allowed = false),
  reprocess_dual_approval_required boolean NOT NULL DEFAULT true CHECK (reprocess_dual_approval_required = true),
  retry_policy_status varchar(24) NOT NULL CHECK (retry_policy_status = 'MISSING_EXTERNAL'),
  dead_letter_route_status varchar(24) NOT NULL CHECK (dead_letter_route_status = 'MISSING_EXTERNAL'),
  raw_payload_storage_allowed boolean NOT NULL DEFAULT false CHECK (raw_payload_storage_allowed = false),
  CHECK (endpoint_reference IS NULL),
  CHECK (transport_identity_reference IS NULL),
  CHECK (replay_window_seconds IS NULL),
  UNIQUE (intake_adapter_contract_id,control_key)
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_external_evidence_intake_adapter_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXTERNAL_EVIDENCE_INTAKE_ADAPTER_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_external_evidence_intake_adapter_contract_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_intake_adapter_contract
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_intake_adapter_mutation();

CREATE TRIGGER privacy_external_evidence_intake_port_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_external_evidence_intake_port
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_external_evidence_intake_adapter_mutation();

CREATE INDEX privacy_external_evidence_intake_adapter_validation_idx
  ON mathchakchak.privacy_external_evidence_intake_adapter_contract (validation_contract_id,revision DESC);

COMMIT;
