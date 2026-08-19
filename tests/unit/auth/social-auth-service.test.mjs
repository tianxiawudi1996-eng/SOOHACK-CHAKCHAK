import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialAuthService,validateOnboarding} from '../../../developer/src/auth/social-auth-service.mjs';
import {hashAuthValue,openOAuthTransactionCookie} from '../../../developer/src/auth/social-login.mjs';

const secret='social-auth-service-unit-secret-at-least-32-bytes';
const config={
  publicBaseUrl:'https://mathchakchak.example',transactionSecret:secret,secureCookies:true,
  providers:{
    GOOGLE:{clientId:'google-id',clientSecret:'google-secret'},
    NAVER:{clientId:'naver-id',clientSecret:'naver-secret'},
    KAKAO:{clientId:'kakao-id',clientSecret:'kakao-secret'}
  }
};

function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});}
function cookieValue(setCookie,name){return decodeURIComponent(setCookie.match(new RegExp(`${name}=([^;]+)`))[1]);}

test('Naver start and callback persist only hashes then issue MathChakChak cookies',async()=>{
  const calls={};
  const repository={
    async createOAuthLoginTransaction(input){calls.transaction=input;},
    async getOAuthLoginTransaction(input){calls.lookup=input;return {status:'PENDING'};},
    async completeSocialLogin(input){calls.complete=input;return {account_status:'PENDING_ONBOARDING',role:'PARENT',auth_level:'ONBOARDING'};}
  };
  const fetchImpl=async(url)=>String(url).includes('/oauth2.0/token')
    ? json({access_token:'provider-token-never-persisted'})
    : json({resultcode:'00',response:{id:'naver-stable-subject',email:'discarded@example.test'}});
  const auth=createSocialAuthService({repository,config,fetchImpl,now:()=>1_000});
  const start=await auth.begin({provider:'NAVER',role:'PARENT',returnTo:'/curriculum/',locale:'ko'});
  assert.equal(calls.transaction.provider,'NAVER');
  assert.match(calls.transaction.stateHash,/^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(calls.transaction).includes('code_verifier'),false);
  const sealed=cookieValue(start.cookies[0],'mcc_oauth_tx');
  const tx=openOAuthTransactionCookie(sealed,secret,{now:1_001});
  const completed=await auth.complete({provider:'NAVER',code:'code-1',state:tx.state,cookieHeader:`mcc_oauth_tx=${encodeURIComponent(sealed)}`});
  assert.equal(completed.location,'/auth/?locale=ko&onboarding=required');
  assert.equal(completed.cookies.some(item=>item.startsWith('__Host-mcc_session=')),true);
  assert.equal(calls.complete.subjectHash,hashAuthValue('NAVER:naver-stable-subject'));
  assert.doesNotMatch(JSON.stringify(calls.complete),/provider-token-never-persisted|discarded@example/);
});

test('cookie session requires matching CSRF and full activation for protected actor',async()=>{
  const session={session_id:'session-1',user_id:'11111111-1111-4111-8111-111111111111',role:'PARENT',account_status:'ACTIVE',auth_level:'FULL',csrf_token_hash:hashAuthValue('csrf-value'),onboarding_status:'COMPLETED'};
  const repository={resolveAuthSession:async()=>session};
  const auth=createSocialAuthService({repository,config});
  const request={method:'POST',headers:{cookie:'__Host-mcc_session=session-value; mcc_csrf=csrf-value','x-csrf-token':'csrf-value'}};
  assert.deepEqual(await auth.actor(request),{userId:session.user_id,role:'PARENT'});
  await assert.rejects(()=>auth.actor({...request,headers:{...request.headers,'x-csrf-token':'wrong'}}),error=>error.code==='CSRF_VALIDATION_FAILED');
  session.auth_level='ONBOARDING';
  await assert.rejects(()=>auth.actor(request),error=>error.code==='ACCOUNT_ONBOARDING_REQUIRED');
});

test('session inspection returns an anonymous state without raising an authentication error',async()=>{
  const repository={resolveAuthSession:async()=>null};
  const auth=createSocialAuthService({repository,config});
  assert.deepEqual(await auth.session({method:'GET',headers:{cookie:''}}),{authenticated:false});
});

test('role onboarding validates guardian and academy gates without self-elevation',()=>{
  assert.deepEqual(validateOnboarding('PARENT',{terms_version:'MCC-TERMS-2026-01'}),{termsVersion:'MCC-TERMS-2026-01'});
  assert.deepEqual(validateOnboarding('STUDENT',{terms_version:'MCC-TERMS-2026-01',grade_code:'E4',age_assurance:'UNDER_14_GUARDIAN_REQUIRED'}),{
    termsVersion:'MCC-TERMS-2026-01',gradeCode:'E4',ageAssurance:'UNDER_14_GUARDIAN_REQUIRED'
  });
  assert.throws(()=>validateOnboarding('TEACHER',{terms_version:'MCC-TERMS-2026-01'}),error=>error.code==='ACADEMY_REFERENCE_REQUIRED');
  assert.deepEqual(validateOnboarding('ACADEMY_OWNER',{terms_version:'MCC-TERMS-2026-01',academy_reference:'ACADEMY-VERIFY-001'}),{
    termsVersion:'MCC-TERMS-2026-01',academyReference:'ACADEMY-VERIFY-001'
  });
});
