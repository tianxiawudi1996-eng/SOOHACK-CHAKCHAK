BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_execution_readiness_control;
DROP TABLE IF EXISTS mathchakchak.privacy_execution_readiness_review;
DROP FUNCTION IF EXISTS mathchakchak.reject_execution_readiness_mutation();
COMMIT;
