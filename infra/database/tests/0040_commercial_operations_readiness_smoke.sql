BEGIN;
DO $$
DECLARE test_drill_id uuid := '75000000-0000-4750-8750-000000000099';
BEGIN
  IF (SELECT count(*) FROM mathchakchak.commercial_ops_protocol WHERE protocol_code='MCC-D80-10-OPS-001' AND status='DRAFT_EXTERNAL_REVIEW') <> 1 THEN
    RAISE EXCEPTION 'commercial ops protocol missing';
  END IF;
  IF (SELECT count(*) FROM mathchakchak.commercial_ops_control WHERE protocol_id='75000000-0000-4750-8750-000000000001') <> 10 THEN
    RAISE EXCEPTION 'commercial ops controls incomplete';
  END IF;
  IF (SELECT count(*) FROM mathchakchak.commercial_ops_evidence) <> 0 OR
     (SELECT count(*) FROM mathchakchak.commercial_ops_recovery_drill) <> 0 OR
     (SELECT count(*) FROM mathchakchak.commercial_ops_incident) <> 0 OR
     (SELECT count(*) FROM mathchakchak.commercial_ops_product_review) <> 0 THEN
    RAISE EXCEPTION 'synthetic commercial evidence forbidden';
  END IF;

  INSERT INTO mathchakchak.commercial_ops_recovery_drill
    (id,protocol_id,drill_type,environment_code,status,evidence_reference,evidence_sha256,started_at,completed_at,recorded_at)
  VALUES (test_drill_id,'75000000-0000-4750-8750-000000000001','BACKUP_RESTORE','LOCAL','PLANNED','SMOKE-DRILL',repeat('a',64),now(),NULL,now());
  BEGIN
    UPDATE mathchakchak.commercial_ops_recovery_drill SET status='PASS',completed_at=now() WHERE id=test_drill_id;
    RAISE EXCEPTION 'append-only recovery drill accepted mutation';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
