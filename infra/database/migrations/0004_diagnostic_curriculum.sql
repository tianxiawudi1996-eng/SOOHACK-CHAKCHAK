BEGIN;

CREATE TABLE mathchakchak.diagnostic_item_localization (
  problem_item_id uuid NOT NULL REFERENCES mathchakchak.problem_item(id) ON DELETE CASCADE,
  locale varchar(10) NOT NULL CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 20),
  prompt text NOT NULL CHECK (length(trim(prompt)) > 0),
  choices jsonb NOT NULL CHECK (jsonb_typeof(choices) = 'array' AND jsonb_array_length(choices) BETWEEN 2 AND 6),
  PRIMARY KEY (problem_item_id, locale),
  UNIQUE (locale, sequence_no)
);

CREATE TABLE mathchakchak.local_demo_learning_handoff (
  id uuid PRIMARY KEY,
  code_hash char(64) NOT NULL UNIQUE CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  learning_path_item_id uuid NOT NULL REFERENCES mathchakchak.learning_path_item(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX local_demo_handoff_expiry_idx
  ON mathchakchak.local_demo_learning_handoff (expires_at)
  WHERE consumed_at IS NULL;

COMMIT;
