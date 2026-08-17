BEGIN;

WITH tracks(track_code,sessions,concept_pct,standard_pct,advanced_pct,objectives) AS (
  VALUES
    ('CONCEPT_RECOVERY',4,60,30,10,'["REBUILD_PREREQUISITE","EXPLAIN_RELATION","GUIDED_TRANSFER"]'::jsonb),
    ('SCHOOL_EXAM',5,30,50,20,'["CURRICULUM_FLUENCY","ERROR_REPAIR","TIMED_REVIEW"]'::jsonb),
    ('ADVANCED_REASONING',5,20,35,45,'["MULTI_STEP_REASONING","REPRESENTATION_TRANSFER","INDEPENDENT_PROOF"]'::jsonb),
    ('CONTEST_BRIDGE',6,10,20,70,'["NON_ROUTINE_STRATEGY","CONSTRAINT_REASONING","SOLUTION_COMPARISON"]'::jsonb)
), plans AS (
  SELECT cg.grade_code,t.*,
         cg.grade_code||':'||t.track_code||':v1' AS identity
    FROM mathchakchak.curriculum_grade cg CROSS JOIN tracks t
)
INSERT INTO mathchakchak.academy_track_curriculum
  (id,grade_code,track_code,curriculum_version,sessions_per_week,concept_percent,standard_percent,advanced_percent,objective_codes,content_sha256)
SELECT (substr(md5(identity),1,8)||'-'||substr(md5(identity),9,4)||'-5'||substr(md5(identity),14,3)||'-8'||substr(md5(identity),18,3)||'-'||substr(md5(identity),21,12))::uuid,
       grade_code,track_code,1,sessions,concept_pct,standard_pct,advanced_pct,objectives,
       encode(sha256(convert_to(identity||':'||objectives::text,'UTF8')),'hex')
  FROM plans;

INSERT INTO mathchakchak.academy_track_formula_assignment
  (id,curriculum_id,formula_catalog_id,sequence_no,assignment_purpose,required_recall_attempts,required_application_items,minimum_collaboration_score)
SELECT (substr(md5(atc.id::text||':'||gfc.id::text),1,8)||'-'||substr(md5(atc.id::text||':'||gfc.id::text),9,4)||'-5'||substr(md5(atc.id::text||':'||gfc.id::text),14,3)||'-8'||substr(md5(atc.id::text||':'||gfc.id::text),18,3)||'-'||substr(md5(atc.id::text||':'||gfc.id::text),21,12))::uuid,
       atc.id,gfc.id,gfc.sequence_no,
       CASE atc.track_code WHEN 'CONCEPT_RECOVERY' THEN 'FOUNDATION' WHEN 'SCHOOL_EXAM' THEN 'CORE' WHEN 'ADVANCED_REASONING' THEN 'TRANSFER' ELSE 'STRETCH' END,
       CASE atc.track_code WHEN 'CONCEPT_RECOVERY' THEN 1 WHEN 'SCHOOL_EXAM' THEN 2 WHEN 'ADVANCED_REASONING' THEN 2 ELSE 3 END,
       CASE atc.track_code WHEN 'CONCEPT_RECOVERY' THEN 1 WHEN 'SCHOOL_EXAM' THEN 2 ELSE 3 END,
       CASE atc.track_code WHEN 'CONCEPT_RECOVERY' THEN 0.5000 WHEN 'SCHOOL_EXAM' THEN 0.6500 WHEN 'ADVANCED_REASONING' THEN 0.7500 ELSE 0.8500 END
  FROM mathchakchak.academy_track_curriculum atc
  JOIN mathchakchak.grade_formula_catalog gfc ON gfc.grade_code=atc.grade_code AND gfc.active=true
 WHERE atc.curriculum_version=1;

COMMIT;
