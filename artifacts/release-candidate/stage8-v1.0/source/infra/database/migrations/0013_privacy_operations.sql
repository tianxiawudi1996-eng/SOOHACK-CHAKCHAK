BEGIN;

CREATE TABLE mathchakchak.privacy_request_assignment (
  privacy_request_id uuid PRIMARY KEY REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  operator_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  status varchar(16) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','RELEASED')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  CHECK ((status='RELEASED')=(released_at IS NOT NULL))
);

CREATE TABLE mathchakchak.privacy_request_evidence (
  id uuid PRIMARY KEY,
  privacy_request_id uuid NOT NULL REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  operator_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  evidence_type varchar(32) NOT NULL CHECK (evidence_type IN ('IDENTITY_VERIFICATION','DECISION_SUPPORT','FULFILMENT')),
  evidence_reference varchar(191) NOT NULL,
  evidence_sha256 char(64) NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (privacy_request_id,evidence_type,evidence_sha256)
);

CREATE TABLE mathchakchak.privacy_request_decision (
  privacy_request_id uuid PRIMARY KEY REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  operator_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  decision varchar(16) NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  reason_code varchar(64) NOT NULL CHECK (reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX privacy_request_assignment_operator_idx
  ON mathchakchak.privacy_request_assignment (operator_user_id,status,assigned_at);
CREATE INDEX privacy_request_evidence_request_idx
  ON mathchakchak.privacy_request_evidence (privacy_request_id,created_at);

COMMIT;
