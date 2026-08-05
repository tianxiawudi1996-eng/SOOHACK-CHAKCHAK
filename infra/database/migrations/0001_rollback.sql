BEGIN;

DROP TABLE IF EXISTS mathchakchak.audit_event;
DROP TABLE IF EXISTS mathchakchak.idempotency_record;
DROP TABLE IF EXISTS mathchakchak.progress_snapshot;
DROP TABLE IF EXISTS mathchakchak.review_attempt;
DROP TABLE IF EXISTS mathchakchak.review_item;
DROP TABLE IF EXISTS mathchakchak.learning_attempt;
DROP TABLE IF EXISTS mathchakchak.learning_session;
DROP TABLE IF EXISTS mathchakchak.learning_path_item;
DROP TABLE IF EXISTS mathchakchak.learning_path;
DROP TABLE IF EXISTS mathchakchak.diagnostic_response;
DROP TABLE IF EXISTS mathchakchak.diagnostic_session;
DROP TABLE IF EXISTS mathchakchak.problem_item;
DROP TABLE IF EXISTS mathchakchak.topic;
DROP TABLE IF EXISTS mathchakchak.consent_record;
DROP TABLE IF EXISTS mathchakchak.parent_student_link;
DROP TABLE IF EXISTS mathchakchak.student_profile;
DROP TABLE IF EXISTS mathchakchak.user_preference;
DROP TABLE IF EXISTS mathchakchak.app_user;
DROP SCHEMA IF EXISTS mathchakchak;

COMMIT;
