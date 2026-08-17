BEGIN;

CREATE TABLE mathchakchak.math_concept (
  id uuid PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES mathchakchak.topic(id) ON DELETE RESTRICT,
  semantic_key varchar(191) NOT NULL UNIQUE,
  grade_band varchar(20) NOT NULL CHECK (grade_band IN ('ELEMENTARY_1_2', 'ELEMENTARY_3_4', 'ELEMENTARY_5_6')),
  content_version integer NOT NULL CHECK (content_version > 0),
  prerequisite_keys jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(prerequisite_keys) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.formula_definition (
  id uuid PRIMARY KEY,
  concept_id uuid NOT NULL REFERENCES mathchakchak.math_concept(id) ON DELETE RESTRICT,
  semantic_key varchar(191) NOT NULL UNIQUE,
  notation varchar(500) NOT NULL,
  variable_definitions jsonb NOT NULL CHECK (jsonb_typeof(variable_definitions) = 'object'),
  derivation_steps jsonb NOT NULL CHECK (jsonb_typeof(derivation_steps) = 'array'),
  misconception_rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(misconception_rules) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.formula_localization (
  formula_id uuid NOT NULL REFERENCES mathchakchak.formula_definition(id) ON DELETE CASCADE,
  locale varchar(10) NOT NULL CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  title varchar(191) NOT NULL,
  plain_language text NOT NULL,
  memory_cue text NOT NULL,
  worked_example_intro text NOT NULL,
  PRIMARY KEY (formula_id, locale)
);

CREATE TABLE mathchakchak.worked_example (
  id uuid PRIMARY KEY,
  formula_id uuid NOT NULL REFERENCES mathchakchak.formula_definition(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  problem_context jsonb NOT NULL CHECK (jsonb_typeof(problem_context) = 'object'),
  solution_steps jsonb NOT NULL CHECK (jsonb_typeof(solution_steps) = 'array'),
  final_answer jsonb NOT NULL CHECK (jsonb_typeof(final_answer) = 'object'),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (formula_id, sequence_no)
);

CREATE TABLE mathchakchak.lesson_definition (
  id uuid PRIMARY KEY,
  concept_id uuid NOT NULL REFERENCES mathchakchak.math_concept(id) ON DELETE RESTRICT,
  semantic_key varchar(191) NOT NULL,
  content_version integer NOT NULL CHECK (content_version > 0),
  mastery_threshold numeric(4,3) NOT NULL DEFAULT 0.800 CHECK (mastery_threshold BETWEEN 0 AND 1),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semantic_key, content_version)
);

CREATE TABLE mathchakchak.lesson_step (
  id uuid PRIMARY KEY,
  lesson_definition_id uuid NOT NULL REFERENCES mathchakchak.lesson_definition(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL CHECK (sequence_no BETWEEN 1 AND 5),
  stage varchar(20) NOT NULL CHECK (stage IN ('UNDERSTAND', 'CONNECT', 'REPEAT', 'RECALL', 'APPLY')),
  interaction_type varchar(30) NOT NULL CHECK (interaction_type IN ('CONCEPT_CHOICE', 'VISUAL_CHOICE', 'GUIDED_FRACTION', 'FORMULA_RECALL', 'APPLICATION_FRACTION')),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  expected_response jsonb NOT NULL CHECK (jsonb_typeof(expected_response) = 'object'),
  scoring_rule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scoring_rule) = 'object'),
  hint_ladder jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(hint_ladder) = 'array'),
  UNIQUE (lesson_definition_id, sequence_no),
  UNIQUE (lesson_definition_id, stage)
);

CREATE TABLE mathchakchak.formula_learning_session (
  id uuid PRIMARY KEY,
  learning_session_id uuid NOT NULL REFERENCES mathchakchak.learning_session(id) ON DELETE CASCADE,
  lesson_definition_id uuid NOT NULL REFERENCES mathchakchak.lesson_definition(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  locale varchar(10) NOT NULL CHECK (locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')),
  status varchar(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  current_step_no integer NOT NULL DEFAULT 1 CHECK (current_step_no BETWEEN 1 AND 6),
  mastery_score numeric(4,3) NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learning_session_id, lesson_definition_id),
  CHECK (status <> 'COMPLETED' OR (completed_at IS NOT NULL AND current_step_no = 6))
);

CREATE TABLE mathchakchak.formula_learning_response (
  id uuid PRIMARY KEY,
  formula_learning_session_id uuid NOT NULL REFERENCES mathchakchak.formula_learning_session(id) ON DELETE CASCADE,
  lesson_step_id uuid NOT NULL REFERENCES mathchakchak.lesson_step(id) ON DELETE RESTRICT,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  response_value jsonb NOT NULL,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('CORRECT', 'INCORRECT')),
  misconception_code varchar(80),
  hint_level smallint NOT NULL DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3),
  duration_ms integer CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formula_learning_session_id, lesson_step_id, attempt_no)
);

CREATE INDEX formula_definition_concept_idx ON mathchakchak.formula_definition (concept_id) WHERE active = true;
CREATE INDEX lesson_definition_concept_idx ON mathchakchak.lesson_definition (concept_id, content_version DESC) WHERE active = true;
CREATE INDEX formula_learning_session_student_idx ON mathchakchak.formula_learning_session (student_profile_id, updated_at DESC);
CREATE INDEX formula_learning_response_session_idx ON mathchakchak.formula_learning_response (formula_learning_session_id, created_at);

COMMIT;
