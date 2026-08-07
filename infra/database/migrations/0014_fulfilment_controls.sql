BEGIN;

CREATE TABLE mathchakchak.privacy_operator_authorization (
  user_id uuid PRIMARY KEY REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  operation_role varchar(24) NOT NULL CHECK (operation_role IN ('OPERATOR','PRIVACY_APPROVER','SECURITY_APPROVER')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.privacy_fulfilment_plan (
  id uuid PRIMARY KEY,
  privacy_request_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  request_type varchar(32) NOT NULL CHECK (request_type IN ('ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL')),
  status varchar(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IMPACT_ASSESSED','DUAL_APPROVED','INVALIDATED')),
  execution_mode varchar(20) NOT NULL DEFAULT 'DRY_RUN_ONLY' CHECK (execution_mode='DRY_RUN_ONLY'),
  policy_version varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.privacy_impact_assessment (
  fulfilment_plan_id uuid PRIMARY KEY REFERENCES mathchakchak.privacy_fulfilment_plan(id) ON DELETE RESTRICT,
  assessed_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  profile_rows integer NOT NULL CHECK (profile_rows>=0),
  diagnostic_sessions integer NOT NULL CHECK (diagnostic_sessions>=0),
  learning_sessions integer NOT NULL CHECK (learning_sessions>=0),
  review_items integer NOT NULL CHECK (review_items>=0),
  formula_sessions integer NOT NULL CHECK (formula_sessions>=0),
  preserved_privacy_records integer NOT NULL CHECK (preserved_privacy_records>=0),
  active_legal_hold boolean NOT NULL,
  assessment_sha256 char(64) NOT NULL CHECK (assessment_sha256 ~ '^[0-9a-f]{64}$'),
  assessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.privacy_legal_hold (
  id uuid PRIMARY KEY,
  privacy_request_id uuid NOT NULL REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RELEASED')),
  reason_code varchar(64) NOT NULL CHECK (reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  set_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  set_at timestamptz NOT NULL DEFAULT now(),
  released_by_user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  release_reason_code varchar(64) CHECK (release_reason_code IS NULL OR release_reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  released_at timestamptz,
  CHECK ((status='RELEASED')=(released_at IS NOT NULL)),
  CHECK ((status='RELEASED')=(released_by_user_id IS NOT NULL)),
  CHECK ((status='RELEASED')=(release_reason_code IS NOT NULL))
);

CREATE UNIQUE INDEX privacy_legal_hold_one_active_idx
  ON mathchakchak.privacy_legal_hold (privacy_request_id) WHERE status='ACTIVE';

CREATE TABLE mathchakchak.privacy_fulfilment_approval (
  id uuid PRIMARY KEY,
  fulfilment_plan_id uuid NOT NULL REFERENCES mathchakchak.privacy_fulfilment_plan(id) ON DELETE RESTRICT,
  approver_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  approval_role varchar(24) NOT NULL CHECK (approval_role IN ('PRIVACY_APPROVER','SECURITY_APPROVER')),
  decision varchar(16) NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  reason_code varchar(64) NOT NULL CHECK (reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fulfilment_plan_id,approval_role),
  UNIQUE (fulfilment_plan_id,approver_user_id)
);

CREATE INDEX privacy_fulfilment_plan_status_idx ON mathchakchak.privacy_fulfilment_plan (status,created_at);
CREATE INDEX privacy_fulfilment_approval_plan_idx ON mathchakchak.privacy_fulfilment_approval (fulfilment_plan_id,decided_at);

COMMIT;
