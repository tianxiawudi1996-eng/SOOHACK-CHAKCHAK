BEGIN;

ALTER TABLE mathchakchak.formula_application_item
  ADD COLUMN unit_required boolean NOT NULL DEFAULT false;

CREATE TABLE mathchakchak.formula_application_item_translation (
  application_item_id uuid NOT NULL REFERENCES mathchakchak.formula_application_item(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  prompt text NOT NULL,
  value_label varchar(40) NOT NULL,
  unit_label varchar(40) NOT NULL,
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (application_item_id,locale)
);

COMMIT;
