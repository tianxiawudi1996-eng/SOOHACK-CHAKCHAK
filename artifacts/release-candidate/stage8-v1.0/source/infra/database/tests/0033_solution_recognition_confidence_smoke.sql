BEGIN;

INSERT INTO mathchakchak.solution_capture
  (id,student_profile_id,source_type,status)
VALUES
  ('68000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','HANDWRITING_IMAGE','TEACHER_REVIEW_REQUIRED');

INSERT INTO mathchakchak.solution_recognition_evaluation
  (id,capture_id,provider_reference,provider_verified,candidate_count,valid_candidate_count,
   candidate_hashes,top_confidence,confidence_margin,image_quality,math_consistency,
   step_continuity,decision,reason_codes)
VALUES
  ('68000000-0000-4000-8000-000000000002','68000000-0000-4000-8000-000000000001',
   'SMOKE_PROVIDER',true,1,1,'["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]',
   0.9900,0.9900,0.9500,0.4000,0.9000,'TEACHER_REVIEW_REQUIRED',ARRAY['MATH_CONSISTENCY_LOW']);

DO $$
BEGIN
  IF (SELECT count(*) FROM mathchakchak.solution_review_queue WHERE evaluation_id='68000000-0000-4000-8000-000000000002') <> 1 THEN
    RAISE EXCEPTION 'teacher review queue was not created';
  END IF;
  BEGIN
    INSERT INTO mathchakchak.solution_capture(id,student_profile_id,source_type,raw_asset_persisted,status)
    VALUES('68000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','CAMERA_IMAGE',true,'RECEIVED');
    RAISE EXCEPTION 'raw asset check did not fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE mathchakchak.solution_recognition_evaluation SET automatic_scoring_allowed=true
    WHERE id='68000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'automatic scoring check did not fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

ROLLBACK;
