BEGIN;

INSERT INTO mathchakchak.app_user (id, auth_subject, role, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'staging-student-001', 'STUDENT', 'ACTIVE');

INSERT INTO mathchakchak.user_preference (user_id, locale, timezone, reduced_motion)
VALUES ('11111111-1111-4111-8111-111111111111', 'ko', 'Asia/Seoul', false);

INSERT INTO mathchakchak.student_profile (id, user_id, grade_band, curriculum_region)
VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'ELEMENTARY_5_6', 'KR');

INSERT INTO mathchakchak.topic (id, curriculum_code, grade_band, semantic_key, version)
VALUES ('33333333-3333-4333-8333-333333333333', 'KR-E5-FRACTION-ADD', 'ELEMENTARY_5_6', 'topic.fraction.addition', 1);

INSERT INTO mathchakchak.problem_item
  (id, topic_id, content_version, difficulty, answer_schema, scoring_rule)
VALUES
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 1, 2, '{"correct":{"value":"5/6"}}', '{"type":"exact"}'),
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 1, 3, '{"correct":{"value":"3/4"}}', '{"type":"exact"}'),
  ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 1, 3, '{"correct":{"value":"2/3"}}', '{"type":"exact"}');

COMMIT;
