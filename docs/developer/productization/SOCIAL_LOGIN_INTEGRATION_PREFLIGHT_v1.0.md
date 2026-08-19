# 소셜 로그인 외부 연동 사전검토 v1.0

## 판정

`HOLD_EXTERNAL_CONFIGURATION`

로컬 구현과 검증은 통과했지만 Google·Naver·Kakao OAuth 앱, Secret, 콜백 등록과 실제 공급자 응답 증거가 없다. 공급자 버튼은 이 상태에서 비활성화되고 시작 API는 503으로 실패 폐쇄한다.

## 외부 개발 환경 계약

기준 주소는 `https://mathchakchak-free-dev.mathchakchak-product.workers.dev`다. 각 공급자 앱에 다음 콜백을 정확히 등록해야 한다.

- Google: `https://mathchakchak-free-dev.mathchakchak-product.workers.dev/api/v1/auth/oauth/google/callback`
- Naver: `https://mathchakchak-free-dev.mathchakchak-product.workers.dev/api/v1/auth/oauth/naver/callback`
- Kakao: `https://mathchakchak-free-dev.mathchakchak-product.workers.dev/api/v1/auth/oauth/kakao/callback`

최소 범위는 Google `openid profile`, Naver 회원 식별자 조회, Kakao `openid profile_nickname`이다. 이메일·전화번호·친구·메시지·결제 권한은 요청하지 않는다.

## 필요한 구성

1. 각 공급자의 개발용 OAuth 앱과 소유자 참조
2. 위 3개 콜백 등록 증거
3. Cloudflare Secret 6개와 전용 거래 서명 Secret 등록 증거(값 원문 제외)
4. Neon PostgreSQL `0041_social_login_lifecycle.sql` 적용·smoke 증거
5. Worker 배포 버전과 Git SHA 결합 증거
6. 공급자별 성공, 사용자 취소, state 변조, nonce/만료 실패, 재로그인, 로그아웃 실제 증거

## 보안 판정 조건

- 공급자 토큰·인가 코드는 로그·DB·브라우저 저장소에 남지 않는다.
- Secret은 Cloudflare Secret Manager를 통해서만 주입한다.
- 개발과 운영 OAuth 앱·Secret·콜백을 분리한다.
- 학생과 학원 역할은 외부 검증 없이 자동 활성화하지 않는다.
- 실제 공급자 화면의 권한 범위가 이 문서와 다르면 연동을 중단하고 재검토한다.

## 다음 입력

`SOCIAL_OAUTH_PROVIDER_APP_CONFIGURATION_EVIDENCE`

반환 필드는 `provider`, `app_reference`, `callback_reference`, `secret_binding_reference`, `configured_at`, `verified_by`다. Secret 원문은 반환하지 않는다.
