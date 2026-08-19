import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_ROLES,
  SOCIAL_PROVIDERS,
  accountOnboardingStatus,
  authenticateProviderCallback,
  buildAuthorizationUrl,
  buildSessionCookies,
  buildTransactionCookie,
  clearAuthCookies,
  createOAuthTransaction,
  inspectSocialAuthConfiguration,
  openOAuthTransactionCookie,
  parseCookies,
  verifyOidcIdToken
} from '../../../developer/src/auth/social-login.mjs';

const secret = 'social-login-unit-test-secret-material-32-bytes';
const providerConfig = {
  GOOGLE:{clientId:'google-client',clientSecret:'google-secret'},
  NAVER:{clientId:'naver-client',clientSecret:'naver-secret'},
  KAKAO:{clientId:'kakao-client',clientSecret:'kakao-secret'}
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {status, headers:{'content-type':'application/json'}});
}

test('supported providers and product roles are explicit and immutable', () => {
  assert.deepEqual([...SOCIAL_PROVIDERS], ['GOOGLE','NAVER','KAKAO']);
  assert.deepEqual([...PRODUCT_ROLES], ['STUDENT','PARENT','ACADEMY_OWNER','TEACHER']);
  assert.equal(Object.isFrozen(SOCIAL_PROVIDERS), true);
  assert.equal(Object.isFrozen(PRODUCT_ROLES), true);
});

test('provider preflight reports configured providers without exposing secrets', () => {
  const result = inspectSocialAuthConfiguration({
    publicBaseUrl:'https://dev.mathchakchak.example',
    transactionSecret:secret,
    providers:{
      GOOGLE:providerConfig.GOOGLE,
      NAVER:{clientId:'naver-client'},
      KAKAO:providerConfig.KAKAO
    }
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.providers, {GOOGLE:true,NAVER:false,KAKAO:true});
  assert.deepEqual(result.missing, ['NAVER_CLIENT_SECRET']);
  assert.doesNotMatch(JSON.stringify(result), /google-secret|kakao-secret/);
});

test('transaction cookie is signed, time-limited and tamper evident', () => {
  const transaction = createOAuthTransaction({
    provider:'GOOGLE', role:'STUDENT', returnTo:'/curriculum/?locale=ko', locale:'ko',
    transactionSecret:secret, now:1_000
  });
  assert.equal(transaction.expiresAt, 1_600);
  assert.match(transaction.codeChallenge, /^[A-Za-z0-9_-]{43}$/);
  const opened = openOAuthTransactionCookie(transaction.cookieValue, secret, {now:1_100});
  assert.equal(opened.provider, 'GOOGLE');
  assert.equal(opened.role, 'STUDENT');
  assert.equal(opened.return_to, '/curriculum/?locale=ko');
  assert.throws(() => openOAuthTransactionCookie(`${transaction.cookieValue.slice(0,-1)}x`, secret, {now:1_100}), /OAUTH_TRANSACTION_INVALID/);
  assert.throws(() => openOAuthTransactionCookie(transaction.cookieValue, secret, {now:1_601}), /OAUTH_TRANSACTION_EXPIRED/);
});

test('authorization URLs apply provider-specific state, nonce and PKCE rules', () => {
  const tx = createOAuthTransaction({provider:'GOOGLE',role:'PARENT',returnTo:'/',locale:'ko',transactionSecret:secret,now:1_000});
  const google = new URL(buildAuthorizationUrl({provider:'GOOGLE',config:providerConfig.GOOGLE,transaction:tx,redirectUri:'https://example.test/api/v1/auth/oauth/google/callback'}));
  assert.equal(google.origin, 'https://accounts.google.com');
  assert.equal(google.searchParams.get('state'), tx.state);
  assert.equal(google.searchParams.get('nonce'), tx.nonce);
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(google.searchParams.get('scope'), 'openid profile');

  const naver = new URL(buildAuthorizationUrl({provider:'NAVER',config:providerConfig.NAVER,transaction:{...tx,provider:'NAVER'},redirectUri:'https://example.test/api/v1/auth/oauth/naver/callback'}));
  assert.equal(naver.origin, 'https://nid.naver.com');
  assert.equal(naver.searchParams.get('state'), tx.state);
  assert.equal(naver.searchParams.has('nonce'), false);
  assert.equal(naver.searchParams.has('code_challenge'), false);

  const kakao = new URL(buildAuthorizationUrl({provider:'KAKAO',config:providerConfig.KAKAO,transaction:{...tx,provider:'KAKAO'},redirectUri:'https://example.test/api/v1/auth/oauth/kakao/callback'}));
  assert.equal(kakao.origin, 'https://kauth.kakao.com');
  assert.equal(kakao.searchParams.get('nonce'), tx.nonce);
  assert.equal(kakao.searchParams.get('code_challenge_method'), 'S256');
});

test('OIDC ID tokens require valid signature, issuer, audience, expiry and nonce', async () => {
  const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {modulusLength:2048});
  const jwk = publicKey.export({format:'jwk'});
  jwk.kid = 'unit-key';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  const header = Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,typ:'JWT'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'google-client',sub:'provider-subject',iat:1_000,exp:1_300,nonce:'nonce-1'})).toString('base64url');
  const input = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  const token = `${input}.${signature}`;
  const fetchImpl = async () => jsonResponse({keys:[jwk]});
  const claims = await verifyOidcIdToken(token, {
    issuer:['https://accounts.google.com','accounts.google.com'], audience:'google-client', nonce:'nonce-1',
    jwksUri:'https://example.test/jwks', fetchImpl, now:1_100
  });
  assert.equal(claims.sub, 'provider-subject');
  await assert.rejects(() => verifyOidcIdToken(token, {issuer:['https://accounts.google.com'],audience:'other-client',nonce:'nonce-1',jwksUri:'https://example.test/jwks',fetchImpl,now:1_100}), /OIDC_TOKEN_INVALID/);
  await assert.rejects(() => verifyOidcIdToken(token, {issuer:['https://accounts.google.com'],audience:'google-client',nonce:'wrong',jwksUri:'https://example.test/jwks',fetchImpl,now:1_100}), /OIDC_TOKEN_INVALID/);
});

test('Naver callback exchanges code, resolves only stable subject and discards provider tokens', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({url:String(url),options});
    if (String(url).includes('/oauth2.0/token')) return jsonResponse({access_token:'provider-access-token',token_type:'bearer',expires_in:'3600'});
    return jsonResponse({resultcode:'00',message:'success',response:{id:'naver-subject',email:'not-persisted@example.test',name:'Not Persisted'}});
  };
  const identity = await authenticateProviderCallback({
    provider:'NAVER', code:'authorization-code', state:'state-1', expectedState:'state-1',
    redirectUri:'https://example.test/api/v1/auth/oauth/naver/callback', config:providerConfig.NAVER, fetchImpl
  });
  assert.deepEqual(identity, {provider:'NAVER',subject:'naver-subject'});
  assert.equal(calls.length, 2);
  assert.doesNotMatch(JSON.stringify(identity), /provider-access-token|email|name/i);
});

test('role onboarding is fail-closed for students and academy staff', () => {
  assert.equal(accountOnboardingStatus('PARENT'), 'PENDING_ONBOARDING');
  assert.equal(accountOnboardingStatus('STUDENT'), 'PENDING_ONBOARDING');
  assert.equal(accountOnboardingStatus('ACADEMY_OWNER'), 'PENDING_ONBOARDING');
  assert.throws(() => accountOnboardingStatus('ADMIN'), /PRODUCT_ROLE_INVALID/);
});

test('session cookies are host-only, secure and removable without local storage', () => {
  const cookies = buildSessionCookies({sessionToken:'session-token',csrfToken:'csrf-token',secure:true,maxAgeSeconds:2_592_000});
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /^__Host-mcc_session=/);
  for (const attribute of ['HttpOnly','Secure','SameSite=Lax','Path=/']) assert.match(cookies[0], new RegExp(attribute));
  assert.doesNotMatch(cookies[1], /HttpOnly/);
  assert.deepEqual(parseCookies('__Host-mcc_session=session-token; mcc_csrf=csrf-token'), {'__Host-mcc_session':'session-token',mcc_csrf:'csrf-token'});
  const transactionCookie = buildTransactionCookie('sealed-value',{secure:true});
  for (const attribute of ['HttpOnly','Secure','SameSite=Lax']) assert.match(transactionCookie,new RegExp(attribute));
  assert.equal(clearAuthCookies({secure:true}).every((cookie) => /Max-Age=0/.test(cookie)), true);
});
