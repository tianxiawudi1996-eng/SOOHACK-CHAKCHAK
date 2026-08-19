# Phase 76 소셜 로그인 생애주기 보고서

## 결과

Google·Naver·Kakao와 학생·학부모·학원 원장·교사 역할을 연결하는 로그인 생애주기를 구현했다. 진단과 수학 학습 화면은 로컬 데모 토큰을 사용하지 않고 Secure 쿠키 세션, CSRF, 역할·계정 상태 검증을 거쳐 이동한다.

현재 상태는 `LOCAL_SOCIAL_LOGIN_LIFECYCLE_PASS_EXTERNAL_PROVIDER_HOLD`다. 로컬 구현과 자동 검사는 통과했지만 외부 OAuth 앱과 Secret, Neon PostgreSQL의 0041 적용, 실제 공급자 E2E가 남아 있으므로 외부 로그인을 완료로 표시하지 않는다.

## 산출물

- 인증 도메인: `developer/src/auth/social-login.mjs`, `developer/src/auth/social-auth-service.mjs`
- API·저장소: OAuth 시작·콜백·세션·온보딩·로그아웃과 서버 소유권 검증
- DB: `0041_social_login_lifecycle.sql`, rollback, smoke
- 화면: `/auth/`, `/diagnostic/`, `/math-learning/`
- 증거: `docs/productization/evidence/PHASE_76_SOCIAL_LOGIN_QA.json`

## 실행 검사

- 소셜 로그인 대상 단위 테스트: 28/28 PASS
- 전체 단위 테스트: 379/379 PASS
- PostgreSQL 16 로컬: forward, smoke, rollback, reapply, final smoke PASS
- 진단→로그인: 안전한 내부 `return_to` 보존 PASS
- 진단→학습: `learning_path_item_id` 전달과 서버 소유 수업 선택 PASS
- 쿠키·CSRF: credentialed request와 unsafe request CSRF 검증 PASS
- 스테이징 빌드: 83/83 파일 PASS
- 로컬 브라우저: 익명 진단 요청이 로그인으로 이동, 인증 공급자·익명 세션 API 200, 콘솔 오류 0

## 실패와 수정

1. 공개 개발 Worker의 기존 진단 화면이 비활성화된 `/api/v1/local-demo/session`을 호출해 실패했다. 진단·수학 학습 클라이언트를 실제 쿠키 세션 기반으로 교체했다.
2. 익명 세션 조회가 401을 반환해 화면 진입 시 오류를 만들었다. 세션 조회만 `{authenticated:false}` 200을 반환하고 보호 API는 계속 401로 닫히도록 수정했다.
3. Gate 8 외부 대상 계약이 마이그레이션을 40개로 고정해 0041을 거부했다. 기대값을 41개로 갱신하고 구성요소별 검증을 분리했다.
4. 만료된 사용자 환경 변수 `CLOUDFLARE_API_TOKEN`이 정상 OAuth보다 우선되어 Wrangler 인증을 실패시켰다. 해당 변수를 현재 실행에서 제외하면 OAuth 계정·Hyperdrive 조회가 통과함을 확인했다. 사용자 전역 변수는 임의 삭제하지 않았다.

## 외부 차단 조건

- 외부 Neon PostgreSQL은 기존 증거 기준 0040까지이며 0041 적용 증거가 없다.
- Google·Naver·Kakao 개발 앱과 Worker Secret은 0/3이다.
- 실제 공급자 성공·취소·변조·만료·재로그인·로그아웃 E2E 증거가 없다.
- 보호자 동의, 학원 재직 검증, MFA·복구·탈퇴 E2E가 남아 있다.
- 최신 코드의 외부 Worker 배포는 수행하지 않았다.

## 다음 READY 작업

Neon 개발 프로젝트의 SQL Editor에서 `infra/database/migrations/0041_social_login_lifecycle.sql`을 한 번 실행하고 `infra/database/tests/0041_social_login_lifecycle_smoke.sql`을 실행한다. 그 후 Worker 공급자 Secret을 등록하고 최신 검증 SHA를 배포해 공개 `/auth/`, `/diagnostic/`, `/math-learning/`을 실제 계정으로 검증한다.
