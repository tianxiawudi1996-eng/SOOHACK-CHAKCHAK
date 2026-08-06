BEGIN;

ALTER TABLE mathchakchak.formula_collaboration_session
  ADD COLUMN started_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN evidence_score numeric(5,4) CHECK (evidence_score BETWEEN 0 AND 1);

CREATE TABLE mathchakchak.collaboration_phase_evidence (
  id uuid PRIMARY KEY,
  collaboration_session_id uuid NOT NULL REFERENCES mathchakchak.formula_collaboration_session(id) ON DELETE CASCADE,
  phase_no smallint NOT NULL CHECK (phase_no BETWEEN 1 AND 5),
  signal varchar(32) NOT NULL CHECK (signal IN (
    'CONFIDENT','NEEDS_REVIEW','CONNECTED','NEEDS_EXAMPLE','DERIVED',
    'NEEDS_GUIDANCE','APPLIED','NEEDS_HINT','VERIFIED','REVIEW_REQUIRED'
  )),
  outcome varchar(20) NOT NULL CHECK (outcome IN ('PASS','NEEDS_SUPPORT')),
  hint_level smallint NOT NULL DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3),
  duration_ms integer CHECK (duration_ms BETWEEN 0 AND 3600000),
  lead_character varchar(16) NOT NULL CHECK (lead_character IN ('CHAKCHAKI','GONGSICKYI','BOTH')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaboration_session_id, phase_no)
);

CREATE TABLE mathchakchak.student_formula_collaboration_progress (
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  formula_catalog_id uuid NOT NULL REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  completed_sessions integer NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0),
  latest_evidence_score numeric(5,4) NOT NULL CHECK (latest_evidence_score BETWEEN 0 AND 1),
  next_review_at timestamptz NOT NULL,
  last_collaboration_session_id uuid REFERENCES mathchakchak.formula_collaboration_session(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_profile_id, formula_catalog_id)
);

CREATE INDEX collaboration_evidence_session_idx
  ON mathchakchak.collaboration_phase_evidence (collaboration_session_id, phase_no);
CREATE INDEX collaboration_review_due_idx
  ON mathchakchak.student_formula_collaboration_progress (student_profile_id, next_review_at);

COMMIT;
