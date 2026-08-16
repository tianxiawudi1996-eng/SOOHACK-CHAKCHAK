BEGIN;

ALTER TABLE mathchakchak.learning_path_item
  ADD COLUMN adaptive_route varchar(20) NOT NULL DEFAULT 'CORE'
    CHECK (adaptive_route IN ('REMEDIATE', 'CORE', 'EXTEND')),
  ADD COLUMN starting_hint_level smallint NOT NULL DEFAULT 1
    CHECK (starting_hint_level BETWEEN 0 AND 3),
  ADD COLUMN target_difficulty smallint NOT NULL DEFAULT 3
    CHECK (target_difficulty BETWEEN 1 AND 5),
  ADD COLUMN review_after_days smallint NOT NULL DEFAULT 3
    CHECK (review_after_days BETWEEN 1 AND 30);

ALTER TABLE mathchakchak.formula_learning_session
  ADD COLUMN adaptive_route varchar(20) NOT NULL DEFAULT 'CORE'
    CHECK (adaptive_route IN ('REMEDIATE', 'CORE', 'EXTEND')),
  ADD COLUMN starting_hint_level smallint NOT NULL DEFAULT 1
    CHECK (starting_hint_level BETWEEN 0 AND 3),
  ADD COLUMN target_difficulty smallint NOT NULL DEFAULT 3
    CHECK (target_difficulty BETWEEN 1 AND 5);

CREATE TABLE mathchakchak.adaptive_learning_decision (
  id uuid PRIMARY KEY,
  diagnostic_session_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.diagnostic_session(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  learning_path_item_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.learning_path_item(id) ON DELETE CASCADE,
  route varchar(20) NOT NULL CHECK (route IN ('REMEDIATE', 'CORE', 'EXTEND')),
  accuracy numeric(4,3) NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
  confidence numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  starting_hint_level smallint NOT NULL CHECK (starting_hint_level BETWEEN 0 AND 3),
  target_difficulty smallint NOT NULL CHECK (target_difficulty BETWEEN 1 AND 5),
  review_after_days smallint NOT NULL CHECK (review_after_days BETWEEN 1 AND 30),
  rationale_code varchar(64) NOT NULL,
  algorithm_version varchar(32) NOT NULL,
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (evidence ?| ARRAY['answer_text', 'problem_text', 'password', 'token']))
);

CREATE TABLE mathchakchak.student_topic_mastery (
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  mastery_score numeric(4,3) NOT NULL CHECK (mastery_score BETWEEN 0 AND 1),
  evidence_count integer NOT NULL DEFAULT 1 CHECK (evidence_count > 0),
  last_formula_session_id uuid REFERENCES mathchakchak.formula_learning_session(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_profile_id, topic_id)
);

CREATE INDEX adaptive_decision_student_created_idx
  ON mathchakchak.adaptive_learning_decision (student_profile_id, created_at DESC);
CREATE INDEX student_topic_mastery_updated_idx
  ON mathchakchak.student_topic_mastery (student_profile_id, updated_at DESC);

COMMIT;
