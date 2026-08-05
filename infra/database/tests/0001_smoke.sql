BEGIN;

DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT count(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'mathchakchak' AND table_type = 'BASE TABLE';
  IF table_count <> 18 THEN
    RAISE EXCEPTION 'expected 18 tables, found %', table_count;
  END IF;
END
$$;

INSERT INTO mathchakchak.app_user (id, auth_subject, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'smoke-student', 'STUDENT');

INSERT INTO mathchakchak.user_preference (user_id, locale, timezone)
VALUES ('00000000-0000-0000-0000-000000000001', 'ko', 'Asia/Seoul');

DO $$
BEGIN
  BEGIN
    UPDATE mathchakchak.user_preference
    SET locale = 'xx'
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'unsupported locale was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

INSERT INTO mathchakchak.idempotency_record (
  id, actor_user_id, scope, idempotency_key, request_hash, expires_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'diagnostic.complete',
  'smoke-key',
  repeat('a', 64),
  now() + interval '24 hours'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO mathchakchak.idempotency_record (
      id, actor_user_id, scope, idempotency_key, request_hash, expires_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001',
      'diagnostic.complete',
      'smoke-key',
      repeat('b', 64),
      now() + interval '24 hours'
    );
    RAISE EXCEPTION 'duplicate idempotency key was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO mathchakchak.audit_event (
      id, event_type, request_id, outcome, metadata
    ) VALUES (
      '00000000-0000-0000-0000-000000000004',
      'smoke.denied',
      'smoke-request',
      'SUCCESS',
      '{"answer_text":"must not persist"}'::jsonb
    );
    RAISE EXCEPTION 'sensitive audit metadata was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

ROLLBACK;
