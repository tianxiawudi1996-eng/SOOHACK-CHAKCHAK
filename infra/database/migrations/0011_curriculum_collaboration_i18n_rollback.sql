BEGIN;
DROP TABLE IF EXISTS mathchakchak.character_collaboration_phase_translation;
DROP TABLE IF EXISTS mathchakchak.character_collaboration_role_translation;
ALTER TABLE mathchakchak.character_collaboration_policy
  DROP CONSTRAINT IF EXISTS character_collaboration_policy_definition_fk;
DROP TABLE IF EXISTS mathchakchak.character_collaboration_policy_definition;
DROP TABLE IF EXISTS mathchakchak.curriculum_reference_translation;
DROP TABLE IF EXISTS mathchakchak.curriculum_grade_translation;
COMMIT;
