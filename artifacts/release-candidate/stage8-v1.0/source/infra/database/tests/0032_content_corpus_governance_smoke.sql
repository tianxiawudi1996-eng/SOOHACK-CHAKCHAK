BEGIN;

INSERT INTO mathchakchak.app_user(id,auth_subject,role,status)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','phase67-content-admin','ADMIN','ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mathchakchak.content_license(
  id,license_key,rights_holder_reference,agreement_reference,agreement_sha256,
  valid_from,valid_until,permitted_regions,permitted_uses,status,approved_by_user_id,approved_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','phase67-synthetic-license','RIGHTS-HOLDER-SYNTHETIC','AGREEMENT-SYNTHETIC',repeat('a',64),
  current_date-1,current_date+1,ARRAY['KR'],ARRAY['DIGITAL_LEARNING'],'ACTIVE','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',now()
);

INSERT INTO mathchakchak.content_import_batch(
  id,license_id,source_reference,manifest_sha256,expected_count,status,created_by_user_id
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','SOURCE-SYNTHETIC',repeat('b',64),1,'REGISTERED','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
);

INSERT INTO mathchakchak.content_problem(
  id,import_batch_id,license_id,external_key,grade_code,concept_key,problem_type,difficulty,
  current_revision_no,current_content_sha256,created_by_user_id
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'SYNTHETIC-ONLY-1','E4','fraction-addition','APPLICATION',6,1,repeat('c',64),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
);

INSERT INTO mathchakchak.content_problem_revision(
  id,problem_id,revision_no,locale,stem,answer_schema,solution_steps,hint_ladder,
  skill_tags,misconception_tags,content_sha256,created_by_user_id
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',1,'ko','SYNTHETIC TEST ITEM',
  '{"type":"fraction"}'::jsonb,'["step1","step2"]'::jsonb,'["hint1","hint2"]'::jsonb,
  ARRAY['fraction-addition'],ARRAY['add-denominators'],repeat('c',64),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
);

DO $$
BEGIN
  BEGIN
    UPDATE mathchakchak.content_problem
       SET publication_status='PUBLISHED',published_at=now()
     WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    RAISE EXCEPTION 'unreviewed content was published';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'CONTENT_PUBLICATION_GATE_BLOCKED' THEN RAISE; END IF;
  END;
END $$;

INSERT INTO mathchakchak.content_problem_review(
  id,problem_id,revision_no,review_type,reviewer_identity_reference,conflict_declaration,
  decision,reviewed_content_sha256,reason_code,reviewed_at
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',1,'MATH_ACCURACY','REVIEWER-MATH-01','NO_CONFLICT','APPROVE',repeat('c',64),'SYNTHETIC_PASS',now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',1,'MATH_ACCURACY','REVIEWER-MATH-02','NO_CONFLICT','APPROVE',repeat('c',64),'SYNTHETIC_PASS',now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',1,'RIGHTS_COMPLIANCE','REVIEWER-RIGHTS-01','NO_CONFLICT','APPROVE',repeat('c',64),'SYNTHETIC_PASS',now());

UPDATE mathchakchak.content_problem
   SET publication_status='PUBLISHED',published_at=now()
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM mathchakchak.content_problem
    WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4' AND publication_status='PUBLISHED'
  ) THEN RAISE EXCEPTION 'reviewed content did not publish'; END IF;
  BEGIN
    UPDATE mathchakchak.content_problem_revision
       SET stem='MUTATED'
     WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
    RAISE EXCEPTION 'published revision was mutable';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    IF SQLERRM <> 'REVIEWED_CONTENT_REVISION_IMMUTABLE' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
