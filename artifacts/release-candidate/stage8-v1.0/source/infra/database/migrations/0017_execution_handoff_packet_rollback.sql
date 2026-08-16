BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_execution_handoff_requirement;
DROP TABLE IF EXISTS mathchakchak.privacy_execution_handoff_packet;
DROP FUNCTION IF EXISTS mathchakchak.reject_execution_handoff_mutation();
COMMIT;
