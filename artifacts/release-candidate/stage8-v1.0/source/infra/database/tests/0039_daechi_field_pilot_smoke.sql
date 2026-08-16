BEGIN;
DO $$
DECLARE test_result_id uuid := '74000000-0000-4740-8740-000000000099';
BEGIN
  IF (SELECT count(*) FROM mathchakchak.daechi_field_pilot_protocol WHERE protocol_code='MCC-D80-09-FIELD-001' AND status='DRAFT_EXTERNAL_REVIEW') <> 1 THEN
    RAISE EXCEPTION 'field pilot protocol missing';
  END IF;
  IF (SELECT count(*) FROM mathchakchak.daechi_field_pilot_metric WHERE protocol_id='74000000-0000-4740-8740-000000000001') <> 6 THEN
    RAISE EXCEPTION 'field pilot metrics incomplete';
  END IF;
  IF (SELECT count(*) FROM mathchakchak.daechi_field_pilot_academy) <> 0 OR
     (SELECT count(*) FROM mathchakchak.daechi_field_pilot_observation) <> 0 OR
     (SELECT count(*) FROM mathchakchak.daechi_field_pilot_result) <> 0 OR
     (SELECT count(*) FROM mathchakchak.daechi_field_pilot_product_review) <> 0 THEN
    RAISE EXCEPTION 'synthetic field evidence forbidden';
  END IF;

  INSERT INTO mathchakchak.daechi_field_pilot_result
    (id,protocol_id,status,academy_count,observed_week_count,enrolled_student_count,consented_student_count,
     teacher_operator_count,parent_respondent_count,dataset_sha256,report_sha256,
     independent_reviewer_identity_reference,independent_result_reference)
  VALUES
    (test_result_id,'74000000-0000-4740-8740-000000000001','DRAFT_INDEPENDENT_REVIEW',2,4,10,10,2,8,
     repeat('a',64),repeat('b',64),'SMOKE-INDEPENDENT-REVIEWER','SMOKE-RESULT-REFERENCE');
  BEGIN
    UPDATE mathchakchak.daechi_field_pilot_result SET academy_count=3 WHERE id=test_result_id;
    RAISE EXCEPTION 'append-only result accepted mutation';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
