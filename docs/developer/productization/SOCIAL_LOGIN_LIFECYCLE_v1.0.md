# 수학착착 소셜 로그인 생애주기 설계 v1.0

## 목표와 범위

구글·네이버·카카오 계정으로 별도 비밀번호 없이 가입하고, 최초 로그인에서 학생·학부모·학원 원장·교사 역할을 명시적으로 선택한다. 소셜 공급자 인증 성공만으로 수학 학습 데이터 접근 권한을 주지 않으며, 역할별 온보딩과 검증 상태를 통과한 수학착착 세션만 보호 API에 접근한다.

이번 증분은 OAuth/OIDC 시작·콜백, 계정 생성, 역할 온보딩, 세션 발급·갱신·로그아웃, 권한 차단과 감사 기록을 구현한다. 공급자 앱 생성, Secret 입력, 실제 계정 로그인, 보호자 동의 완료, 학원 재직 검증, MFA·복구·탈퇴의 외부 운영 절차는 포함하지 않는다.

## 요구사항

| ID | 요구사항 | 수용 기준 |
|---|---|---|
| AUTH-01 | 소셜 가입 | GOOGLE·NAVER·KAKAO 3개 공급자가 동일한 수학착착 계정 생성 계약을 사용한다. |
| AUTH-02 | 역할 선택 | STUDENT·PARENT·ACADEMY_OWNER·TEACHER 중 하나를 OAuth 시작 전에 명시적으로 선택한다. |
| AUTH-03 | OAuth 상관관계 | 10분 만료 state를 검증하고 Google·Kakao는 nonce와 PKCE S256을 추가 검증한다. Naver는 공식 state 계약을 적용한다. |
| AUTH-04 | 토큰 검증 | Google·Kakao ID Token은 RS256 서명, issuer, audience, iat, exp, nonce를 검증한다. Naver는 토큰 교환 후 공식 프로필 응답의 안정 ID만 사용한다. |
| AUTH-05 | 최소 데이터 | 공급자 subject는 SHA-256 해시로만 저장한다. 공급자 access·refresh·ID token, 이메일, 이름, 전화번호는 저장하지 않는다. |
| AUTH-06 | 세션 | 12시간 idle, 30일 absolute 만료의 불투명 세션을 사용한다. 서버에는 세션·CSRF 해시만 저장하고 HTTPS에서는 `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`를 적용한다. |
| AUTH-07 | 역할 검증 | 만 14세 미만 학생은 보호자 검증 전, 원장·교사는 학원 검증 전 보호 API 접근을 차단한다. |
| AUTH-08 | 권한 불변식 | 기존 소셜 식별자는 다른 역할로 재가입할 수 없고 LOCKED·SUSPENDED·WITHDRAWN·DELETED 계정은 로그인할 수 없다. 원장·교사는 자기 선언만으로 권한이 상승하지 않는다. |
| AUTH-09 | 감사·로그아웃 | 가입, 로그인, 온보딩, 검증 대기, 로그아웃을 append-only 감사 이벤트로 남기며 로그아웃과 감사 기록은 한 트랜잭션으로 처리한다. |

## 상태 전이

```text
ANONYMOUS
  -> OAUTH_PENDING
  -> PROVIDER_AUTHENTICATED
  -> PENDING_ONBOARDING
     -> PARENT: ACTIVE/FULL
     -> STUDENT age 14+: ACTIVE/FULL
     -> STUDENT under 14: PENDING_GUARDIAN/ONBOARDING
     -> ACADEMY_OWNER|TEACHER: PENDING_ACADEMY_VERIFICATION/ONBOARDING
  -> LOGGED_OUT | EXPIRED | LOCKED | SUSPENDED | WITHDRAWN | DELETED
```

`PENDING_GUARDIAN`과 `PENDING_ACADEMY_VERIFICATION`은 인증 성공 상태이지만 학습 데이터 접근 권한은 없는 상태다. 검증 절차가 별도 승인 증거 없이 자동으로 `ACTIVE`로 전환되어서는 안 된다.

## 역할별 가입 계약

- 학생: 학년 코드와 연령 보증을 받는다. `UNDER_14_GUARDIAN_REQUIRED`는 보호자 연결·동의 완료 전까지 차단한다.
- 학부모: 이용약관 동의 후 일반 계정이 활성화된다. 학생 데이터는 별도 활성 `parent_student_link`와 동의 범위가 있어야 조회할 수 있다.
- 학원 원장: 학원 참조를 제출하지만 재직·사업자 검증 전까지 운영 권한이 없다.
- 교사: 학원 참조를 제출하지만 학원 초대·재직 검증과 학생 배정 전까지 운영 권한이 없다.

원장과 교사는 서로 다른 제품 역할이다. 원장은 향후 기관·교직원 관리 권한을, 교사는 배정된 학생의 학습 운영 권한만 받을 수 있으며 현재 구현은 두 역할 모두 검증 대기로 멈춘다.

## API

- `GET /api/v1/auth/providers`: 공급자별 설정 여부만 공개하고 Secret이나 ID를 공개하지 않는다.
- `GET /api/v1/auth/oauth/{provider}/start`: 역할·로케일·내부 반환 경로를 검증한 뒤 공급자로 리다이렉트한다.
- `GET /api/v1/auth/oauth/{provider}/callback`: 상관관계와 공급자 응답을 검증하고 수학착착 세션을 회전 발급한다.
- `GET /api/v1/auth/session`: 계정·온보딩 상태를 최소 필드로 반환한다.
- `POST /api/v1/auth/onboarding`: CSRF를 검증하고 역할별 입력을 처리한 뒤 세션을 회전한다.
- `POST /api/v1/auth/logout`: CSRF를 검증하고 현재 세션을 폐기한다.

## PostgreSQL 정본

`0041_social_login_lifecycle.sql`이 `social_identity`, `oauth_login_transaction`, `auth_session`, `auth_role_onboarding`, `auth_event`를 생성한다. 인증 이벤트는 append-only이며 PUBLIC 권한을 모두 회수한다. 운영 Neon PostgreSQL에 0041이 적용되기 전에는 외부 런타임을 완료로 판정하지 않는다.

## 환경 변수와 비밀값

비밀값 원문은 저장소에 넣지 않는다. 외부 개발 환경에는 아래 Secret 참조가 필요하다.

- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `NAVER_OAUTH_CLIENT_ID`, `NAVER_OAUTH_CLIENT_SECRET`
- `KAKAO_OAUTH_CLIENT_ID`, `KAKAO_OAUTH_CLIENT_SECRET`
- `OAUTH_TRANSACTION_SECRET` 또는 32바이트 이상의 전용 세션 HMAC Secret
- `PUBLIC_BASE_URL`

## 완료 경계

로컬 완료는 코드·PostgreSQL·화면·단위 테스트와 정적 계약 통과를 뜻한다. 실제 가입 완료는 세 공급자의 개발 앱, 정확한 콜백 URL, Secret Manager, Neon 0041, 외부 배포, 실제 계정 성공·거부·취소·재시도 증거가 있어야 한다. 복구, 공급자 연결 해제, 전체 세션 폐기, MFA/재인증, 보호자 승인, 학원 승인, 탈퇴·삭제 E2E는 후속 생애주기 증분으로 유지한다.
