BEGIN;
DELETE FROM mathchakchak.formula_explanation_revision
 WHERE locale <> 'ko' AND verification_status='TRANSLATION_REVIEW_REQUIRED';
DROP INDEX IF EXISTS mathchakchak.formula_explanation_revision_latest_idx;
DROP INDEX IF EXISTS mathchakchak.formula_collaboration_locale_idx;
CREATE INDEX formula_explanation_revision_latest_idx
  ON mathchakchak.formula_explanation_revision (formula_catalog_id,locale,revision_no DESC);
ALTER TABLE mathchakchak.formula_explanation_revision
  DROP COLUMN IF EXISTS recall_prompt,
  DROP COLUMN IF EXISTS display_notation,
  DROP COLUMN IF EXISTS title;
ALTER TABLE mathchakchak.formula_explanation_revision
  ALTER COLUMN verification_status TYPE varchar(24);
ALTER TABLE mathchakchak.formula_collaboration_session
  DROP COLUMN IF EXISTS content_locale;
COMMIT;
