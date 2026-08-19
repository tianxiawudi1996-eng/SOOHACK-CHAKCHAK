BEGIN;
DROP TRIGGER IF EXISTS auth_event_append_only ON mathchakchak.auth_event;
DROP FUNCTION IF EXISTS mathchakchak.prevent_auth_event_mutation();
DROP TABLE IF EXISTS mathchakchak.auth_event;
DROP TABLE IF EXISTS mathchakchak.auth_role_onboarding;
DROP TABLE IF EXISTS mathchakchak.auth_session;
DROP TABLE IF EXISTS mathchakchak.oauth_login_transaction;
DROP TABLE IF EXISTS mathchakchak.social_identity;
ALTER TABLE mathchakchak.app_user DROP CONSTRAINT IF EXISTS app_user_status_check;
ALTER TABLE mathchakchak.app_user ADD CONSTRAINT app_user_status_check
  CHECK (status IN ('ACTIVE','LOCKED','DELETED'));
ALTER TABLE mathchakchak.app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE mathchakchak.app_user ADD CONSTRAINT app_user_role_check
  CHECK (role IN ('STUDENT','PARENT','TEACHER','ADMIN','SERVICE'));
COMMIT;
