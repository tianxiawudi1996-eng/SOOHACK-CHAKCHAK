BEGIN;

CREATE TABLE mathchakchak.math_expert_review_protocol (
  id uuid PRIMARY KEY,
  protocol_code varchar(64) NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status varchar(32) NOT NULL CHECK (status IN ('DRAFT_EXTERNAL_REVIEW','REGISTERED_LOCKED','ACTIVE','COMPLETED','SUSPENDED','CANCELLED')),
  minimum_distinct_reviewers smallint NOT NULL DEFAULT 2 CHECK (minimum_distinct_reviewers = 2),
  blind_review_required boolean NOT NULL DEFAULT true CHECK (blind_review_required = true),
  conflict_declaration_required boolean NOT NULL DEFAULT true CHECK (conflict_declaration_required = true),
  protocol_sha256 char(64) NOT NULL CHECK (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  governance_owner_identity_reference varchar(191),
  credential_authority_reference varchar(191),
  registered_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status='DRAFT_EXTERNAL_REVIEW' OR (governance_owner_identity_reference IS NOT NULL AND credential_authority_reference IS NOT NULL AND registered_at IS NOT NULL AND locked_at IS NOT NULL))
);

CREATE TABLE mathchakchak.math_expert_review_criterion (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.math_expert_review_protocol(id) ON DELETE CASCADE,
  criterion_code varchar(40) NOT NULL CHECK (criterion_code IN ('FORMULA_ACCURACY','EXPLANATION_VALIDITY','ANSWER_CORRECTNESS','DIFFICULTY_ALIGNMENT')),
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 4),
  required boolean NOT NULL DEFAULT true CHECK (required = true),
  definition_reference varchar(191) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,criterion_code),
  UNIQUE (protocol_id,sequence_no)
);

CREATE TABLE mathchakchak.math_expert_reviewer (
  id uuid PRIMARY KEY,
  reviewer_identity_reference varchar(191) NOT NULL UNIQUE,
  status varchar(24) NOT NULL CHECK (status IN ('PENDING_VERIFICATION','VERIFIED','SUSPENDED','EXPIRED')),
  credential_evidence_reference varchar(191),
  credential_verified_by_identity_reference varchar(191),
  credential_verified_at timestamptz,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'VERIFIED' OR (credential_evidence_reference IS NOT NULL AND credential_verified_by_identity_reference IS NOT NULL AND credential_verified_at IS NOT NULL AND valid_until >= credential_verified_at::date)),
  CHECK (credential_verified_by_identity_reference IS NULL OR credential_verified_by_identity_reference <> reviewer_identity_reference)
);

CREATE TABLE mathchakchak.math_expert_review_target (
  id uuid PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES mathchakchak.math_expert_review_protocol(id) ON DELETE RESTRICT,
  artifact_type varchar(24) NOT NULL CHECK (artifact_type IN ('FORMULA_PACKAGE','PROBLEM_PACKAGE','CURRICULUM_PACKAGE')),
  source_reference varchar(191) NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  status varchar(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','DUAL_APPROVED','DISAGREEMENT','PATCH_REQUIRED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id,artifact_type,source_reference,revision_no),
  UNIQUE (id,content_sha256)
);

CREATE TABLE mathchakchak.math_expert_review_assignment (
  id uuid PRIMARY KEY,
  target_id uuid NOT NULL REFERENCES mathchakchak.math_expert_review_target(id) ON DELETE RESTRICT,
  reviewer_id uuid NOT NULL REFERENCES mathchakchak.math_expert_reviewer(id) ON DELETE RESTRICT,
  review_round smallint NOT NULL DEFAULT 1 CHECK (review_round > 0),
  status varchar(20) NOT NULL CHECK (status IN ('ASSIGNED','ACKNOWLEDGED','COMPLETED','RECUSED')),
  conflict_declaration varchar(24) NOT NULL CHECK (conflict_declaration IN ('NO_CONFLICT','DISCLOSED_ACCEPTED')),
  assigned_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  recused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id,reviewer_id,review_round),
  CHECK (status NOT IN ('ACKNOWLEDGED','COMPLETED') OR acknowledged_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL),
  CHECK (status <> 'RECUSED' OR recused_at IS NOT NULL)
);

CREATE TABLE mathchakchak.math_expert_review_decision (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL UNIQUE REFERENCES mathchakchak.math_expert_review_assignment(id) ON DELETE RESTRICT,
  reviewed_content_sha256 char(64) NOT NULL CHECK (reviewed_content_sha256 ~ '^[0-9a-f]{64}$'),
  formula_decision varchar(20) NOT NULL CHECK (formula_decision IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  explanation_decision varchar(20) NOT NULL CHECK (explanation_decision IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  answer_decision varchar(20) NOT NULL CHECK (answer_decision IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  difficulty_decision varchar(20) NOT NULL CHECK (difficulty_decision IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  overall_decision varchar(20) NOT NULL CHECK (overall_decision IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  reason_code varchar(64) NOT NULL,
  evidence_reference varchar(191) NOT NULL,
  blind_peer_decision_visible boolean NOT NULL DEFAULT false CHECK (blind_peer_decision_visible = false),
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (overall_decision='REJECT' AND 'REJECT' IN (formula_decision,explanation_decision,answer_decision,difficulty_decision)) OR
    (overall_decision='PATCH_REQUIRED' AND 'REJECT' NOT IN (formula_decision,explanation_decision,answer_decision,difficulty_decision) AND 'PATCH_REQUIRED' IN (formula_decision,explanation_decision,answer_decision,difficulty_decision)) OR
    (overall_decision='APPROVE' AND formula_decision='APPROVE' AND explanation_decision='APPROVE' AND answer_decision='APPROVE' AND difficulty_decision='APPROVE')
  )
);

CREATE TABLE mathchakchak.math_expert_disagreement_resolution (
  id uuid PRIMARY KEY,
  target_id uuid NOT NULL REFERENCES mathchakchak.math_expert_review_target(id) ON DELETE RESTRICT,
  review_round smallint NOT NULL CHECK (review_round > 0),
  adjudicator_identity_reference varchar(191) NOT NULL,
  reviewed_content_sha256 char(64) NOT NULL CHECK (reviewed_content_sha256 ~ '^[0-9a-f]{64}$'),
  resolution varchar(20) NOT NULL CHECK (resolution IN ('APPROVE','PATCH_REQUIRED','REJECT')),
  rationale_reference varchar(191) NOT NULL,
  resolved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id,review_round)
);

CREATE TABLE mathchakchak.math_expert_review_audit_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES mathchakchak.math_expert_review_target(id) ON DELETE RESTRICT,
  event_type varchar(40) NOT NULL CHECK (event_type IN ('REVIEW_DECISION_RECORDED','DISAGREEMENT_RESOLVED','TARGET_STATUS_CHANGED')),
  actor_identity_reference varchar(191) NOT NULL,
  from_status varchar(24),
  to_status varchar(24),
  evidence_reference varchar(191) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX math_expert_review_criterion_protocol_idx ON mathchakchak.math_expert_review_criterion (protocol_id,sequence_no);
CREATE INDEX math_expert_reviewer_status_validity_idx ON mathchakchak.math_expert_reviewer (status,valid_until);
CREATE INDEX math_expert_review_target_protocol_status_idx ON mathchakchak.math_expert_review_target (protocol_id,status,id);
CREATE INDEX math_expert_review_assignment_target_status_idx ON mathchakchak.math_expert_review_assignment (target_id,status,reviewer_id);
CREATE INDEX math_expert_review_decision_assignment_idx ON mathchakchak.math_expert_review_decision (assignment_id,overall_decision);
CREATE INDEX math_expert_review_audit_target_time_idx ON mathchakchak.math_expert_review_audit_event (target_id,occurred_at,id);

CREATE OR REPLACE FUNCTION mathchakchak.prevent_math_expert_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'math expert review history is append-only' USING ERRCODE='23514';
END $$;

CREATE TRIGGER math_expert_decision_append_only BEFORE UPDATE OR DELETE ON mathchakchak.math_expert_review_decision FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_math_expert_history_mutation();
CREATE TRIGGER math_expert_resolution_append_only BEFORE UPDATE OR DELETE ON mathchakchak.math_expert_disagreement_resolution FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_math_expert_history_mutation();
CREATE TRIGGER math_expert_audit_append_only BEFORE UPDATE OR DELETE ON mathchakchak.math_expert_review_audit_event FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_math_expert_history_mutation();

CREATE OR REPLACE FUNCTION mathchakchak.validate_math_expert_decision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_hash char(64); reviewer_status varchar(24); reviewer_valid_until date; assignment_status varchar(20); reviewer_ref varchar(191); target_ref uuid;
BEGIN
  SELECT t.content_sha256,r.status,r.valid_until,a.status,r.reviewer_identity_reference,t.id
    INTO expected_hash,reviewer_status,reviewer_valid_until,assignment_status,reviewer_ref,target_ref
    FROM mathchakchak.math_expert_review_assignment a
    JOIN mathchakchak.math_expert_review_target t ON t.id=a.target_id
    JOIN mathchakchak.math_expert_reviewer r ON r.id=a.reviewer_id
   WHERE a.id=NEW.assignment_id;
  IF reviewer_status <> 'VERIFIED' OR reviewer_valid_until < NEW.reviewed_at::date OR assignment_status <> 'COMPLETED' OR expected_hash IS DISTINCT FROM NEW.reviewed_content_sha256 THEN
    RAISE EXCEPTION 'MATH_EXPERT_DECISION_GATE_BLOCKED' USING ERRCODE='23514';
  END IF;
  INSERT INTO mathchakchak.math_expert_review_audit_event(target_id,event_type,actor_identity_reference,evidence_reference,occurred_at)
  VALUES(target_ref,'REVIEW_DECISION_RECORDED',reviewer_ref,NEW.evidence_reference,NEW.reviewed_at);
  RETURN NEW;
END $$;

CREATE TRIGGER math_expert_decision_gate AFTER INSERT ON mathchakchak.math_expert_review_decision FOR EACH ROW EXECUTE FUNCTION mathchakchak.validate_math_expert_decision();

CREATE OR REPLACE FUNCTION mathchakchak.validate_math_expert_resolution()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_hash char(64); conflicting integer; reviewer_match integer;
BEGIN
  SELECT content_sha256 INTO target_hash FROM mathchakchak.math_expert_review_target WHERE id=NEW.target_id;
  SELECT count(DISTINCT d.overall_decision),count(*) FILTER (WHERE r.reviewer_identity_reference=NEW.adjudicator_identity_reference)
    INTO conflicting,reviewer_match
    FROM mathchakchak.math_expert_review_assignment a
    JOIN mathchakchak.math_expert_reviewer r ON r.id=a.reviewer_id
    JOIN mathchakchak.math_expert_review_decision d ON d.assignment_id=a.id
   WHERE a.target_id=NEW.target_id AND a.review_round=NEW.review_round;
  IF target_hash IS DISTINCT FROM NEW.reviewed_content_sha256 OR conflicting < 2 OR reviewer_match > 0 THEN
    RAISE EXCEPTION 'MATH_EXPERT_ADJUDICATION_GATE_BLOCKED' USING ERRCODE='23514';
  END IF;
  INSERT INTO mathchakchak.math_expert_review_audit_event(target_id,event_type,actor_identity_reference,evidence_reference,occurred_at)
  VALUES(NEW.target_id,'DISAGREEMENT_RESOLVED',NEW.adjudicator_identity_reference,NEW.rationale_reference,NEW.resolved_at);
  RETURN NEW;
END $$;

CREATE TRIGGER math_expert_resolution_gate AFTER INSERT ON mathchakchak.math_expert_disagreement_resolution FOR EACH ROW EXECUTE FUNCTION mathchakchak.validate_math_expert_resolution();

CREATE OR REPLACE FUNCTION mathchakchak.validate_math_expert_target_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE approvals integer; distinct_reviewers integer; non_approvals integer;
BEGIN
  IF NEW.status='DUAL_APPROVED' AND OLD.status IS DISTINCT FROM 'DUAL_APPROVED' THEN
    SELECT count(*) FILTER (WHERE d.overall_decision='APPROVE'),count(DISTINCT a.reviewer_id),count(*) FILTER (WHERE d.overall_decision<>'APPROVE') INTO approvals,distinct_reviewers,non_approvals
      FROM mathchakchak.math_expert_review_assignment a
      JOIN mathchakchak.math_expert_reviewer r ON r.id=a.reviewer_id AND r.status='VERIFIED'
      JOIN mathchakchak.math_expert_review_decision d ON d.assignment_id=a.id
     WHERE a.target_id=NEW.id AND d.reviewed_content_sha256=NEW.content_sha256;
    IF approvals < 2 OR distinct_reviewers < 2 OR non_approvals > 0 THEN
      RAISE EXCEPTION 'MATH_EXPERT_DUAL_APPROVAL_GATE_BLOCKED' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO mathchakchak.math_expert_review_audit_event(target_id,event_type,actor_identity_reference,from_status,to_status,evidence_reference)
    VALUES(NEW.id,'TARGET_STATUS_CHANGED','SYSTEM-DB-GATE',OLD.status,NEW.status,NEW.content_sha256);
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE TRIGGER math_expert_target_status_gate BEFORE UPDATE ON mathchakchak.math_expert_review_target FOR EACH ROW EXECUTE FUNCTION mathchakchak.validate_math_expert_target_status();

CREATE OR REPLACE FUNCTION mathchakchak.prevent_locked_math_expert_protocol_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('REGISTERED_LOCKED','ACTIVE','COMPLETED') AND
     (NEW.minimum_distinct_reviewers IS DISTINCT FROM OLD.minimum_distinct_reviewers OR NEW.blind_review_required IS DISTINCT FROM OLD.blind_review_required OR NEW.conflict_declaration_required IS DISTINCT FROM OLD.conflict_declaration_required OR NEW.protocol_sha256 IS DISTINCT FROM OLD.protocol_sha256 OR NEW.governance_owner_identity_reference IS DISTINCT FROM OLD.governance_owner_identity_reference OR NEW.credential_authority_reference IS DISTINCT FROM OLD.credential_authority_reference OR NEW.registered_at IS DISTINCT FROM OLD.registered_at OR NEW.locked_at IS DISTINCT FROM OLD.locked_at) THEN
    RAISE EXCEPTION 'locked math expert protocol fields are immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE TRIGGER math_expert_protocol_lock_guard BEFORE UPDATE ON mathchakchak.math_expert_review_protocol FOR EACH ROW EXECUTE FUNCTION mathchakchak.prevent_locked_math_expert_protocol_mutation();

REVOKE ALL ON mathchakchak.math_expert_review_protocol,mathchakchak.math_expert_review_criterion,mathchakchak.math_expert_reviewer,mathchakchak.math_expert_review_target,mathchakchak.math_expert_review_assignment,mathchakchak.math_expert_review_decision,mathchakchak.math_expert_disagreement_resolution,mathchakchak.math_expert_review_audit_event FROM PUBLIC;

COMMIT;
