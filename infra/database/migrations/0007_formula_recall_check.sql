BEGIN;

CREATE TABLE mathchakchak.formula_recall_item (
  id uuid PRIMARY KEY,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE CASCADE,
  prompt_ko text NOT NULL,
  choices jsonb NOT NULL CHECK (jsonb_typeof(choices)='array' AND jsonb_array_length(choices)=4),
  answer_schema jsonb NOT NULL CHECK (answer_schema ? 'correct'),
  assessment_kind varchar(24) NOT NULL DEFAULT 'FORMULA_RECOGNITION' CHECK (assessment_kind='FORMULA_RECOGNITION'),
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version>0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formula_catalog_id, content_version)
);

CREATE TABLE mathchakchak.formula_recall_attempt (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  recall_item_id uuid NOT NULL REFERENCES mathchakchak.formula_recall_item(id) ON DELETE RESTRICT,
  collaboration_session_id uuid NOT NULL REFERENCES mathchakchak.formula_collaboration_session(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  outcome varchar(16) NOT NULL CHECK (outcome IN ('CORRECT','INCORRECT')),
  duration_ms integer CHECK (duration_ms BETWEEN 0 AND 3600000),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.student_formula_recall_progress (
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  total_attempts integer NOT NULL DEFAULT 0 CHECK (total_attempts>=0),
  correct_attempts integer NOT NULL DEFAULT 0 CHECK (correct_attempts BETWEEN 0 AND total_attempts),
  recall_score numeric(5,4) NOT NULL CHECK (recall_score BETWEEN 0 AND 1),
  latest_outcome varchar(16) NOT NULL CHECK (latest_outcome IN ('CORRECT','INCORRECT')),
  next_review_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_profile_id,formula_catalog_id)
);

CREATE INDEX formula_recall_active_idx ON mathchakchak.formula_recall_item (formula_catalog_id) WHERE active=true;
CREATE INDEX formula_recall_attempt_student_idx ON mathchakchak.formula_recall_attempt (student_profile_id,attempted_at DESC);
CREATE INDEX formula_recall_review_due_idx ON mathchakchak.student_formula_recall_progress (student_profile_id,next_review_at);

COMMIT;
