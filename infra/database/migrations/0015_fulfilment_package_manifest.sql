BEGIN;

CREATE TABLE mathchakchak.privacy_fulfilment_package_manifest (
  id uuid PRIMARY KEY,
  fulfilment_plan_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_plan(id) ON DELETE RESTRICT,
  privacy_request_id uuid NOT NULL REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  request_type varchar(24) NOT NULL CHECK (request_type IN ('ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL')),
  revision integer NOT NULL CHECK (revision > 0),
  predecessor_manifest_id uuid REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  policy_version varchar(64) NOT NULL,
  execution_mode varchar(24) NOT NULL CHECK (execution_mode = 'DRY_RUN_ONLY'),
  assessment_sha256 char(64) NOT NULL CHECK (assessment_sha256 ~ '^[0-9a-f]{64}$'),
  approval_bundle_sha256 char(64) NOT NULL CHECK (approval_bundle_sha256 ~ '^[0-9a-f]{64}$'),
  manifest_payload jsonb NOT NULL,
  manifest_sha256 char(64) NOT NULL UNIQUE CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  sealed_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  sealed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > sealed_at),
  CHECK ((revision = 1 AND predecessor_manifest_id IS NULL) OR (revision > 1 AND predecessor_manifest_id IS NOT NULL)),
  UNIQUE (fulfilment_plan_id,revision),
  UNIQUE (predecessor_manifest_id)
);

CREATE TABLE mathchakchak.privacy_fulfilment_recovery_checkpoint (
  id uuid PRIMARY KEY,
  package_manifest_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.privacy_fulfilment_package_manifest(id) ON DELETE RESTRICT,
  recorded_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  recovery_mode varchar(32) NOT NULL CHECK (recovery_mode = 'NO_MUTATION_BASELINE'),
  manifest_sha256 char(64) NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  assessment_sha256 char(64) NOT NULL CHECK (assessment_sha256 ~ '^[0-9a-f]{64}$'),
  checkpoint_payload jsonb NOT NULL,
  checkpoint_sha256 char(64) NOT NULL UNIQUE CHECK (checkpoint_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION mathchakchak.reject_fulfilment_package_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'FULFILMENT_PACKAGE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER privacy_fulfilment_package_manifest_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_fulfilment_package_manifest
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_fulfilment_package_mutation();

CREATE TRIGGER privacy_fulfilment_recovery_checkpoint_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.privacy_fulfilment_recovery_checkpoint
FOR EACH ROW EXECUTE FUNCTION mathchakchak.reject_fulfilment_package_mutation();

CREATE INDEX privacy_fulfilment_package_plan_idx
  ON mathchakchak.privacy_fulfilment_package_manifest (fulfilment_plan_id,revision DESC);
CREATE INDEX privacy_fulfilment_package_expiry_idx
  ON mathchakchak.privacy_fulfilment_package_manifest (expires_at);

COMMIT;
