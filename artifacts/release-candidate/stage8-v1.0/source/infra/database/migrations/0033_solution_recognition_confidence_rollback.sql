BEGIN;
DROP TRIGGER IF EXISTS solution_teacher_review_enqueue ON mathchakchak.solution_recognition_evaluation;
DROP FUNCTION IF EXISTS mathchakchak.enqueue_solution_teacher_review();
DROP TABLE IF EXISTS mathchakchak.solution_review_queue;
DROP TABLE IF EXISTS mathchakchak.solution_recognition_evaluation;
DROP TABLE IF EXISTS mathchakchak.solution_capture;
COMMIT;
