import crypto from 'node:crypto';

export const SOCIAL_PROVIDERS = Object.freeze(['GOOGLE','NAVER','KAKAO']);
export const PRODUCT_ROLES = Object.freeze(['STUDENT','PARENT','ACADEMY_OWNER','TEACHER']);
export const AUTH_ACCOUNT_STATUSES = Object.freeze([
  'PENDING_ONBOARDING','PENDING_GUARDIAN','PENDING_ACADEMY_VERIFICATION',
  'ACTIVE','LOCKED','SUSPENDED','WITHDRAWN','DELETED'
]);

const PROVIDER_ENDPOINTS = Object.freeze({
  GOOGLE:Object.freeze({
    authorization:'https://accounts.google.com/o/oauth2/v2/auth',
    token:'https://oauth2.googleapis.com/token',
    issuer:['https://accounts.google.com','accounts.google.com'],
    jwks:'https://www.googleapis.com/oauth2/v3/certs'
  }),
  NAVER:Object.freeze({
    authorization:'https://nid.naver.com/oauth2.0/authorize',
    token:'https://nid.naver.com/oauth2.0/token',
    profile:'https://openapi.naver.com/v1/nid/me'
  }),
  KAKAO:Object.freeze({
    authorization:'https://kauth.kakao.com/oauth/authorize',
    token:'https://kauth.kakao.com/oauth/token',
    issuer:['https://kauth.kakao.com'],
    jwks:'https://kauth.kakao.com/.well-known/jwks.json'
  })
});

const TRANSACTION_VERSION = 'mcco1';
const TRANSACTION_TTL_SECONDS = 600;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_COOKIE_SECURE = '__Host-mcc_session';
const SESSION_COOKIE_LOCAL = 'mcc_session';
const TRANSACTION_COOKIE = 'mcc_oauth_tx';
const CSRF_COOKIE = 'mcc_csrf';

function fail(code) {
  throw new Error(code);
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) fail('OAUTH_TRANSACTION_SECRET_INVALID');
}

function assertProvider(provider) {
  if (!SOCIAL_PROVIDERS.includes(provider)) fail('SOCIAL_PROVIDER_INVALID');
  return provider;
}

function assertRole(role) {
  if (!PRODUCT_ROLES.includes(role)) fail('PRODUCT_ROLE_INVALID');
  return role;
}

function safeReturnTo(value = '/') {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    fail('RETURN_TO_INVALID');
  }
  return value;
}

function safeLocale(value = 'en') {
  const supported = ['ko','zh-CN','ja','en','es','fr','it','ru'];
  return supported.includes(value) ? value : 'en';
}

function randomValue(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashAuthValue(value) {
  if (typeof value !== 'string' || value.length < 1) fail('AUTH_VALUE_INVALID');
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function constantEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function seal(payload, secret) {
  assertSecret(secret);
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const input = `${TRANSACTION_VERSION}.${encoded}`;
  return `${input}.${hmac(input, secret)}`;
}

function unseal(value, secret) {
  assertSecret(secret);
  if (typeof value !== 'string' || Buffer.byteLength(value) > 4096) fail('OAUTH_TRANSACTION_INVALID');
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== TRANSACTION_VERSION) fail('OAUTH_TRANSACTION_INVALID');
  const input = `${parts[0]}.${parts[1]}`;
  if (!constantEqual(parts[2], hmac(input, secret))) fail('OAUTH_TRANSACTION_INVALID');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    fail('OAUTH_TRANSACTION_INVALID');
  }
}

export function inspectSocialAuthConfiguration({publicBaseUrl,transactionSecret,providers = {}} = {}) {
  const missing = [];
  try {
    const parsed = new URL(publicBaseUrl);
    if (!['http:','https:'].includes(parsed.protocol) || parsed.origin !== String(publicBaseUrl).replace(/\/$/,'')) missing.push('PUBLIC_BASE_URL');
  } catch {
    missing.push('PUBLIC_BASE_URL');
  }
  if (typeof transactionSecret !== 'string' || Buffer.byteLength(transactionSecret) < 32) missing.push('OAUTH_TRANSACTION_SECRET');
  const readiness = {};
  for (const provider of SOCIAL_PROVIDERS) {
    const item = providers[provider] || {};
    if (!item.clientId) missing.push(`${provider}_CLIENT_ID`);
    if (!item.clientSecret) missing.push(`${provider}_CLIENT_SECRET`);
    readiness[provider] = Boolean(item.clientId && item.clientSecret);
  }
  return {ready:missing.length === 0,providers:readiness,missing};
}

export function createOAuthTransaction({provider,role,returnTo='/',locale='en',transactionSecret,now=Math.floor(Date.now()/1000)} = {}) {
  assertProvider(provider);
  assertRole(role);
  assertSecret(transactionSecret);
  const state = randomValue();
  const nonce = randomValue();
  const codeVerifier = randomValue();
  const expiresAt = now + TRANSACTION_TTL_SECONDS;
  const payload = {
    id:crypto.randomUUID(), provider, role, state, nonce, code_verifier:codeVerifier,
    return_to:safeReturnTo(returnTo), locale:safeLocale(locale), iat:now, exp:expiresAt
  };
  return {
    id:payload.id,provider,role,state,nonce,codeVerifier,
    codeChallenge:crypto.createHash('sha256').update(codeVerifier).digest('base64url'),
    returnTo:payload.return_to,locale:payload.locale,expiresAt,
    stateHash:hashAuthValue(state),nonceHash:hashAuthValue(nonce),
    cookieValue:seal(payload,transactionSecret)
  };
}

export function openOAuthTransactionCookie(value, secret, {now=Math.floor(Date.now()/1000)} = {}) {
  const payload = unseal(value, secret);
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= payload.iat || payload.exp - payload.iat !== TRANSACTION_TTL_SECONDS) fail('OAUTH_TRANSACTION_INVALID');
  if (payload.exp <= now) fail('OAUTH_TRANSACTION_EXPIRED');
  assertProvider(payload.provider);
  assertRole(payload.role);
  safeReturnTo(payload.return_to);
  if (![payload.state,payload.nonce,payload.code_verifier].every((item) => typeof item === 'string' && item.length >= 32)) fail('OAUTH_TRANSACTION_INVALID');
  return payload;
}

export function buildAuthorizationUrl({provider,config,transaction,redirectUri} = {}) {
  assertProvider(provider);
  if (!config?.clientId || !config?.clientSecret) fail('SOCIAL_PROVIDER_NOT_CONFIGURED');
  const url = new URL(PROVIDER_ENDPOINTS[provider].authorization);
  url.searchParams.set('response_type','code');
  url.searchParams.set('client_id',config.clientId);
  url.searchParams.set('redirect_uri',redirectUri);
  url.searchParams.set('state',transaction.state);
  if (provider === 'GOOGLE') {
    url.searchParams.set('scope','openid profile');
    url.searchParams.set('nonce',transaction.nonce);
    url.searchParams.set('code_challenge',transaction.codeChallenge);
    url.searchParams.set('code_challenge_method','S256');
    url.searchParams.set('prompt','select_account');
  } else if (provider === 'KAKAO') {
    url.searchParams.set('scope','openid profile_nickname');
    url.searchParams.set('nonce',transaction.nonce);
    url.searchParams.set('code_challenge',transaction.codeChallenge);
    url.searchParams.set('code_challenge_method','S256');
  }
  return url.toString();
}

function formRequest(parameters) {
  return {
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json'},
    body:new URLSearchParams(parameters).toString(),
    redirect:'error'
  };
}

async function readProviderJson(response) {
  if (!response?.ok) fail('OAUTH_PROVIDER_UNAVAILABLE');
  try {
    return await response.json();
  } catch {
    fail('OAUTH_PROVIDER_RESPONSE_INVALID');
  }
}

function decodeJwtPart(value) {
  try {
    return JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
  } catch {
    fail('OIDC_TOKEN_INVALID');
  }
}

export async function verifyOidcIdToken(token,{issuer,audience,nonce,jwksUri,fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}) {
  if (typeof token !== 'string' || Buffer.byteLength(token) > 16_384) fail('OIDC_TOKEN_INVALID');
  const parts = token.split('.');
  if (parts.length !== 3) fail('OIDC_TOKEN_INVALID');
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') fail('OIDC_TOKEN_INVALID');
  const jwks = await readProviderJson(await fetchImpl(jwksUri,{headers:{accept:'application/json'},redirect:'error'}));
  const jwk = Array.isArray(jwks.keys) ? jwks.keys.find((item) => item.kid === header.kid && item.kty === 'RSA') : null;
  if (!jwk) fail('OIDC_TOKEN_INVALID');
  let key;
  try {
    key = crypto.createPublicKey({key:jwk,format:'jwk'});
  } catch {
    fail('OIDC_TOKEN_INVALID');
  }
  const verified = crypto.verify('RSA-SHA256',Buffer.from(`${parts[0]}.${parts[1]}`),key,Buffer.from(parts[2],'base64url'));
  const issuers = Array.isArray(issuer) ? issuer : [issuer];
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!verified || !issuers.includes(claims.iss) || !audiences.includes(audience) || typeof claims.sub !== 'string' || claims.sub.length < 1 || claims.sub.length > 255 || !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > now + 60 || claims.exp <= now || !constantEqual(claims.nonce,nonce)) {
    fail('OIDC_TOKEN_INVALID');
  }
  return claims;
}

export async function authenticateProviderCallback({provider,code,state,expectedState,nonce,codeVerifier,redirectUri,config,fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}) {
  assertProvider(provider);
  if (!config?.clientId || !config?.clientSecret) fail('SOCIAL_PROVIDER_NOT_CONFIGURED');
  if (typeof code !== 'string' || code.length < 1 || code.length > 2048 || !constantEqual(state,expectedState)) fail('OAUTH_CALLBACK_INVALID');
  const parameters = {
    grant_type:'authorization_code',client_id:config.clientId,client_secret:config.clientSecret,
    redirect_uri:redirectUri,code
  };
  if (provider === 'NAVER') parameters.state = state;
  else parameters.code_verifier = codeVerifier;
  const tokens = await readProviderJson(await fetchImpl(PROVIDER_ENDPOINTS[provider].token,formRequest(parameters)));
  if (provider === 'NAVER') {
    if (typeof tokens.access_token !== 'string' || tokens.access_token.length < 1) fail('OAUTH_PROVIDER_RESPONSE_INVALID');
    const profile = await readProviderJson(await fetchImpl(PROVIDER_ENDPOINTS.NAVER.profile,{
      headers:{authorization:`Bearer ${tokens.access_token}`,accept:'application/json'},redirect:'error'
    }));
    if (profile.resultcode !== '00' || typeof profile.response?.id !== 'string' || profile.response.id.length < 1 || profile.response.id.length > 255) fail('OAUTH_PROVIDER_RESPONSE_INVALID');
    return {provider,subject:profile.response.id};
  }
  if (typeof tokens.id_token !== 'string') fail('OAUTH_PROVIDER_RESPONSE_INVALID');
  const endpoints = PROVIDER_ENDPOINTS[provider];
  const claims = await verifyOidcIdToken(tokens.id_token,{
    issuer:endpoints.issuer,audience:config.clientId,nonce,jwksUri:endpoints.jwks,fetchImpl,now
  });
  return {provider,subject:claims.sub};
}

export function accountOnboardingStatus(role) {
  assertRole(role);
  return 'PENDING_ONBOARDING';
}

export function createSessionCredentials() {
  const sessionToken = randomValue();
  const csrfToken = randomValue();
  return {
    sessionToken,csrfToken,
    sessionTokenHash:hashAuthValue(sessionToken),csrfTokenHash:hashAuthValue(csrfToken)
  };
}

export function sessionCookieName(secure = true) {
  return secure ? SESSION_COOKIE_SECURE : SESSION_COOKIE_LOCAL;
}

function cookie(name,value,{httpOnly=false,secure=false,path='/',maxAge=SESSION_MAX_AGE_SECONDS,sameSite='Lax'}={}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`,`Max-Age=${maxAge}`,`Path=${path}`,`SameSite=${sameSite}`];
  if (httpOnly) attributes.push('HttpOnly');
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function buildTransactionCookie(value,{secure=true}={}) {
  return cookie(TRANSACTION_COOKIE,value,{httpOnly:true,secure,path:'/api/v1/auth/oauth/',maxAge:TRANSACTION_TTL_SECONDS});
}

export function buildSessionCookies({sessionToken,csrfToken,secure=true,maxAgeSeconds=SESSION_MAX_AGE_SECONDS}={}) {
  return [
    cookie(sessionCookieName(secure),sessionToken,{httpOnly:true,secure,maxAge:maxAgeSeconds}),
    cookie(CSRF_COOKIE,csrfToken,{httpOnly:false,secure,maxAge:maxAgeSeconds})
  ];
}

export function clearAuthCookies({secure=true}={}) {
  return [
    cookie(sessionCookieName(secure),'',{httpOnly:true,secure,maxAge:0}),
    cookie(CSRF_COOKIE,'',{httpOnly:false,secure,maxAge:0}),
    cookie(TRANSACTION_COOKIE,'',{httpOnly:true,secure,path:'/api/v1/auth/oauth/',maxAge:0})
  ];
}

export function parseCookies(value = '') {
  const parsed = {};
  for (const item of String(value).split(';')) {
    const index = item.indexOf('=');
    if (index < 1) continue;
    const name = item.slice(0,index).trim();
    try { parsed[name] = decodeURIComponent(item.slice(index+1).trim()); } catch { /* ignore malformed cookies */ }
  }
  return parsed;
}

export function authCookieNames({secure=true}={}) {
  return {session:sessionCookieName(secure),csrf:CSRF_COOKIE,transaction:TRANSACTION_COOKIE};
}
