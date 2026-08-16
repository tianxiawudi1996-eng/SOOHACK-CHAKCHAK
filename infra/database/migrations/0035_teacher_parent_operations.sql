BEGIN;

ALTER TABLE mathchakchak.app_user DROP CONSTRAINT app_user_role_check;
ALTER TABLE mathchakchak.app_user ADD CONSTRAINT app_user_role_check
  CHECK (role IN ('STUDENT','PARENT','TEACHER','ADMIN','SERVICE'));

CREATE TABLE mathchakchak.teacher_student_link (
  id uuid PRIMARY KEY,
  teacher_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  scope varchar(32) NOT NULL DEFAULT 'ACADEMY_COACH' CHECK (scope IN ('ACADEMY_COACH','CLASS_TEACHER')),
  status varchar(20) NOT NULL CHECK (status IN ('PENDING','ACTIVE','REVOKED')),
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_user_id,student_profile_id),
  CHECK (status <> 'ACTIVE' OR activated_at IS NOT NULL),
  CHECK (status <> 'REVOKED' OR revoked_at IS NOT NULL)
);

CREATE TABLE mathchakchak.academy_learning_assignment (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  curriculum_id uuid NOT NULL REFERENCES mathchakchak.academy_track_curriculum(id) ON DELETE RESTRICT,
  assigned_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  due_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_at > created_at),
  CHECK (status <> 'IN_PROGRESS' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL),
  CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
);

CREATE TABLE mathchakchak.academy_learning_assignment_item (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES mathchakchak.academy_learning_assignment(id) ON DELETE CASCADE,
  curriculum_formula_assignment_id uuid NOT NULL REFERENCES mathchakchak.academy_track_formula_assignment(id) ON DELETE RESTRICT,
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 6),
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','SKIPPED')),
  completed_at timestamptz,
  UNIQUE (assignment_id,sequence_no),
  UNIQUE (assignment_id,curriculum_formula_assignment_id),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE mathchakchak.student_learning_intervention (
  id uuid PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES mathchakchak.student_profile(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES mathchakchak.app_user(id) ON DELETE RESTRICT,
  assignment_id uuid REFERENCES mathchakchak.academy_learning_assignment(id) ON DELETE SET NULL,
  reason_code varchar(40) NOT NULL CHECK (reason_code IN ('BASELINE_MISSING','CONCEPT_GAP','RECALL_GAP','APPLICATION_GAP','INDEPENDENCE_GAP','TEACHER_REVIEW_REQUIRED')),
  priority varchar(16) NOT NULL CHECK (priority IN ('NORMAL','WATCH','URGENT')),
  action_code varchar(40) NOT NULL CHECK (action_code IN ('COLLECT_EVIDENCE','REBUILD_CONCEPT','SCHEDULE_RECALL','PRACTICE_TRANSFER','REVIEW_SOLUTION')),
  status varchar(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'RESOLVED' OR resolved_at IS NOT NULL)
);

CREATE INDEX teacher_student_link_student_status_idx ON mathchakchak.teacher_student_link (student_profile_id,status,teacher_user_id);
CREATE INDEX academy_learning_assignment_student_status_created_idx ON mathchakchak.academy_learning_assignment (student_profile_id,status,created_at DESC);
CREATE INDEX academy_learning_assignment_teacher_status_created_idx ON mathchakchak.academy_learning_assignment (assigned_by_user_id,status,created_at DESC);
CREATE INDEX academy_learning_assignment_curriculum_idx ON mathchakchak.academy_learning_assignment (curriculum_id);
CREATE INDEX academy_learning_assignment_item_formula_idx ON mathchakchak.academy_learning_assignment_item (curriculum_formula_assignment_id);
CREATE INDEX student_learning_intervention_student_status_created_idx ON mathchakchak.student_learning_intervention (student_profile_id,status,created_at DESC);
CREATE INDEX student_learning_intervention_creator_idx ON mathchakchak.student_learning_intervention (created_by_user_id);
CREATE INDEX student_learning_intervention_assignment_idx ON mathchakchak.student_learning_intervention (assignment_id) WHERE assignment_id IS NOT NULL;
CREATE UNIQUE INDEX academy_learning_assignment_active_plan_idx ON mathchakchak.academy_learning_assignment (student_profile_id,curriculum_id) WHERE status IN ('ASSIGNED','IN_PROGRESS');

REVOKE ALL ON mathchakchak.teacher_student_link,mathchakchak.academy_learning_assignment,mathchakchak.academy_learning_assignment_item,mathchakchak.student_learning_intervention FROM PUBLIC;

COMMIT;
