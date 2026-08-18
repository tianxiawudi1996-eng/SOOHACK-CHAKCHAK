# Cloudflare 개발 프리뷰 배포 보고

## 결과

- 상태: `PASS_EXTERNAL_FRONTEND_PREVIEW`
- Worker: `dev`
- 공개 URL: `https://dev.mathchakchak-product.workers.dev`
- 배포 버전 참조: `cloudflare-worker-version:d5626da1-82e1-4492-b9f0-9cfda454c9d6`
- 범위: 프런트엔드 개발 프리뷰. API·PostgreSQL·운영 릴리스는 포함하지 않음

Cloudflare Workers Static Assets에 수학착착 프런트엔드와 화면 정렬 개선분을 배포했다. 승인된 캐릭터 자산과 기능 경계를 유지하면서 공통 읽기 흐름, 반응형 레이아웃, 한글 줄바꿈을 보정했다.

## 주소 선택 결과

- 현재 주소: `https://dev.mathchakchak-product.workers.dev`
- 선호 주소: `https://dev.mathchakchak.com`
- 선호 주소 상태: `BLOCKED_DOMAIN_NOT_REGISTERED`

`mathchakchak.com` 등록과 Cloudflare Zone 활성화는 비용과 외부 계정 변경을 수반하므로 자동 수행하지 않았다. 현재 Workers 개발 주소는 사용자 확인을 받은 외부 개발 주소다.

## 화면 정렬 개선

- 공통 본문·제목·레이블: 논리적 시작점 정렬
- 행동 버튼: 중앙 정렬
- 문제 선택지·입력 설명: 시작점 정렬
- 한글: 단어 단위 줄바꿈과 긴 단어 안전 대체
- 제목: 균형 줄바꿈, 본문: 자연스러운 줄바꿈
- 모바일 헤더: 390px에서 안전하게 줄바꿈

배포 화면의 1440px 데스크톱과 390px 모바일 기준에서 가로 넘침 없이 읽기 흐름을 유지한다.

## 자동 검증

- 정렬 계약 단위 테스트: `3/3 PASS`
- 전체 단위 테스트: `340/340 PASS`
- 린트: `PASS` (`text=415`, `scripts=359`, `json=39`)
- 런타임 타입 계약: `PASS` (`assertions=467`)
- 화면 설계 검증: `PASS` (`locales=8/8`, `components=10/10+`)
- 수학 학습 UI 검증: `PASS` (`mobile=390px PASS`)
- Wrangler dry-run: `PASS` (`assets=96`)
- HTTPS 스모크: `/` 200, `/curriculum/` 200, `/readyz` 200, `/api/v1/locales` 503

## 운영 경계

현재 공개 화면은 프런트엔드 검토용이다. `/readyz` 응답이 명시하듯 Node API와 PostgreSQL은 외부 환경에 연결되지 않았다. 진단·교육과정·수학 학습 화면이 실제 서버 데이터나 AI 서비스를 제공하는 운영 릴리스로 오인해서는 안 된다.

Cloudflare 제어 평면 재확인에서는 현재 API 토큰이 유효하지 않아 신규 배포와 롤백 제어가 차단됐다. 공개 런타임은 계속 응답하지만, 인증을 복구하기 전에는 재배포하지 않는다.

다음 외부 작업은 Cloudflare 인증 복구와 GitHub 보호 배포 Environment 구성이다. 그 뒤 Cloudflare 호환 API 런타임과 외부 PostgreSQL 서비스를 결정하고 Secret 관리·마이그레이션·동적 호출·통합 E2E를 수행한다.
