# Phase 7 공개 런타임 API 브리지 증분 보고서

## 결과/상태

- 상태: `증거 있는 완료`
- 범위: Cloudflare 개발 Worker의 동일 출처 API 연결 경계
- 공개 URL: `https://dev.mathchakchak-product.workers.dev`
- 활성 배포 버전: `ea067773-d8ae-4617-b9d2-9b9747619774`
- 프런트엔드: `READY`
- API 브리지: `DEPLOYED_NOT_CONFIGURED`
- Node API: `BLOCKED_EXTERNAL`
- PostgreSQL: `BLOCKED_EXTERNAL`
- 운영 출시: `false`

정적 화면만 제공하던 Worker에 `/api/*` 전달 경계를 구현하고 배포했다. 승인된 별도 HTTPS API origin이 없으면 기존처럼 503으로 차단되므로 API나 데이터베이스가 연결됐다고 간주하지 않는다.

## 구현 범위

- 별도·pathless HTTPS `API_ORIGIN`만 허용
- 프런트엔드 자기 자신, URL 자격증명, 로컬·사설 대역 차단
- 원본 path·query·method·body·Authorization·Idempotency-Key 보존
- Cloudflare/IP forwarding 헤더 제거
- 업스트림 redirect 자동 추적 금지
- 미설정 503, 잘못된 설정 503, 통신 장애 502로 fail-closed
- `/readyz`는 실제 백엔드 `/readyz` 응답을 확인한 경우에만 API·DB를 `READY`로 표시

## 검증 증거

- 브리지 단위 테스트: `8/8 PASS`
- 전체 단위 테스트: `348/348 PASS` (구현 시점)
- lint: `PASS` (`text=418`, `scripts=362`, `json=39`)
- runtime type contract: `PASS` (`assertions=467`)
- Wrangler dry-run: `PASS` (`assets=96`)
- 실제 HTTPS: `/` 200, `/curriculum/` 200, `/readyz` 200, `/api/v1/locales` 503
- 현재 `/readyz.api_bridge`: `NOT_CONFIGURED`
- 자격증명 값 읽기·저장: 없음

## 실패와 수정

첫 배포 시 프로세스의 오래된 `CLOUDFLARE_API_TOKEN`이 Wrangler OAuth보다 우선되어 Cloudflare 오류 10000/9109가 발생했다. 토큰 값을 읽지 않고 해당 프로세스 환경 변수만 제거한 뒤 OAuth로 재인증해 해결했다.

## 차단 조건과 다음 READY

실제 제품 기능을 공개 환경에서 사용하려면 다음 외부 증거가 필요하다.

1. 승인된 Node API 개발 배포 URL
2. 외부 PostgreSQL과 migration·health 증거
3. Secret 관리 경로를 통한 `API_ORIGIN` 설정
4. 동일 출처 API 통합·8개 로케일 E2E·재시작 지속성 검증

다음 READY 작업은 `Node API + PostgreSQL 개발 런타임 배포 설계`다. 외부 API가 준비되기 전까지 공개 화면의 데이터 의존 기능은 503으로 유지한다.
