BEGIN;

ALTER TABLE mathchakchak.student_profile
  DROP CONSTRAINT IF EXISTS student_profile_grade_band_check;
ALTER TABLE mathchakchak.student_profile
  ADD CONSTRAINT student_profile_grade_band_check
  CHECK (grade_band IN ('ELEMENTARY_1_2','ELEMENTARY_3_4','ELEMENTARY_5_6','MIDDLE_1_3','HIGH_1_3'));
ALTER TABLE mathchakchak.student_profile
  ADD COLUMN grade_code varchar(2) NOT NULL DEFAULT 'E6'
  CHECK (grade_code IN ('E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3'));

ALTER TABLE mathchakchak.math_concept
  DROP CONSTRAINT IF EXISTS math_concept_grade_band_check;
ALTER TABLE mathchakchak.math_concept
  ADD CONSTRAINT math_concept_grade_band_check
  CHECK (grade_band IN ('ELEMENTARY_1_2','ELEMENTARY_3_4','ELEMENTARY_5_6','MIDDLE_1_3','HIGH_1_3'));

CREATE TABLE mathchakchak.curriculum_reference (
  id uuid PRIMARY KEY,
  jurisdiction varchar(32) NOT NULL,
  authority_name varchar(191) NOT NULL,
  notice_code varchar(64) NOT NULL UNIQUE,
  title varchar(191) NOT NULL,
  annex varchar(32) NOT NULL,
  official_url text NOT NULL,
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  effective_schedule jsonb NOT NULL CHECK (jsonb_typeof(effective_schedule) = 'object'),
  verified_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.curriculum_grade (
  grade_code varchar(2) PRIMARY KEY CHECK (grade_code IN ('E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3')),
  school_level varchar(16) NOT NULL CHECK (school_level IN ('ELEMENTARY','MIDDLE','HIGH')),
  grade_number smallint NOT NULL CHECK (grade_number BETWEEN 1 AND 6),
  label_ko varchar(32) NOT NULL,
  official_band varchar(32) NOT NULL,
  implementation_year smallint NOT NULL CHECK (implementation_year BETWEEN 2024 AND 2027),
  placement_basis varchar(48) NOT NULL DEFAULT 'OFFICIAL_BAND_PRODUCT_SEQUENCE',
  course_path jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(course_path) = 'array'),
  sequence_no smallint NOT NULL UNIQUE CHECK (sequence_no BETWEEN 1 AND 12)
);

CREATE TABLE mathchakchak.grade_formula_catalog (
  id uuid PRIMARY KEY,
  curriculum_reference_id uuid NOT NULL REFERENCES mathchakchak.curriculum_reference(id) ON DELETE RESTRICT,
  grade_code varchar(2) NOT NULL REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE RESTRICT,
  sequence_no smallint NOT NULL CHECK (sequence_no > 0),
  strand varchar(32) NOT NULL CHECK (strand IN ('NUMBER_OPERATION','CHANGE_RELATION','GEOMETRY_MEASURE','DATA_CHANCE')),
  knowledge_type varchar(16) NOT NULL CHECK (knowledge_type IN ('RELATION','RULE','FORMULA')),
  semantic_key varchar(191) NOT NULL UNIQUE,
  title_ko varchar(191) NOT NULL,
  notation varchar(500) NOT NULL,
  explanation_ko text NOT NULL,
  source_standard_codes jsonb NOT NULL CHECK (jsonb_typeof(source_standard_codes) = 'array' AND jsonb_array_length(source_standard_codes) > 0),
  course_name varchar(64),
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_code, sequence_no)
);

CREATE TABLE mathchakchak.formula_explanation_revision (
  id uuid PRIMARY KEY,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  locale varchar(10) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  explanation text NOT NULL,
  derivation_steps jsonb NOT NULL CHECK (jsonb_typeof(derivation_steps) = 'array'),
  misconception_notes jsonb NOT NULL CHECK (jsonb_typeof(misconception_notes) = 'array'),
  chakchaki_strategy text NOT NULL,
  gongsickyi_strategy text NOT NULL,
  verification_status varchar(24) NOT NULL CHECK (verification_status IN ('SOURCE_ALIGNED','TRANSLATION_REVIEW_REQUIRED','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formula_catalog_id, revision_no, locale)
);

CREATE TABLE mathchakchak.character_collaboration_policy (
  policy_version varchar(32) NOT NULL,
  phase_no smallint NOT NULL CHECK (phase_no BETWEEN 1 AND 5),
  phase_code varchar(32) NOT NULL,
  lead_character varchar(16) NOT NULL CHECK (lead_character IN ('CHAKCHAKI','GONGSICKYI','BOTH')),
  support_character varchar(16) CHECK (support_character IN ('CHAKCHAKI','GONGSICKYI')),
  objective_ko text NOT NULL,
  handoff_condition varchar(191) NOT NULL,
  PRIMARY KEY (policy_version, phase_no),
  UNIQUE (policy_version, phase_code)
);

CREATE TABLE mathchakchak.formula_collaboration_session (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  adaptive_route varchar(20) NOT NULL CHECK (adaptive_route IN ('REMEDIATE','CORE','EXTEND')),
  policy_version varchar(32) NOT NULL,
  current_phase_no smallint NOT NULL DEFAULT 1 CHECK (current_phase_no BETWEEN 1 AND 5),
  status varchar(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','ABANDONED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grade_formula_catalog_lookup_idx ON mathchakchak.grade_formula_catalog (grade_code, sequence_no) WHERE active = true;
CREATE INDEX formula_explanation_revision_latest_idx ON mathchakchak.formula_explanation_revision (formula_catalog_id, locale, revision_no DESC);
CREATE INDEX formula_collaboration_student_idx ON mathchakchak.formula_collaboration_session (student_profile_id, created_at DESC);

COMMIT;
