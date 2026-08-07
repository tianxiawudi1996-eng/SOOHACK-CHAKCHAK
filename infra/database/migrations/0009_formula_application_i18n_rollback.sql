BEGIN;
DROP TABLE IF EXISTS mathchakchak.formula_application_item_translation;
ALTER TABLE mathchakchak.formula_application_item DROP COLUMN IF EXISTS unit_required;
COMMIT;
