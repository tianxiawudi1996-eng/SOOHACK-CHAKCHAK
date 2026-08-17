BEGIN;

ALTER TABLE mathchakchak.formula_explanation_revision
  ADD COLUMN title varchar(191),
  ADD COLUMN display_notation varchar(500),
  ADD COLUMN recall_prompt text;

ALTER TABLE mathchakchak.formula_explanation_revision
  ALTER COLUMN verification_status TYPE varchar(32);

ALTER TABLE mathchakchak.formula_collaboration_session
  ADD COLUMN content_locale varchar(8) NOT NULL DEFAULT 'ko'
  CHECK (content_locale IN ('ko','zh-CN','ja','en','es','fr','it','ru'));

UPDATE mathchakchak.formula_explanation_revision fer
   SET title=gfc.title_ko,
       display_notation=gfc.notation,
       recall_prompt='‘' || gfc.title_ko || '’의 핵심 관계로 알맞은 표현을 고르세요.'
  FROM mathchakchak.grade_formula_catalog gfc
 WHERE gfc.id=fer.formula_catalog_id AND fer.locale='ko';

DROP INDEX mathchakchak.formula_explanation_revision_latest_idx;
CREATE INDEX formula_explanation_revision_latest_idx
  ON mathchakchak.formula_explanation_revision (formula_catalog_id,locale,revision_no DESC)
  INCLUDE (title,display_notation,explanation,recall_prompt,verification_status);

CREATE INDEX formula_collaboration_locale_idx
  ON mathchakchak.formula_collaboration_session (content_locale,formula_catalog_id);

COMMIT;
