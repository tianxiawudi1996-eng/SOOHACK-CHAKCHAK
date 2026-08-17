BEGIN;

CREATE TABLE mathchakchak.formula_application_item (
  id uuid PRIMARY KEY,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE CASCADE,
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 3),
  assessment_kind varchar(32) NOT NULL CHECK (assessment_kind IN ('CALCULATION','WORD_PROBLEM','UNIT_REASONING','REPRESENTATION_REASONING')),
  prompt_ko text NOT NULL,
  response_type varchar(16) NOT NULL CHECK (response_type IN ('NUMBER','FRACTION','TEXT')),
  answer_schema jsonb NOT NULL CHECK (answer_schema ? 'accepted_values'),
  misconception_rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(misconception_rules)='array'),
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version>0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formula_catalog_id,sequence_no,content_version)
);

CREATE TABLE mathchakchak.formula_application_attempt (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  application_item_id uuid NOT NULL REFERENCES mathchakchak.formula_application_item(id) ON DELETE RESTRICT,
  collaboration_session_id uuid NOT NULL REFERENCES mathchakchak.formula_collaboration_session(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  outcome varchar(16) NOT NULL CHECK (outcome IN ('CORRECT','INCORRECT')),
  misconception_code varchar(80),
  duration_ms integer CHECK (duration_ms BETWEEN 0 AND 3600000),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.student_formula_application_progress (
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  attempted_items smallint NOT NULL DEFAULT 0 CHECK (attempted_items BETWEEN 0 AND 3),
  correct_items smallint NOT NULL DEFAULT 0 CHECK (correct_items BETWEEN 0 AND attempted_items),
  application_mastery_score numeric(5,4) NOT NULL CHECK (application_mastery_score BETWEEN 0 AND 1),
  mastered boolean NOT NULL DEFAULT false,
  next_review_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_profile_id,formula_catalog_id)
);

CREATE INDEX formula_application_active_idx ON mathchakchak.formula_application_item (formula_catalog_id,sequence_no) WHERE active=true;
CREATE INDEX formula_application_attempt_latest_idx ON mathchakchak.formula_application_attempt (student_profile_id,application_item_id,attempted_at DESC);
CREATE INDEX formula_application_review_due_idx ON mathchakchak.student_formula_application_progress (student_profile_id,next_review_at);

COMMIT;
