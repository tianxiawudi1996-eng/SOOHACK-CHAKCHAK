import crypto from 'node:crypto';
import {ApiError} from '../api/errors.mjs';
import {
  PRODUCT_ROLES,
  SOCIAL_PROVIDERS,
  accountOnboardingStatus,
  authCookieNames,
  authenticateProviderCallback,
  buildAuthorizationUrl,
  buildSessionCookies,
  buildTransactionCookie,
  clearAuthCookies,
  createOAuthTransaction,
  createSessionCredentials,
  hashAuthValue,
  inspectSocialAuthConfiguration,
  openOAuthTransactionCookie,
  parseCookies
} from './social-login.mjs';

const IDLE_SECONDS = 12 * 60 * 60;
const ABSOLUTE_SECONDS = 30 * 24 * 60 * 60;
const GRADE_CODES = new Set(['E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3']);
const AGE_ASSURANCES = new Set(['AGE_14_PLUS_ATTESTED','UNDER_14_GUARDIAN_REQUIRED']);
const REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9._:-]{7,190}$/;

function apiError(status,code,key='error.authentication') {
  return new ApiError(status,code,key);
}

function mapAuthError(error) {
  if (error instanceof ApiError) return error;
  const code = String(error?.message || 'AUTHENTICATION_FAILED');
  if (code === 'SOCIAL_PROVIDER_NOT_CONFIGURED') return apiError(503,code,'error.provider_unavailable');
  if (code === 'OAUTH_PROVIDER_UNAVAILABLE') return apiError(503,code,'error.provider_unavailable');
  if (code === 'OAUTH_TRANSACTION_EXPIRED') return apiError(401,code,'error.authentication_expired');
  if (['OAUTH_CALLBACK_INVALID','OAUTH_TRANSACTION_INVALID','OIDC_TOKEN_INVALID','OAUTH_PROVIDER_RESPONSE_INVALID'].includes(code)) {
    return apiError(401,'SOCIAL_AUTHENTICATION_FAILED','error.authentication_failed');
  }
  return apiError(400,code,'error.authentication');
}

function callbackPath(provider) {
  return `/api/v1/auth/oauth/${provider.toLowerCase()}/callback`;
}

function providerConfigured(config,provider) {
  return Boolean(config.providers?.[provider]?.clientId && config.providers?.[provider]?.clientSecret);
}

function validateOnboarding(role,body={}) {
  if (!PRODUCT_ROLES.includes(role)) throw apiError(400,'PRODUCT_ROLE_INVALID');
  if (typeof body.terms_version !== 'string' || !REFERENCE_PATTERN.test(body.terms_version)) throw apiError(400,'TERMS_ACCEPTANCE_REQUIRED');
  const result = {termsVersion:body.terms_version};
  if (role === 'STUDENT') {
    if (!GRADE_CODES.has(body.grade_code)) throw apiError(400,'GRADE_CODE_INVALID');
    if (!AGE_ASSURANCES.has(body.age_assurance)) throw apiError(400,'AGE_ASSURANCE_REQUIRED');
    result.gradeCode = body.grade_code;
    result.ageAssurance = body.age_assurance;
  } else if (role === 'ACADEMY_OWNER' || role === 'TEACHER') {
    if (typeof body.academy_reference !== 'string' || !REFERENCE_PATTERN.test(body.academy_reference)) throw apiError(400,'ACADEMY_REFERENCE_REQUIRED');
    result.academyReference = body.academy_reference;
  }
  return result;
}

export function socialAuthConfigFromEnvironment(env={},baseUrl) {
  const publicBaseUrl = String(env.PUBLIC_BASE_URL || baseUrl || '').replace(/\/$/,'');
  return {
    publicBaseUrl,
    transactionSecret:env.OAUTH_TRANSACTION_SECRET || env.SESSION_HMAC_SECRET,
    secureCookies:new URL(publicBaseUrl).protocol === 'https:',
    providers:{
      GOOGLE:{clientId:env.GOOGLE_OAUTH_CLIENT_ID,clientSecret:env.GOOGLE_OAUTH_CLIENT_SECRET},
      NAVER:{clientId:env.NAVER_OAUTH_CLIENT_ID,clientSecret:env.NAVER_OAUTH_CLIENT_SECRET},
      KAKAO:{clientId:env.KAKAO_OAUTH_CLIENT_ID,clientSecret:env.KAKAO_OAUTH_CLIENT_SECRET}
    }
  };
}

export function createSocialAuthService({repository,config,fetchImpl=fetch,now=()=>Math.floor(Date.now()/1000)}={}) {
  if (!repository) throw new Error('SOCIAL_AUTH_REPOSITORY_REQUIRED');
  const inspection = inspectSocialAuthConfiguration(config);
  const cookieNames = authCookieNames({secure:config.secureCookies});

  return Object.freeze({
    readiness() {
      return inspection;
    },

    providers() {
      return SOCIAL_PROVIDERS.map((provider)=>({provider,configured:providerConfigured(config,provider)}));
    },

    async begin({provider,role,returnTo='/',locale='en'}) {
      try {
        if (!providerConfigured(config,provider)) throw new Error('SOCIAL_PROVIDER_NOT_CONFIGURED');
        const timestamp = now();
        const transaction = createOAuthTransaction({provider,role,returnTo,locale,transactionSecret:config.transactionSecret,now:timestamp});
        const redirectUri = `${config.publicBaseUrl}${callbackPath(provider)}`;
        await repository.createOAuthLoginTransaction({
          id:transaction.id,provider,role,stateHash:transaction.stateHash,nonceHash:transaction.nonceHash,
          pkceMethod:provider === 'NAVER' ? 'NONE' : 'S256',returnTo:transaction.returnTo,
          locale:transaction.locale,expiresAt:new Date(transaction.expiresAt*1000)
        });
        return {
          location:buildAuthorizationUrl({provider,config:config.providers[provider],transaction,redirectUri}),
          cookies:[buildTransactionCookie(transaction.cookieValue,{secure:config.secureCookies})]
        };
      } catch (error) {
        throw mapAuthError(error);
      }
    },

    async complete({provider,code,state,error,cookieHeader}) {
      try {
        if (error) throw new Error('OAUTH_CALLBACK_INVALID');
        const cookies = parseCookies(cookieHeader);
        const transaction = openOAuthTransactionCookie(cookies[cookieNames.transaction],config.transactionSecret,{now:now()});
        if (transaction.provider !== provider) throw new Error('OAUTH_CALLBACK_INVALID');
        await repository.getOAuthLoginTransaction({id:transaction.id,provider,stateHash:hashAuthValue(state)});
        const identity = await authenticateProviderCallback({
          provider,code,state,expectedState:transaction.state,nonce:transaction.nonce,
          codeVerifier:transaction.code_verifier,redirectUri:`${config.publicBaseUrl}${callbackPath(provider)}`,
          config:config.providers[provider],fetchImpl,now:now()
        });
        const credentials = createSessionCredentials();
        const timestamp = now();
        const result = await repository.completeSocialLogin({
          transactionId:transaction.id,provider,stateHash:hashAuthValue(state),
          subjectHash:hashAuthValue(`${provider}:${identity.subject}`),requestedRole:transaction.role,
          session:{id:crypto.randomUUID(),...credentials,
            idleExpiresAt:new Date((timestamp+IDLE_SECONDS)*1000),absoluteExpiresAt:new Date((timestamp+ABSOLUTE_SECONDS)*1000)}
        });
        const location = result.account_status === 'ACTIVE'
          ? transaction.return_to
          : `/auth/?locale=${encodeURIComponent(transaction.locale)}&onboarding=required`;
        return {
          location,
          cookies:[...buildSessionCookies({sessionToken:credentials.sessionToken,csrfToken:credentials.csrfToken,secure:config.secureCookies}),...clearAuthCookies({secure:config.secureCookies}).slice(2)],
          account:result
        };
      } catch (authError) {
        throw mapAuthError(authError);
      }
    },

    async resolveSession(request,{requireFull=false,requireCsrf=false}={}) {
      const cookies = parseCookies(request.headers.cookie);
      const sessionToken = cookies[cookieNames.session];
      if (!sessionToken) throw apiError(401,'UNAUTHENTICATED','error.unauthenticated');
      const session = await repository.resolveAuthSession({sessionTokenHash:hashAuthValue(sessionToken),idleSeconds:IDLE_SECONDS});
      if (!session) throw apiError(401,'UNAUTHENTICATED','error.unauthenticated');
      if (requireCsrf && ['POST','PUT','PATCH','DELETE'].includes(request.method)) {
        const header = request.headers['x-csrf-token'];
        const cookie = cookies[cookieNames.csrf];
        if (typeof header !== 'string' || typeof cookie !== 'string' || header !== cookie || hashAuthValue(header) !== session.csrf_token_hash) {
          throw apiError(403,'CSRF_VALIDATION_FAILED','error.forbidden');
        }
      }
      if (requireFull && (session.auth_level !== 'FULL' || session.account_status !== 'ACTIVE')) {
        throw apiError(403,'ACCOUNT_ONBOARDING_REQUIRED','error.account_onboarding_required');
      }
      return session;
    },

    async actor(request) {
      const session = await this.resolveSession(request,{requireFull:true,requireCsrf:true});
      return session.role === 'STUDENT'
        ? {userId:session.user_id,studentId:session.student_id,role:session.role}
        : {userId:session.user_id,role:session.role};
    },

    async session(request) {
      let session;
      try {
        session = await this.resolveSession(request);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') return {authenticated:false};
        throw error;
      }
      return {
        authenticated:true,role:session.role,account_status:session.account_status,
        auth_level:session.auth_level,onboarding_status:session.onboarding_status,
        student_id:session.student_id || null
      };
    },

    async onboard(request,body) {
      const current = await this.resolveSession(request,{requireCsrf:true});
      const input = validateOnboarding(current.role,body);
      const credentials = createSessionCredentials();
      const timestamp = now();
      const result = await repository.completeAuthOnboarding({
        sessionId:current.session_id,userId:current.user_id,role:current.role,...input,
        replacementSession:{id:crypto.randomUUID(),...credentials,
          idleExpiresAt:new Date((timestamp+IDLE_SECONDS)*1000),absoluteExpiresAt:new Date((timestamp+ABSOLUTE_SECONDS)*1000)}
      });
      return {
        account:result,
        cookies:buildSessionCookies({sessionToken:credentials.sessionToken,csrfToken:credentials.csrfToken,secure:config.secureCookies})
      };
    },

    async logout(request) {
      const current = await this.resolveSession(request,{requireCsrf:true});
      await repository.revokeAuthSession({sessionId:current.session_id,userId:current.user_id,reason:'USER_LOGOUT'});
      return {cookies:clearAuthCookies({secure:config.secureCookies})};
    },

    clearCookies() {
      return clearAuthCookies({secure:config.secureCookies});
    }
  });
}

export {validateOnboarding};
