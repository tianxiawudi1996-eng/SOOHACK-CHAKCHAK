BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_external_reference_proof_scanner_requirement;
DROP TABLE IF EXISTS mathchakchak.privacy_external_reference_proof_scanner_readiness_contract;
DROP FUNCTION IF EXISTS mathchakchak.reject_proof_scanner_mutation();
COMMIT;
