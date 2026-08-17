# 수학착착 Phase 8 — 통합테스트 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 초등 수학 학습자, 보호자, 제품 책임자, 운영 담당자
- 달라져야 하는 것: 배포 산출물이 실제 브라우저에서 언어·화면·캐릭터·접근성·보안 기준을 함께 만족해야 한다.

## 2. Specification Engineering

완료 상태는 8개 locale, 데스크톱·모바일 레이아웃, 승인 캐릭터, CTA 피드백, 키보드 접근성, 콘솔, 보안 헤더, API·DB 연결이 모두 검증된 상태다.

성공 기준:

- locale 렌더링 8/8
- 데스크톱·390px 모바일 가로 넘침 0
- 승인 캐릭터 2/2 로드
- CTA 상태 알림과 키보드 첫 포커스 정상
- 콘솔 error·warning 0
- 필수 보안 응답 헤더 6/6
- API·DB 핵심 사용자 여정 통합 PASS

실패·차단 기준:

- 번역 누락, 이미지 실패, 레이아웃 넘침, 콘솔 오류 또는 보안 헤더 누락: `FAIL`
- API 또는 DB 런타임이 배포되지 않음: `BLOCKED_RUNTIME`

## 3. Context Engineering

- 정적 제품 artifact: `artifacts/staging/v0.1.0/site/`
- 배포: `infra/deployment/Dockerfile.staging`, `infra/deployment/nginx.staging.conf`
- 검증 URL: `http://127.0.0.1:4180/?locale=ko`
- 증적: `docs/productization/evidence/PHASE_8_INTEGRATION_QA.json`
- 현재 범위: 프런트엔드 로컬 격리 런타임이며 API·DB 제품 런타임은 미배포다.

## 4. Harness Engineering

- 브라우저 DOM·화면·콘솔 검사
- HTTP 상태·보안 헤더·응답시간 검사
- artifact SHA-256와 승인 자산 수 검사
- `scripts/productization/validate_integration.mjs`
- 외부 배포, 운영 데이터, 비밀값 사용 금지

## 5. Prompt Engineering

1. 컨테이너 health와 artifact 동일성을 검사한다.
2. 8개 locale의 문서 언어·제목·H1·빈 번역 키·이미지를 검사한다.
3. 1440×1000과 390×844에서 레이아웃과 캐릭터 배치를 검사한다.
4. CTA 상태 알림과 키보드 첫 포커스를 검사한다.
5. 콘솔 error·warning과 HTTP 보안 헤더를 검사한다.
6. 결함을 수정하고 동일 검사를 반복한다.
7. API·DB 미배포 범위는 완료로 추정하지 않고 차단 상태로 남긴다.

## 6. Workflow Engineering

`배포 확인 → locale 검사 → 반응형 검사 → 행동·접근성 검사 → 콘솔·보안 검사 → 결함 수정 → 자동 감사 → 런타임 차단 보고`

## 7. Memory Engineering

남길 것은 release·이미지 digest, 검사 viewport, locale 결과, 보안 헤더, 응답시간, 결함과 수정, 런타임 차단 사유다. 임시 브라우저 상태, 비밀값, 운영 데이터와 허위 API 통과 기록은 남기지 않는다.

## 8. Loop Engineering

결함이 있으면 배포 설정 또는 artifact를 수정하고 컨테이너 재기동 후 동일 검사를 반복한다. 프런트엔드 기준 통과 시 해당 범위는 종료한다. API·DB 핵심 여정까지 통과해야 Phase 8 전체를 종료하고 Phase 9로 이동한다.
