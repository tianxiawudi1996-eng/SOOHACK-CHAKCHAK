BEGIN;

CREATE TABLE mathchakchak.curriculum_grade_translation (
  grade_code varchar(2) NOT NULL REFERENCES mathchakchak.curriculum_grade(grade_code) ON DELETE CASCADE,
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  label varchar(96) NOT NULL,
  official_band varchar(191) NOT NULL,
  course_path jsonb NOT NULL CHECK (jsonb_typeof(course_path)='array' AND jsonb_array_length(course_path)>0),
  verification_status varchar(32) NOT NULL CHECK (verification_status IN ('SOURCE_ALIGNED','TRANSLATION_REVIEW_REQUIRED','RETIRED')),
  PRIMARY KEY (grade_code,locale)
);

CREATE TABLE mathchakchak.curriculum_reference_translation (
  curriculum_reference_id uuid NOT NULL REFERENCES mathchakchak.curriculum_reference(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  authority_label varchar(191) NOT NULL,
  notice_label varchar(191) NOT NULL,
  title varchar(191) NOT NULL,
  annex_label varchar(96) NOT NULL,
  citation text NOT NULL,
  verification_status varchar(32) NOT NULL CHECK (verification_status IN ('SOURCE_ALIGNED','TRANSLATION_REVIEW_REQUIRED','RETIRED')),
  PRIMARY KEY (curriculum_reference_id,locale)
);

CREATE TABLE mathchakchak.character_collaboration_policy_definition (
  policy_version varchar(32) PRIMARY KEY
);
INSERT INTO mathchakchak.character_collaboration_policy_definition (policy_version)
VALUES ('pet-collab-v1') ON CONFLICT (policy_version) DO NOTHING;
INSERT INTO mathchakchak.character_collaboration_policy_definition (policy_version)
SELECT DISTINCT policy_version FROM mathchakchak.character_collaboration_policy
ON CONFLICT (policy_version) DO NOTHING;
ALTER TABLE mathchakchak.character_collaboration_policy
  ADD CONSTRAINT character_collaboration_policy_definition_fk
  FOREIGN KEY (policy_version) REFERENCES mathchakchak.character_collaboration_policy_definition(policy_version) ON DELETE CASCADE;

CREATE TABLE mathchakchak.character_collaboration_role_translation (
  policy_version varchar(32) NOT NULL REFERENCES mathchakchak.character_collaboration_policy_definition(policy_version) ON DELETE CASCADE,
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  chakchaki_role text NOT NULL,
  gongsickyi_role text NOT NULL,
  verification_status varchar(32) NOT NULL CHECK (verification_status IN ('SOURCE_ALIGNED','TRANSLATION_REVIEW_REQUIRED','RETIRED')),
  PRIMARY KEY (policy_version,locale)
);

CREATE TABLE mathchakchak.character_collaboration_phase_translation (
  policy_version varchar(32) NOT NULL,
  phase_no smallint NOT NULL,
  locale varchar(8) NOT NULL CHECK (locale IN ('ko','zh-CN','ja','en','es','fr','it','ru')),
  phase_title varchar(191) NOT NULL,
  objective text NOT NULL,
  verification_status varchar(32) NOT NULL CHECK (verification_status IN ('SOURCE_ALIGNED','TRANSLATION_REVIEW_REQUIRED','RETIRED')),
  PRIMARY KEY (policy_version,phase_no,locale),
  FOREIGN KEY (policy_version,phase_no) REFERENCES mathchakchak.character_collaboration_policy(policy_version,phase_no) ON DELETE CASCADE
);

COMMIT;
