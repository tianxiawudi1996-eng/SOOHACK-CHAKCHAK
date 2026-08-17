BEGIN;
DROP TABLE IF EXISTS mathchakchak.privacy_fulfilment_recovery_checkpoint;
DROP TABLE IF EXISTS mathchakchak.privacy_fulfilment_package_manifest;
DROP FUNCTION IF EXISTS mathchakchak.reject_fulfilment_package_mutation();
COMMIT;
