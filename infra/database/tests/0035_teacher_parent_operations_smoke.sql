BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM mathchakchak.teacher_student_link WHERE status='ACTIVE') < 1 THEN RAISE EXCEPTION 'active teacher link missing'; END IF;
  IF (SELECT count(*) FROM mathchakchak.parent_student_link WHERE parent_user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND status='ACTIVE') <> 1 THEN RAISE EXCEPTION 'active parent link missing'; END IF;
  IF (SELECT count(*) FROM mathchakchak.consent_record WHERE evidence_reference='LOCAL-SYNTHETIC-PARENT-CONSENT-P70' AND status='GRANTED') <> 1 THEN RAISE EXCEPTION 'parent report consent missing'; END IF;
  BEGIN
    INSERT INTO mathchakchak.academy_learning_assignment(id,student_profile_id,curriculum_id,assigned_by_user_id,due_at)
    SELECT gen_random_uuid(),'22222222-2222-4222-8222-222222222222',id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()-interval '1 day'
    FROM mathchakchak.academy_track_curriculum LIMIT 1;
    RAISE EXCEPTION 'past due assignment accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
