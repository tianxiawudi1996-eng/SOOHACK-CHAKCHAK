BEGIN;

CREATE TABLE mathchakchak.solution_capture (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('MANUAL_TEXT','HANDWRITING_IMAGE','CAMERA_IMAGE')),
  source_asset_reference text,
  source_asset_sha256 char(64) CHECK (source_asset_sha256 ~ '^[0-9a-f]{64}$'),
  raw_asset_persisted boolean NOT NULL DEFAULT false CHECK (raw_asset_persisted = false),
  status text NOT NULL CHECK (status IN ('RECEIVED','EVALUATED','CONFIRMATION_REQUIRED','TEACHER_REVIEW_REQUIRED','MANUAL_ENTRY_REQUIRED','REJECTED','RESOLVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_asset_reference IS NULL) = (source_asset_sha256 IS NULL))
);

CREATE TABLE mathchakchak.solution_recognition_evaluation (
  id uuid PRIMARY KEY,
  capture_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.solution_capture(id) ON DELETE CASCADE,
  provider_reference text NOT NULL,
  provider_verified boolean NOT NULL DEFAULT false,
  candidate_count smallint NOT NULL CHECK (candidate_count BETWEEN 0 AND 5),
  valid_candidate_count smallint NOT NULL CHECK (valid_candidate_count BETWEEN 0 AND candidate_count),
  candidate_hashes jsonb NOT NULL CHECK (jsonb_typeof(candidate_hashes) = 'array' AND jsonb_array_length(candidate_hashes) = valid_candidate_count),
  top_confidence numeric(5,4) NOT NULL CHECK (top_confidence BETWEEN 0 AND 1),
  confidence_margin numeric(5,4) NOT NULL CHECK (confidence_margin BETWEEN 0 AND 1),
  image_quality numeric(5,4) NOT NULL CHECK (image_quality BETWEEN 0 AND 1),
  math_consistency numeric(5,4) NOT NULL CHECK (math_consistency BETWEEN 0 AND 1),
  step_continuity numeric(5,4) NOT NULL CHECK (step_continuity BETWEEN 0 AND 1),
  decision text NOT NULL CHECK (decision IN ('STUDENT_CONFIRMATION_REQUIRED','TEACHER_REVIEW_REQUIRED','MANUAL_ENTRY_REQUIRED','REJECTED')),
  reason_codes text[] NOT NULL CHECK (cardinality(reason_codes) > 0),
  raw_candidate_storage boolean NOT NULL DEFAULT false CHECK (raw_candidate_storage = false),
  automatic_scoring_allowed boolean NOT NULL DEFAULT false CHECK (automatic_scoring_allowed = false),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mathchakchak.solution_review_queue (
  id uuid PRIMARY KEY,
  evaluation_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.solution_recognition_evaluation(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ASSIGNED','RESOLVED','REJECTED')),
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  reason_codes text[] NOT NULL CHECK (cardinality(reason_codes) > 0),
  reviewer_identity_reference text,
  decision_reference text,
  assigned_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'ASSIGNED' OR (reviewer_identity_reference IS NOT NULL AND assigned_at IS NOT NULL)),
  CHECK (status NOT IN ('RESOLVED','REJECTED') OR (decision_reference IS NOT NULL AND resolved_at IS NOT NULL))
);

CREATE INDEX solution_capture_student_created_idx ON mathchakchak.solution_capture (student_profile_id, created_at DESC, id);
CREATE INDEX solution_evaluation_capture_idx ON mathchakchak.solution_recognition_evaluation (capture_id);
CREATE INDEX solution_review_queue_student_idx ON mathchakchak.solution_review_queue (student_profile_id, created_at DESC);
CREATE INDEX solution_review_queue_pending_idx ON mathchakchak.solution_review_queue (priority, created_at, id) WHERE status = 'PENDING';
CREATE INDEX solution_evaluation_candidate_hashes_gin ON mathchakchak.solution_recognition_evaluation USING gin (candidate_hashes jsonb_path_ops);

CREATE OR REPLACE FUNCTION mathchakchak.enqueue_solution_teacher_review()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capture_student_id uuid;
BEGIN
  IF NEW.decision <> 'TEACHER_REVIEW_REQUIRED' THEN RETURN NEW; END IF;
  SELECT student_profile_id INTO capture_student_id FROM mathchakchak.solution_capture WHERE id=NEW.capture_id;
  INSERT INTO mathchakchak.solution_review_queue(id,evaluation_id,student_profile_id,priority,reason_codes)
  VALUES (gen_random_uuid(),NEW.id,capture_student_id,2,NEW.reason_codes);
  RETURN NEW;
END;
$$;

CREATE TRIGGER solution_teacher_review_enqueue
AFTER INSERT ON mathchakchak.solution_recognition_evaluation
FOR EACH ROW EXECUTE FUNCTION mathchakchak.enqueue_solution_teacher_review();

COMMIT;
