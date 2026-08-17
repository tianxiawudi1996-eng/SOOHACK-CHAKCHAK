BEGIN;

CREATE TABLE mathchakchak.academy_track_curriculum (
  id uuid PRIMARY KEY,
  grade_code varchar(2) NOT NULL REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE RESTRICT,
  track_code varchar(32) NOT NULL CHECK (track_code IN ('CONCEPT_RECOVERY','SCHOOL_EXAM','ADVANCED_REASONING','CONTEST_BRIDGE')),
  curriculum_version integer NOT NULL CHECK (curriculum_version > 0),
  sessions_per_week smallint NOT NULL CHECK (sessions_per_week BETWEEN 1 AND 7),
  concept_percent smallint NOT NULL CHECK (concept_percent BETWEEN 0 AND 100),
  standard_percent smallint NOT NULL CHECK (standard_percent BETWEEN 0 AND 100),
  advanced_percent smallint NOT NULL CHECK (advanced_percent BETWEEN 0 AND 100),
  objective_codes jsonb NOT NULL CHECK (jsonb_typeof(objective_codes)='array' AND jsonb_array_length(objective_codes)>0),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  environment_scope varchar(24) NOT NULL DEFAULT 'LOCAL_SYNTHETIC' CHECK (environment_scope='LOCAL_SYNTHETIC'),
  expert_review_status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (expert_review_status IN ('PENDING','APPROVED','REJECTED')),
  license_gate_status varchar(24) NOT NULL DEFAULT 'BLOCKED_EXTERNAL' CHECK (license_gate_status IN ('BLOCKED_EXTERNAL','VERIFIED')),
  runtime_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_code,track_code,curriculum_version),
  CHECK (concept_percent + standard_percent + advanced_percent = 100),
  CHECK (environment_scope='LOCAL_SYNTHETIC' OR (expert_review_status='APPROVED' AND license_gate_status='VERIFIED'))
);

CREATE TABLE mathchakchak.academy_track_formula_assignment (
  id uuid PRIMARY KEY,
  curriculum_id uuid NOT NULL REFERENCES mathchakchak.academy_track_curriculum(id) ON DELETE CASCADE,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 12),
  assignment_purpose varchar(24) NOT NULL CHECK (assignment_purpose IN ('FOUNDATION','CORE','TRANSFER','STRETCH')),
  required_recall_attempts smallint NOT NULL CHECK (required_recall_attempts BETWEEN 1 AND 10),
  required_application_items smallint NOT NULL CHECK (required_application_items BETWEEN 1 AND 3),
  minimum_collaboration_score numeric(5,4) NOT NULL CHECK (minimum_collaboration_score BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curriculum_id,formula_catalog_id),
  UNIQUE (curriculum_id,sequence_no)
);

CREATE UNIQUE INDEX academy_track_curriculum_runtime_idx
  ON mathchakchak.academy_track_curriculum (grade_code,track_code)
  WHERE runtime_enabled=true;
CREATE INDEX academy_track_formula_curriculum_idx
  ON mathchakchak.academy_track_formula_assignment (curriculum_id,sequence_no);
CREATE INDEX academy_track_formula_catalog_idx
  ON mathchakchak.academy_track_formula_assignment (formula_catalog_id);

COMMIT;
