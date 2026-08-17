BEGIN;
DO $$
DECLARE incomplete integer;
BEGIN
  IF (SELECT count(*) FROM mathchakchak.academy_track_curriculum) <> 48 THEN RAISE EXCEPTION 'expected 48 plans'; END IF;
  IF (SELECT count(*) FROM mathchakchak.academy_track_formula_assignment) <> 288 THEN RAISE EXCEPTION 'expected 288 assignments'; END IF;
  SELECT count(*) INTO incomplete FROM (
    SELECT atc.id
      FROM mathchakchak.academy_track_curriculum atc
      LEFT JOIN mathchakchak.academy_track_formula_assignment a ON a.curriculum_id=atc.id
     GROUP BY atc.id HAVING count(a.id)<>6
  ) invalid;
  IF incomplete <> 0 THEN RAISE EXCEPTION 'every plan must contain six formulas'; END IF;
  BEGIN
    UPDATE mathchakchak.academy_track_curriculum SET concept_percent=99 WHERE grade_code='E1' AND track_code='CONCEPT_RECOVERY';
    RAISE EXCEPTION 'mix constraint did not fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;
ROLLBACK;
