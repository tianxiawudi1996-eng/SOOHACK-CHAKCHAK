BEGIN;

ALTER TABLE mathchakchak.app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE mathchakchak.app_user ADD CONSTRAINT app_user_role_check
  CHECK (role IN ('STUDENT','PARENT','ACADEMY_OWNER','TEACHER','ADMIN','SERVICE'));

ALTER TABLE mathchakchak.app_user DROP CONSTRAINT IF EXISTS app_user_status_check;
ALTER TABLE mathchakchak.app_user ADD CONSTRAINT app_user_status_check
  CHECK (status IN (
    'PENDING_ONBOARDING','PENDING_GUARDIAN','PENDING_ACADEMY_VERIFICATION',
    'ACTIVE','LOCKED','SUSPENDED','WITHDRAWN','DELETED'
  ));

CREATE TABLE mathchakchak.social_identity (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  provider varchar(12) NOT NULL CHECK (provider IN ('GOOGLE','NAVER','KAKAO')),
  subject_hash char(64) NOT NULL CHECK (subject_hash ~ '^[0-9a-f]{64}$'),
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  UNIQUE (provider,subject_hash),
  UNIQUE (user_id,provider)
);

CREATE TABLE mathchakchak.oauth_login_transaction (
  id uuid PRIMARY KEY,
  provider varchar(12) NOT NULL CHECK (provider IN ('GOOGLE','NAVER','KAKAO')),
  requested_role varchar(24) NOT NULL CHECK (requested_role IN ('STUDENT','PARENT','ACADEMY_OWNER','TEACHER')),
  state_hash char(64) NOT NULL UNIQUE CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  nonce_hash char(64) NOT NULL CHECK (nonce_hash ~ '^[0-9a-f]{64}$'),
  pkce_method varchar(8) NOT NULL CHECK (pkce_method IN ('S256','NONE')),
  return_to varchar(512) NOT NULL CHECK (return_to LIKE '/%' AND return_to NOT LIKE '//%'),
  locale varchar(10) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONSUMED','FAILED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (status <> 'CONSUMED' OR consumed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.auth_session (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  provider varchar(12) NOT NULL CHECK (provider IN ('GOOGLE','NAVER','KAKAO')),
  session_token_hash char(64) NOT NULL UNIQUE CHECK (session_token_hash ~ '^[0-9a-f]{64}$'),
  csrf_token_hash char(64) NOT NULL CHECK (csrf_token_hash ~ '^[0-9a-f]{64}$'),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  auth_level varchar(16) NOT NULL CHECK (auth_level IN ('ONBOARDING','FULL','MFA_PENDING')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason varchar(48),
  CHECK (idle_expires_at > created_at),
  CHECK (absolute_expires_at >= idle_expires_at),
  CHECK (status <> 'REVOKED' OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL))
);

CREATE TABLE mathchakchak.auth_role_onboarding (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  selected_role varchar(24) NOT NULL CHECK (selected_role IN ('STUDENT','PARENT','ACADEMY_OWNER','TEACHER')),
  status varchar(32) NOT NULL CHECK (status IN ('PENDING','PENDING_GUARDIAN','PENDING_ACADEMY_VERIFICATION','COMPLETED','REJECTED')),
  terms_version varchar(32),
  age_assurance varchar(24) CHECK (age_assurance IN ('NOT_APPLICABLE','AGE_14_PLUS_ATTESTED','UNDER_14_GUARDIAN_REQUIRED')),
  grade_code varchar(2) REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE RESTRICT,
  academy_reference varchar(191),
  guardian_consent_id uuid REFERENCES mathchakchak.consent_record(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (selected_role = 'STUDENT' OR (age_assurance IS NULL AND grade_code IS NULL)),
  CHECK (selected_role IN ('ACADEMY_OWNER','TEACHER') OR academy_reference IS NULL),
  CHECK (status <> 'COMPLETED' OR (terms_version IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE TABLE mathchakchak.auth_event (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE SET NULL,
  session_id uuid REFERENCES mathchakchak.auth_session(id) ON DELETE SET NULL,
  event_type varchar(48) NOT NULL CHECK (event_type IN (
    'OAUTH_STARTED','OAUTH_FAILED','SOCIAL_ACCOUNT_CREATED','SOCIAL_LOGIN_SUCCEEDED',
    'ONBOARDING_SUBMITTED','ACCOUNT_ACTIVATED','SESSION_REVOKED','ROLE_VERIFICATION_REQUIRED'
  )),
  provider varchar(12) CHECK (provider IN ('GOOGLE','NAVER','KAKAO')),
  outcome varchar(16) NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILED','PENDING')),
  reason_code varchar(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (NOT (metadata ?| ARRAY[
    'password','token','access_token','refresh_token','id_token','authorization_code',
    'email','name','phone','provider_subject'
  ]))
);

CREATE INDEX social_identity_user_idx ON mathchakchak.social_identity(user_id,provider) WHERE disabled_at IS NULL;
CREATE INDEX oauth_login_transaction_expiry_idx ON mathchakchak.oauth_login_transaction(status,expires_at);
CREATE INDEX auth_session_user_status_idx ON mathchakchak.auth_session(user_id,status,absolute_expires_at DESC);
CREATE INDEX auth_session_expiry_idx ON mathchakchak.auth_session(status,idle_expires_at,absolute_expires_at);
CREATE INDEX auth_event_user_created_idx ON mathchakchak.auth_event(user_id,created_at DESC);

CREATE OR REPLACE FUNCTION mathchakchak.prevent_auth_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'authentication events are append-only' USING ERRCODE='23514';
END $$;

CREATE TRIGGER auth_event_append_only
BEFORE UPDATE OR DELETE ON mathchakchak.auth_event
FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_auth_event_mutation();

REVOKE ALL ON
  mathchakchak.social_identity,
  mathchakchak.oauth_login_transaction,
  mathchakchak.auth_session,
  mathchakchak.auth_role_onboarding,
  mathchakchak.auth_event
FROM PUBLIC;

COMMIT;
