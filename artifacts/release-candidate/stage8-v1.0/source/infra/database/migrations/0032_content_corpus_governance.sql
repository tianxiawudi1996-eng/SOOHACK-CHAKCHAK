BEGIN;

CREATE TABLE mathchakchak.content_license (
  id uuid PRIMARY KEY,
  license_key text NOT NULL UNIQUE,
  rights_holder_reference text NOT NULL,
  agreement_reference text NOT NULL,
  agreement_sha256 char(64) NOT NULL CHECK (agreement_sha256 ~ '^[0-9a-f]{64}$'),
  valid_from date NOT NULL,
  valid_until date,
  permitted_regions text[] NOT NULL CHECK (cardinality(permitted_regions) > 0),
  permitted_uses text[] NOT NULL CHECK (cardinality(permitted_uses) > 0),
  status text NOT NULL CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','EXPIRED','REVOKED')),
  approved_by_user_id uuid REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CHECK (status <> 'ACTIVE' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (status <> 'ACTIVE' OR ('DIGITAL_LEARNING' = ANY(permitted_uses)))
);

CREATE TABLE mathchakchak.content_import_batch (
  id uuid PRIMARY KEY,
  license_id uuid NOT NULL REFERENCES mathchakchak.content_license(id) ON DELETE RESTRICT,
  source_reference text NOT NULL,
  manifest_sha256 char(64) NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  expected_count integer NOT NULL CHECK (expected_count > 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  status text NOT NULL CHECK (status IN ('REGISTERED','VALIDATING','ACCEPTED','PARTIAL','REJECTED')),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (accepted_count + rejected_count <= expected_count),
  CHECK (status NOT IN ('ACCEPTED','PARTIAL','REJECTED') OR completed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.content_problem (
  id uuid PRIMARY KEY,
  import_batch_id uuid NOT NULL REFERENCES mathchakchak.content_import_batch(id) ON DELETE RESTRICT,
  license_id uuid NOT NULL REFERENCES mathchakchak.content_license(id) ON DELETE RESTRICT,
  external_key text NOT NULL,
  grade_code varchar(2) NOT NULL REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE RESTRICT,
  formula_catalog_id uuid REFERENCES mathchakchak.grade_formula_catalog(id) ON DELETE RESTRICT,
  concept_key text NOT NULL,
  problem_type text NOT NULL CHECK (problem_type IN ('CONCEPT','COMPUTATION','WORD','APPLICATION','PROOF','MULTI_STEP','CONTEST')),
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  publication_status text NOT NULL DEFAULT 'DRAFT' CHECK (publication_status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','REJECTED','RETIRED')),
  current_revision_no integer NOT NULL DEFAULT 1 CHECK (current_revision_no > 0),
  current_content_sha256 char(64) NOT NULL CHECK (current_content_sha256 ~ '^[0-9a-f]{64}$'),
  duplicate_cluster_sha256 char(64) CHECK (duplicate_cluster_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (license_id, external_key),
  UNIQUE (id, current_revision_no),
  CHECK ((publication_status = 'PUBLISHED') = (published_at IS NOT NULL))
);

CREATE TABLE mathchakchak.content_problem_revision (
  id uuid PRIMARY KEY,
  problem_id uuid NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  locale varchar(10) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  stem text NOT NULL CHECK (length(btrim(stem)) BETWEEN 1 AND 12000),
  choices jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(choices) = 'array'),
  answer_schema jsonb NOT NULL CHECK (jsonb_typeof(answer_schema) = 'object'),
  solution_steps jsonb NOT NULL CHECK (jsonb_typeof(solution_steps) = 'array' AND jsonb_array_length(solution_steps) > 0),
  hint_ladder jsonb NOT NULL CHECK (jsonb_typeof(hint_ladder) = 'array' AND jsonb_array_length(hint_ladder) BETWEEN 2 AND 5),
  skill_tags text[] NOT NULL CHECK (cardinality(skill_tags) > 0),
  misconception_tags text[] NOT NULL CHECK (cardinality(misconception_tags) > 0),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (problem_id, revision_no) REFERENCES mathchakchak.content_problem(id, current_revision_no) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (problem_id, revision_no, locale)
);

CREATE TABLE mathchakchak.content_problem_review (
  id uuid PRIMARY KEY,
  problem_id uuid NOT NULL,
  revision_no integer NOT NULL,
  review_type text NOT NULL CHECK (review_type IN ('MATH_ACCURACY','RIGHTS_COMPLIANCE','LANGUAGE_QUALITY')),
  reviewer_identity_reference text NOT NULL,
  conflict_declaration text NOT NULL CHECK (conflict_declaration IN ('NO_CONFLICT','DISCLOSED_ACCEPTED')),
  decision text NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  reviewed_content_sha256 char(64) NOT NULL CHECK (reviewed_content_sha256 ~ '^[0-9a-f]{64}$'),
  reason_code text NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (problem_id, revision_no) REFERENCES mathchakchak.content_problem(id, current_revision_no) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (problem_id, revision_no, review_type, reviewer_identity_reference)
);

CREATE TABLE mathchakchak.content_quality_finding (
  id uuid PRIMARY KEY,
  problem_id uuid NOT NULL REFERENCES mathchakchak.content_problem(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  finding_type text NOT NULL CHECK (finding_type IN ('DUPLICATE','ANSWER_ERROR','SOLUTION_ERROR','CURRICULUM_MISMATCH','DIFFICULTY_MISMATCH','RIGHTS_RISK','LANGUAGE_DEFECT')),
  severity text NOT NULL CHECK (severity IN ('INFO','WARNING','ERROR','CRITICAL')),
  status text NOT NULL CHECK (status IN ('OPEN','RESOLVED','ACCEPTED_RISK')),
  evidence_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (status = 'OPEN' OR resolved_at IS NOT NULL)
);

CREATE INDEX content_license_active_validity_idx ON mathchakchak.content_license (valid_from, valid_until) WHERE status = 'ACTIVE';
CREATE INDEX content_import_batch_license_created_idx ON mathchakchak.content_import_batch (license_id, created_at DESC);
CREATE INDEX content_problem_batch_idx ON mathchakchak.content_problem (import_batch_id);
CREATE INDEX content_problem_license_idx ON mathchakchak.content_problem (license_id);
CREATE INDEX content_problem_formula_idx ON mathchakchak.content_problem (formula_catalog_id) WHERE formula_catalog_id IS NOT NULL;
CREATE INDEX content_problem_catalog_idx ON mathchakchak.content_problem (publication_status, grade_code, difficulty, id);
CREATE INDEX content_problem_published_idx ON mathchakchak.content_problem (grade_code, concept_key, difficulty, id) WHERE publication_status = 'PUBLISHED';
CREATE INDEX content_problem_review_problem_idx ON mathchakchak.content_problem_review (problem_id, revision_no, review_type, decision);
CREATE INDEX content_quality_finding_open_idx ON mathchakchak.content_quality_finding (problem_id, severity, created_at) WHERE status = 'OPEN';

CREATE OR REPLACE FUNCTION mathchakchak.assert_content_problem_publishable()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  active_license boolean;
  revision_hash char(64);
  math_reviewers integer;
  rights_reviews integer;
  blocking_findings integer;
BEGIN
  IF NEW.publication_status <> 'PUBLISHED' OR OLD.publication_status = 'PUBLISHED' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM mathchakchak.content_license l
    WHERE l.id = NEW.license_id
      AND l.status = 'ACTIVE'
      AND l.valid_from <= CURRENT_DATE
      AND (l.valid_until IS NULL OR l.valid_until >= CURRENT_DATE)
      AND 'DIGITAL_LEARNING' = ANY(l.permitted_uses)
  ) INTO active_license;

  SELECT r.content_sha256 INTO revision_hash
  FROM mathchakchak.content_problem_revision r
  WHERE r.problem_id = NEW.id AND r.revision_no = NEW.current_revision_no AND r.locale = 'ko';

  SELECT count(DISTINCT reviewer_identity_reference) INTO math_reviewers
  FROM mathchakchak.content_problem_review
  WHERE problem_id = NEW.id AND revision_no = NEW.current_revision_no
    AND review_type = 'MATH_ACCURACY' AND decision = 'APPROVE'
    AND reviewed_content_sha256 = NEW.current_content_sha256;

  SELECT count(*) INTO rights_reviews
  FROM mathchakchak.content_problem_review
  WHERE problem_id = NEW.id AND revision_no = NEW.current_revision_no
    AND review_type = 'RIGHTS_COMPLIANCE' AND decision = 'APPROVE'
    AND reviewed_content_sha256 = NEW.current_content_sha256;

  SELECT count(*) INTO blocking_findings
  FROM mathchakchak.content_quality_finding
  WHERE problem_id = NEW.id AND revision_no = NEW.current_revision_no
    AND status = 'OPEN' AND severity IN ('ERROR','CRITICAL');

  IF NOT active_license OR revision_hash IS DISTINCT FROM NEW.current_content_sha256
     OR math_reviewers < 2 OR rights_reviews < 1 OR blocking_findings > 0 THEN
    RAISE EXCEPTION 'CONTENT_PUBLICATION_GATE_BLOCKED'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_problem_publish_gate
BEFORE UPDATE OF publication_status ON mathchakchak.content_problem
FOR EACH ROW EXECUTE FUNCTION mathchakchak.assert_content_problem_publishable();

CREATE OR REPLACE FUNCTION mathchakchak.protect_reviewed_content_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mathchakchak.content_problem p
    WHERE p.id = OLD.problem_id AND p.current_revision_no = OLD.revision_no
      AND p.publication_status IN ('APPROVED','PUBLISHED')
  ) THEN
    RAISE EXCEPTION 'REVIEWED_CONTENT_REVISION_IMMUTABLE'
      USING ERRCODE = '55000';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER content_problem_revision_immutable
BEFORE UPDATE OR DELETE ON mathchakchak.content_problem_revision
FOR EACH ROW EXECUTE FUNCTION mathchakchak.protect_reviewed_content_revision();

COMMIT;
