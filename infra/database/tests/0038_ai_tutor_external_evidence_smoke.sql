BEGIN;DO $$ BEGIN
IF(SELECT count(*) FROM mathchakchak.ai_tutor_evidence_protocol WHERE protocol_code='MCC-D80-08-EVIDENCE-001' AND status='DRAFT_EXTERNAL_REVIEW')<>1 THEN RAISE EXCEPTION 'protocol missing';END IF;
IF(SELECT count(*) FROM mathchakchak.ai_tutor_evidence_criterion WHERE protocol_id='73000000-0000-4730-8730-000000000001')<>8 THEN RAISE EXCEPTION 'criteria incomplete';END IF;
IF(SELECT count(*) FROM mathchakchak.ai_tutor_model_evaluation_run)<>0 OR(SELECT count(*) FROM mathchakchak.ai_tutor_model_evaluation_summary)<>0 OR(SELECT count(*) FROM mathchakchak.ai_tutor_model_human_calibration)<>0 THEN RAISE EXCEPTION 'synthetic live evidence forbidden';END IF;
BEGIN INSERT INTO mathchakchak.ai_tutor_model_evaluation_run(id,protocol_id,pin_id,run_reference,status,provider_live_tested,locale_count,evaluated_case_count,started_at)VALUES(gen_random_uuid(),'73000000-0000-4730-8730-000000000001',gen_random_uuid(),'INVALID','STARTED',false,8,1,now());RAISE EXCEPTION 'non-live run accepted';EXCEPTION WHEN check_violation OR foreign_key_violation THEN NULL;END;
END $$;ROLLBACK;
