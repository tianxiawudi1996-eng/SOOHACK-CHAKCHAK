BEGIN;

CREATE SCHEMA IF NOT EXISTS mathchakchak;

CREATE TABLE mathchakchak.app_user (
  id uuid PRIMARY KEY,
  auth_subject varchar(191) NOT NULL UNIQUE,
  role varchar(20) NOT NULL CHECK (role IN ('STUDENT', 'PARENT', 'ADMIN', 'SERVICE')),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DELETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK ((status = 'DELETED') = (deleted_at IS NOT NULL))
);

CREATE TABLE mathchakchak.user_preference (
  user_id uuid PRIMARY KEY REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  locale varchar(10) NOT NULL DEFAULT 'en' CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  timezone varchar(64) NOT NULL DEFAULT 'UTC',
  reduced_motion boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.student_profile (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  grade_band varchar(20) NOT NULL CHECK (grade_band IN ('ELEMENTARY_1_2', 'ELEMENTARY_3_4', 'ELEMENTARY_5_6')),
  curriculum_region varchar(32) NOT NULL DEFAULT 'KR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.parent_student_link (
  id uuid PRIMARY KEY,
  parent_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (parent_user_id, student_profile_id),
  CHECK (status <> 'ACTIVE' OR activated_at IS NOT NULL),
  CHECK (status <> 'REVOKED' OR revoked_at IS NOT NULL)
);

CREATE TABLE mathchakchak.consent_record (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  guardian_user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  consent_type varchar(40) NOT NULL,
  policy_version varchar(32) NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('GRANTED', 'WITHDRAWN', 'EXPIRED')),
  granted_at timestamptz NOT NULL,
  withdrawn_at timestamptz,
  evidence_reference varchar(191) NOT NULL,
  CHECK (status <> 'WITHDRAWN' OR withdrawn_at IS NOT NULL)
);

CREATE TABLE mathchakchak.topic (
  id uuid PRIMARY KEY,
  curriculum_code varchar(64) NOT NULL UNIQUE,
  grade_band varchar(20) NOT NULL,
  semantic_key varchar(191) NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.problem_item (
  id uuid PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  content_version integer NOT NULL CHECK (content_version > 0),
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  answer_schema jsonb NOT NULL,
  scoring_rule jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, content_version)
);

CREATE TABLE mathchakchak.diagnostic_session (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  locale varchar(10) NOT NULL CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  status varchar(20) NOT NULL CHECK (status IN ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.diagnostic_response (
  id uuid PRIMARY KEY,
  diagnostic_session_id uuid NOT NULL REFERENCES mathchakchak.diagnostic_session(id) ON DELETE CASCADE,
  problem_item_id uuid NOT NULL REFERENCES mathchakchak.problem_item(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  response_value jsonb NOT NULL,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('CORRECT', 'INCORRECT', 'SKIPPED')),
  duration_ms integer CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (diagnostic_session_id, sequence_no),
  UNIQUE (diagnostic_session_id, problem_item_id)
);

CREATE TABLE mathchakchak.learning_path (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  source_diagnostic_id uuid REFERENCES mathchakchak.diagnostic_session(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
  algorithm_version varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.learning_path_item (
  id uuid PRIMARY KEY,
  learning_path_id uuid NOT NULL REFERENCES mathchakchak.learning_path(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  status varchar(20) NOT NULL CHECK (status IN ('LOCKED', 'READY', 'IN_PROGRESS', 'COMPLETED')),
  UNIQUE (learning_path_id, sequence_no),
  UNIQUE (learning_path_id, topic_id)
);

CREATE TABLE mathchakchak.learning_session (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  learning_path_item_id uuid REFERENCES mathchakchak.learning_path_item(id) ON DELETE SET NULL,
  locale varchar(10) NOT NULL CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  status varchar(20) NOT NULL CHECK (status IN ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  current_step integer NOT NULL DEFAULT 1 CHECK (current_step > 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.learning_attempt (
  id uuid PRIMARY KEY,
  learning_session_id uuid NOT NULL REFERENCES mathchakchak.learning_session(id) ON DELETE CASCADE,
  problem_item_id uuid NOT NULL REFERENCES mathchakchak.problem_item(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  response_value jsonb NOT NULL,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('CORRECT', 'INCORRECT', 'SKIPPED')),
  hint_level smallint NOT NULL DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3),
  duration_ms integer CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learning_session_id, sequence_no)
);

CREATE TABLE mathchakchak.review_item (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  source_attempt_id uuid REFERENCES mathchakchak.learning_attempt(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  interval_days integer NOT NULL DEFAULT 1 CHECK (interval_days > 0),
  status varchar(20) NOT NULL CHECK (status IN ('SCHEDULED', 'DUE', 'COMPLETED', 'SUSPENDED')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_profile_id, topic_id, status)
);

CREATE TABLE mathchakchak.review_attempt (
  id uuid PRIMARY KEY,
  review_item_id uuid NOT NULL REFERENCES mathchakchak.review_item(id) ON DELETE CASCADE,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('RECALLED', 'PARTIAL', 'MISSED')),
  duration_ms integer CHECK (duration_ms >= 0),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  next_due_at timestamptz NOT NULL
);

CREATE TABLE mathchakchak.progress_snapshot (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary_metrics jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_profile_id, period_start, period_end),
  CHECK (period_end >= period_start)
);

CREATE TABLE mathchakchak.idempotency_record (
  id uuid PRIMARY KEY,
  actor_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  scope varchar(64) NOT NULL,
  idempotency_key varchar(191) NOT NULL,
  request_hash char(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  response_status smallint CHECK (response_status BETWEEN 100 AND 599),
  response_reference varchar(191),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (actor_user_id, scope, idempotency_key),
  CHECK (expires_at > created_at)
);

CREATE TABLE mathchakchak.audit_event (
  id uuid PRIMARY KEY,
  actor_user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE SET NULL,
  event_type varchar(80) NOT NULL,
  target_type varchar(80),
  target_id uuid,
  request_id varchar(80) NOT NULL,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILURE')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (metadata ?| ARRAY['answer_text', 'problem_text', 'password', 'token']))
);

CREATE INDEX diagnostic_session_student_created_idx ON mathchakchak.diagnostic_session (student_profile_id, created_at DESC);
CREATE INDEX learning_session_student_updated_idx ON mathchakchak.learning_session (student_profile_id, updated_at DESC);
CREATE INDEX learning_attempt_session_created_idx ON mathchakchak.learning_attempt (learning_session_id, created_at);
CREATE INDEX review_item_due_idx ON mathchakchak.review_item (student_profile_id, due_at) WHERE status IN ('SCHEDULED', 'DUE');
CREATE INDEX progress_snapshot_student_period_idx ON mathchakchak.progress_snapshot (student_profile_id, period_end DESC);
CREATE INDEX idempotency_record_expiry_idx ON mathchakchak.idempotency_record (expires_at);
CREATE INDEX audit_event_created_idx ON mathchakchak.audit_event (created_at DESC);

COMMIT;
