BEGIN;
DO $$
DECLARE
  user_id uuid := '76000000-0000-4760-8760-000000000001';
  transaction_id uuid := '76000000-0000-4760-8760-000000000002';
  session_id uuid := '76000000-0000-4760-8760-000000000003';
  event_id uuid := '76000000-0000-4760-8760-000000000004';
BEGIN
  INSERT INTO mathchakchak.app_user(id,auth_subject,role,status)
  VALUES(user_id,'oauth:google:' || repeat('a',64),'ACADEMY_OWNER','PENDING_ONBOARDING');
  INSERT INTO mathchakchak.social_identity(id,user_id,provider,subject_hash)
  VALUES(gen_random_uuid(),user_id,'GOOGLE',repeat('b',64));
  INSERT INTO mathchakchak.oauth_login_transaction
    (id,provider,requested_role,state_hash,nonce_hash,pkce_method,return_to,locale,expires_at)
  VALUES(transaction_id,'GOOGLE','ACADEMY_OWNER',repeat('c',64),repeat('d',64),'S256','/academy/','ko',now()+interval '10 minutes');
  INSERT INTO mathchakchak.auth_session
    (id,user_id,provider,session_token_hash,csrf_token_hash,auth_level,idle_expires_at,absolute_expires_at)
  VALUES(session_id,user_id,'GOOGLE',repeat('e',64),repeat('f',64),'ONBOARDING',now()+interval '12 hours',now()+interval '30 days');
  INSERT INTO mathchakchak.auth_event(id,user_id,session_id,event_type,provider,outcome)
  VALUES(event_id,user_id,session_id,'SOCIAL_ACCOUNT_CREATED','GOOGLE','SUCCESS');
  BEGIN
    UPDATE mathchakchak.auth_event SET outcome='FAILED' WHERE id=event_id;
    RAISE EXCEPTION 'append-only auth event accepted mutation';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO mathchakchak.auth_event(id,event_type,outcome,metadata)
    VALUES(gen_random_uuid(),'OAUTH_FAILED','FAILED','{"access_token":"forbidden"}'::jsonb);
    RAISE EXCEPTION 'sensitive auth metadata was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
