BEGIN;
DO $$
DECLARE target_id uuid := '72000000-0000-4720-8720-000000000101'; decision_id uuid := '72000000-0000-4720-8720-000000000301';
BEGIN
  IF (SELECT count(*) FROM mathchakchak.math_expert_review_protocol WHERE protocol_code='MCC-D80-07-REVIEW-001' AND status='DRAFT_EXTERNAL_REVIEW' AND minimum_distinct_reviewers=2) <> 1 THEN RAISE EXCEPTION 'expert review draft protocol missing'; END IF;
  IF (SELECT count(*) FROM mathchakchak.math_expert_review_criterion WHERE protocol_id='72000000-0000-4720-8720-000000000001') <> 4 THEN RAISE EXCEPTION 'review criteria incomplete'; END IF;
  IF (SELECT count(*) FROM mathchakchak.math_expert_reviewer) <> 0 THEN RAISE EXCEPTION 'synthetic expert identity forbidden'; END IF;
  IF (SELECT count(*) FROM mathchakchak.math_expert_review_target) <> 0 THEN RAISE EXCEPTION 'synthetic expert-reviewed target forbidden'; END IF;

  INSERT INTO mathchakchak.math_expert_reviewer(id,reviewer_identity_reference,status,credential_evidence_reference,credential_verified_by_identity_reference,credential_verified_at,valid_until) VALUES
    ('72000000-0000-4720-8720-000000000201','TEST-EXPERT-REF-A','VERIFIED','TEST-CREDENTIAL-A','TEST-AUTHORITY',now(),current_date+30),
    ('72000000-0000-4720-8720-000000000202','TEST-EXPERT-REF-B','VERIFIED','TEST-CREDENTIAL-B','TEST-AUTHORITY',now(),current_date+30),
    ('72000000-0000-4720-8720-000000000203','TEST-EXPERT-REF-C','VERIFIED','TEST-CREDENTIAL-C','TEST-AUTHORITY',now(),current_date+30);
  INSERT INTO mathchakchak.math_expert_review_target(id,protocol_id,artifact_type,source_reference,revision_no,content_sha256,status)
  VALUES(target_id,'72000000-0000-4720-8720-000000000001','FORMULA_PACKAGE','TEST-TARGET',1,repeat('a',64),'IN_REVIEW');
  INSERT INTO mathchakchak.math_expert_review_assignment(id,target_id,reviewer_id,status,conflict_declaration,assigned_at,acknowledged_at,completed_at) VALUES
    ('72000000-0000-4720-8720-000000000211',target_id,'72000000-0000-4720-8720-000000000201','COMPLETED','NO_CONFLICT',now(),now(),now()),
    ('72000000-0000-4720-8720-000000000212',target_id,'72000000-0000-4720-8720-000000000202','COMPLETED','NO_CONFLICT',now(),now(),now());
  INSERT INTO mathchakchak.math_expert_review_decision(id,assignment_id,reviewed_content_sha256,formula_decision,explanation_decision,answer_decision,difficulty_decision,overall_decision,reason_code,evidence_reference,reviewed_at)
  VALUES(decision_id,'72000000-0000-4720-8720-000000000211',repeat('a',64),'APPROVE','APPROVE','APPROVE','APPROVE','APPROVE','TEST_PASS','TEST-EVIDENCE-A',now());

  BEGIN
    UPDATE mathchakchak.math_expert_review_target SET status='DUAL_APPROVED' WHERE id=target_id;
    RAISE EXCEPTION 'single reviewer incorrectly satisfied dual approval';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO mathchakchak.math_expert_review_decision(id,assignment_id,reviewed_content_sha256,formula_decision,explanation_decision,answer_decision,difficulty_decision,overall_decision,reason_code,evidence_reference,reviewed_at)
  VALUES('72000000-0000-4720-8720-000000000302','72000000-0000-4720-8720-000000000212',repeat('a',64),'APPROVE','APPROVE','APPROVE','APPROVE','APPROVE','TEST_PASS','TEST-EVIDENCE-B',now());
  UPDATE mathchakchak.math_expert_review_target SET status='DUAL_APPROVED' WHERE id=target_id;
  IF (SELECT status FROM mathchakchak.math_expert_review_target WHERE id=target_id) <> 'DUAL_APPROVED' THEN RAISE EXCEPTION 'valid dual approval rejected'; END IF;

  UPDATE mathchakchak.math_expert_review_target SET status='IN_REVIEW' WHERE id=target_id;
  INSERT INTO mathchakchak.math_expert_review_assignment(id,target_id,reviewer_id,review_round,status,conflict_declaration,assigned_at,acknowledged_at,completed_at)
  VALUES('72000000-0000-4720-8720-000000000214',target_id,'72000000-0000-4720-8720-000000000203',2,'COMPLETED','NO_CONFLICT',now(),now(),now());
  INSERT INTO mathchakchak.math_expert_review_decision(id,assignment_id,reviewed_content_sha256,formula_decision,explanation_decision,answer_decision,difficulty_decision,overall_decision,reason_code,evidence_reference,reviewed_at)
  VALUES('72000000-0000-4720-8720-000000000304','72000000-0000-4720-8720-000000000214',repeat('a',64),'REJECT','APPROVE','APPROVE','APPROVE','REJECT','TEST_REJECT','TEST-EVIDENCE-C',now());
  BEGIN
    UPDATE mathchakchak.math_expert_review_target SET status='DUAL_APPROVED' WHERE id=target_id;
    RAISE EXCEPTION 'dual approval accepted despite an unresolved rejection';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO mathchakchak.math_expert_reviewer(id,reviewer_identity_reference,status,credential_evidence_reference,credential_verified_by_identity_reference,credential_verified_at,valid_until)
  VALUES('72000000-0000-4720-8720-000000000204','TEST-EXPERT-REF-D','VERIFIED','TEST-CREDENTIAL-D','TEST-AUTHORITY',now(),current_date);
  INSERT INTO mathchakchak.math_expert_review_assignment(id,target_id,reviewer_id,review_round,status,conflict_declaration,assigned_at,acknowledged_at,completed_at)
  VALUES('72000000-0000-4720-8720-000000000215',target_id,'72000000-0000-4720-8720-000000000204',3,'COMPLETED','NO_CONFLICT',now(),now(),now());
  BEGIN
    INSERT INTO mathchakchak.math_expert_review_decision(id,assignment_id,reviewed_content_sha256,formula_decision,explanation_decision,answer_decision,difficulty_decision,overall_decision,reason_code,evidence_reference,reviewed_at)
    VALUES('72000000-0000-4720-8720-000000000305','72000000-0000-4720-8720-000000000215',repeat('a',64),'APPROVE','APPROVE','APPROVE','APPROVE','APPROVE','EXPIRED_TEST','TEST-EXPIRED',now()+interval '1 day');
    RAISE EXCEPTION 'decision accepted after credential expiry';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE mathchakchak.math_expert_review_decision SET reason_code='MUTATED' WHERE id=decision_id;
    RAISE EXCEPTION 'decision history mutation accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO mathchakchak.math_expert_review_assignment(id,target_id,reviewer_id,review_round,status,conflict_declaration,assigned_at,acknowledged_at,completed_at)
    VALUES('72000000-0000-4720-8720-000000000213',target_id,'72000000-0000-4720-8720-000000000201',2,'COMPLETED','NO_CONFLICT',now(),now(),now());
    INSERT INTO mathchakchak.math_expert_review_decision(id,assignment_id,reviewed_content_sha256,formula_decision,explanation_decision,answer_decision,difficulty_decision,overall_decision,reason_code,evidence_reference,reviewed_at)
    VALUES('72000000-0000-4720-8720-000000000303','72000000-0000-4720-8720-000000000213',repeat('b',64),'APPROVE','APPROVE','APPROVE','APPROVE','APPROVE','BAD_HASH','TEST-BAD-HASH',now());
    RAISE EXCEPTION 'hash-mismatched decision accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
