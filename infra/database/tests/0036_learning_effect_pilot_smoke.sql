BEGIN;
DO $$
DECLARE locked_id uuid := '71000000-0000-4710-8710-000000000901';
BEGIN
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_protocol WHERE protocol_code='MCC-D80-06-PILOT-001' AND status='DRAFT_EXTERNAL_REVIEW' AND minimum_participants=100 AND duration_weeks BETWEEN 8 AND 12) <> 1 THEN
    RAISE EXCEPTION 'pilot draft protocol missing or invalid';
  END IF;
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_cohort WHERE protocol_id='71000000-0000-4710-8710-000000000001') <> 2 THEN RAISE EXCEPTION 'pilot cohorts incomplete'; END IF;
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_metric WHERE protocol_id='71000000-0000-4710-8710-000000000001' AND preregistered) <> 8 THEN RAISE EXCEPTION 'pilot metrics incomplete'; END IF;
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_participant) <> 0 THEN RAISE EXCEPTION 'synthetic field participants are forbidden'; END IF;
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_measurement) <> 0 THEN RAISE EXCEPTION 'synthetic field measurements are forbidden'; END IF;
  IF (SELECT count(*) FROM mathchakchak.learning_effect_pilot_analysis_result) <> 0 THEN RAISE EXCEPTION 'synthetic analysis results are forbidden'; END IF;

  BEGIN
    INSERT INTO mathchakchak.learning_effect_pilot_protocol
      (id,protocol_code,status,minimum_participants,duration_weeks,assignment_method,analysis_plan_sha256,research_owner_identity_reference,ethics_reference,independent_statistician_reference,registered_at,locked_at)
    VALUES
      (locked_id,'MCC-P71-LOCK-TEST','REGISTERED_LOCKED',100,10,'INDEPENDENT_CONTROLLED_ASSIGNMENT',repeat('a',64),'OWNER-REF','ETHICS-REF','STAT-REF',now(),now());
    UPDATE mathchakchak.learning_effect_pilot_protocol SET duration_weeks=12 WHERE id=locked_id;
    RAISE EXCEPTION 'locked protocol mutation accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO mathchakchak.learning_effect_pilot_protocol
      (id,protocol_code,status,minimum_participants,duration_weeks,assignment_method,analysis_plan_sha256)
    VALUES
      ('71000000-0000-4710-8710-000000000902','MCC-P71-DURATION-TEST','DRAFT_EXTERNAL_REVIEW',100,7,'PENDING_EXTERNAL_APPROVAL',repeat('b',64));
    RAISE EXCEPTION 'invalid pilot duration accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
