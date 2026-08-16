BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_external_evidence_validation_rule;
DROP TABLE IF EXISTS mathchakchak.privacy_external_evidence_validation_contract;
DROP FUNCTION IF EXISTS mathchakchak.reject_external_evidence_validation_mutation();
COMMIT;
