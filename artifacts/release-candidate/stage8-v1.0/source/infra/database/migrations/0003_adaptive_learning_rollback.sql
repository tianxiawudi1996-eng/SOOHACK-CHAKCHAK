BEGIN;
DROP TABLE IF EXISTS mathchakchak.student_topic_mastery;
DROP TABLE IF EXISTS mathchakchak.adaptive_learning_decision;
ALTER TABLE mathchakchak.formula_learning_session
  DROP COLUMN IF EXISTS target_difficulty,
  DROP COLUMN IF EXISTS starting_hint_level,
  DROP COLUMN IF EXISTS adaptive_route;
ALTER TABLE mathchakchak.learning_path_item
  DROP COLUMN IF EXISTS review_after_days,
  DROP COLUMN IF EXISTS target_difficulty,
  DROP COLUMN IF EXISTS starting_hint_level,
  DROP COLUMN IF EXISTS adaptive_route;
COMMIT;
