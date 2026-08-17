BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_external_reference_proof_intake_rule;
DROP TABLE IF EXISTS mathchakchak.privacy_external_reference_proof_intake_contract;
DROP FUNCTION IF EXISTS mathchakchak.reject_external_reference_proof_intake_mutation();
COMMIT;
