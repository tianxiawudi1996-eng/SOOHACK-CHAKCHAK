import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const files=[
  'developer/src/auth/social-login.mjs',
  'developer/src/auth/social-auth-service.mjs',
  'developer/src/api/repository.mjs',
  'developer/src/api/server.mjs',
  'client/auth/index.html',
  'client/auth/app.js',
  'client/auth/messages.mjs',
  'infra/database/migrations/0041_social_login_lifecycle.sql',
  'infra/database/migrations/0041_social_login_lifecycle_rollback.sql',
  'infra/database/tests/0041_social_login_lifecycle_smoke.sql',
  'docs/developer/productization/SOCIAL_LOGIN_LIFECYCLE_v1.0.md',
  'docs/developer/productization/SOCIAL_LOGIN_INTEGRATION_PREFLIGHT_v1.0.md',
  'docs/productization/evidence/PHASE_76_SOCIAL_LOGIN_QA.json',
  'docs/productization/reports/PHASE_76_SOCIAL_LOGIN_LIFECYCLE_REPORT.md'
];
const missing=files.filter((file)=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing:${missing.join(',')}`);

const login=readFileSync(resolve(root,files[0]),'utf8');
const service=readFileSync(resolve(root,files[1]),'utf8');
const repository=readFileSync(resolve(root,files[2]),'utf8');
const server=readFileSync(resolve(root,files[3]),'utf8');
const app=readFileSync(resolve(root,files[5]),'utf8');
const migration=readFileSync(resolve(root,files[7]),'utf8');
const rollback=readFileSync(resolve(root,files[8]),'utf8');
const evidence=JSON.parse(readFileSync(resolve(root,files[12]),'utf8'));

for(const value of ['GOOGLE','NAVER','KAKAO','STUDENT','PARENT','ACADEMY_OWNER','TEACHER']){
  if(!login.includes(`'${value}'`))throw new Error(`identity contract missing:${value}`);
}
for(const marker of ['code_challenge_method','S256','nonce','state','__Host-mcc_session','HttpOnly','SameSite']){
  if(!login.includes(marker))throw new Error(`oauth control missing:${marker}`);
}
for(const route of ['/api/v1/auth/providers','/api/v1/auth/session','/api/v1/auth/onboarding','/api/v1/auth/logout']){
  if(!server.includes(route))throw new Error(`route missing:${route}`);
}
for(const method of ['createOAuthLoginTransaction','completeSocialLogin','resolveAuthSession','completeAuthOnboarding','revokeAuthSession']){
  if(!repository.includes(method))throw new Error(`repository lifecycle missing:${method}`);
}
for(const table of ['social_identity','oauth_login_transaction','auth_session','auth_role_onboarding','auth_event']){
  if(!migration.includes(`CREATE TABLE mathchakchak.${table}`)||!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`)){
    throw new Error(`migration symmetry:${table}`);
  }
}
for(const forbidden of ['localStorage','sessionStorage','access_token=','refresh_token=']){
  if(app.includes(forbidden))throw new Error(`browser secret persistence:${forbidden}`);
}
if(!service.includes("UNDER_14_GUARDIAN_REQUIRED")||!repository.includes("PENDING_ACADEMY_VERIFICATION"))throw new Error('role verification gate missing');
if(!migration.includes('authentication events are append-only')||!migration.includes('REVOKE ALL'))throw new Error('database audit boundary missing');
if(evidence.status!=='LOCAL_SOCIAL_LOGIN_LIFECYCLE_PASS_EXTERNAL_PROVIDER_HOLD'||evidence.truth_boundary.external_provider_login_verified||evidence.truth_boundary.external_deployment_performed){
  throw new Error('evidence truth boundary invalid');
}

console.log('SOCIAL_LOGIN_PHASE76_STATIC_PASS');
console.log('providers=3/3 roles=4/4 lifecycle_controls=PASS');
console.log('external_provider_login=HOLD');
