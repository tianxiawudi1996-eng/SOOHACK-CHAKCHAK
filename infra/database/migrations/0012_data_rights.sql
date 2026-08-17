BEGIN;

CREATE TABLE mathchakchak.privacy_request (
  id uuid PRIMARY KEY,
  requester_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  subject_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE RESTRICT,
  request_type varchar(32) NOT NULL CHECK (request_type IN (
    'ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL'
  )),
  status varchar(24) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN (
    'RECEIVED','IDENTITY_VERIFIED','IN_REVIEW','APPROVED','REJECTED','COMPLETED','CANCELLED'
  )),
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  source_channel varchar(24) NOT NULL CHECK (source_channel IN ('STUDENT_SELF_SERVICE','GUARDIAN_VERIFIED','STAFF_ASSISTED')),
  identity_assurance varchar(32) NOT NULL CHECK (identity_assurance IN ('SESSION_AUTHENTICATED','REVERIFIED','AUTHORIZED_GUARDIAN')),
  policy_version varchar(32) NOT NULL,
  decision_reason_code varchar(64),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  CHECK (requester_user_id = subject_user_id OR source_channel IN ('GUARDIAN_VERIFIED','STAFF_ASSISTED')),
  CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
  CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL)),
  CHECK (status NOT IN ('REJECTED','COMPLETED') OR decision_reason_code IS NOT NULL)
);

CREATE TABLE mathchakchak.privacy_request_event (
  id uuid PRIMARY KEY,
  privacy_request_id uuid NOT NULL REFERENCES mathchakchak.privacy_request(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE SET NULL,
  event_type varchar(32) NOT NULL CHECK (event_type IN ('RECEIVED','STATUS_CHANGED','REQUESTER_CANCELLED')),
  from_status varchar(24),
  to_status varchar(24) NOT NULL CHECK (to_status IN (
    'RECEIVED','IDENTITY_VERIFIED','IN_REVIEW','APPROVED','REJECTED','COMPLETED','CANCELLED'
  )),
  reason_code varchar(64),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((event_type = 'RECEIVED') = (from_status IS NULL)),
  CHECK (from_status IS NULL OR from_status IN (
    'RECEIVED','IDENTITY_VERIFIED','IN_REVIEW','APPROVED','REJECTED','COMPLETED','CANCELLED'
  ))
);

CREATE INDEX privacy_request_requester_submitted_idx
  ON mathchakchak.privacy_request (requester_user_id, submitted_at DESC);
CREATE INDEX privacy_request_subject_status_idx
  ON mathchakchak.privacy_request (subject_user_id, status, submitted_at DESC);
CREATE INDEX privacy_request_event_request_idx
  ON mathchakchak.privacy_request_event (privacy_request_id, occurred_at);

COMMIT;
