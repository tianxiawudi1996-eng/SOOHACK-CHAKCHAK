BEGIN;
INSERT INTO mathchakchak.app_user(id,auth_subject,role,status) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','local-teacher-001','TEACHER','ACTIVE'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','local-parent-001','PARENT','ACTIVE')
ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,status='ACTIVE',deleted_at=NULL,updated_at=now();

INSERT INTO mathchakchak.teacher_student_link(id,teacher_user_id,student_profile_id,scope,status,activated_at)
VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','ACADEMY_COACH','ACTIVE',now())
ON CONFLICT (teacher_user_id,student_profile_id) DO UPDATE SET status='ACTIVE',activated_at=COALESCE(mathchakchak.teacher_student_link.activated_at,now()),revoked_at=NULL;

INSERT INTO mathchakchak.parent_student_link(id,parent_user_id,student_profile_id,status,activated_at)
VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','ACTIVE',now())
ON CONFLICT (parent_user_id,student_profile_id) DO UPDATE SET status='ACTIVE',activated_at=COALESCE(mathchakchak.parent_student_link.activated_at,now()),revoked_at=NULL;

INSERT INTO mathchakchak.consent_record(id,subject_user_id,guardian_user_id,consent_type,policy_version,status,granted_at,evidence_reference)
SELECT 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','LEARNING_PROGRESS_REPORT','local-p70-v1','GRANTED',now(),'LOCAL-SYNTHETIC-PARENT-CONSENT-P70'
WHERE NOT EXISTS(SELECT 1 FROM mathchakchak.consent_record WHERE evidence_reference='LOCAL-SYNTHETIC-PARENT-CONSENT-P70');
COMMIT;
