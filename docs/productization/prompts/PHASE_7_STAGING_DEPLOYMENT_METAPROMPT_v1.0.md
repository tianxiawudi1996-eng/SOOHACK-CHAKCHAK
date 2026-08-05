# 수학착착 Phase 7 — 스테이징 배포 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 제품 책임자, QA, 개발·운영 담당자
- 달라져야 하는 것: 검증된 수학착착 빌드가 운영 데이터와 분리된 스테이징 URL에서 재현 가능하고 되돌릴 수 있게 실행된다.

## 2. Specification Engineering

완료 상태는 동일 해시의 빌드가 승인된 스테이징 대상에 배포되고, 8개 언어·health check·DB migration·rollback rehearsal이 통과하며 URL과 배포 ID가 근거로 남은 상태다.

성공 기준:

- Phase 0~6 회귀검사 PASS
- Gate 5 승인 1/1
- PostgreSQL migration runtime PASS
- 빌드 manifest와 실제 파일 해시 100% 일치
- 스테이징 URL·배포 ID·배포 시각 존재
- 8개 locale 핵심 화면 smoke PASS
- production traffic 0, production data 0
- rollback 명령과 이전 artifact 검증 PASS

차단 기준:

- 배포 대상·권한·비밀값 참조 미제공: `BLOCKED_EXTERNAL`
- artifact 해시 불일치: `FAIL`
- 운영 DB 또는 운영 트래픽 사용: `FAIL`
- Gate 승인·migration 검증 누락: `FAIL`

## 3. Context Engineering

- 입력: Phase 0~6 검증 산출물, 승인된 2D 캐릭터, 8개 locale bundle
- 빌드: `scripts/productization/build_staging.mjs`
- 계약: `infra/deployment/staging-contract.json`
- 출력: `artifacts/staging/v0.1.0/site/`, `artifacts/staging/v0.1.0/manifest.json`
- 검증: `scripts/productization/validate_staging_readiness.mjs`

## 4. Harness Engineering

AI는 배포 URL, 배포 ID, 자격증명, 성공 상태를 추정하지 않는다. 비밀값 원문을 읽거나 기록하지 않으며 참조 ID만 사용한다. 승인되지 않은 외부 배포와 운영 트래픽 변경을 수행하지 않는다.

## 5. Prompt Engineering

1. Phase 0~6와 Gate 5·DB 근거를 확인한다.
2. 승인된 정적 화면과 캐릭터만 복사해 재현 가능한 artifact를 만든다.
3. 모든 파일 SHA-256 manifest를 생성한다.
4. artifact 구조·locale·자산 해시·비밀값 금지를 검사한다.
5. 로컬 HTTP smoke test를 수행한다.
6. 외부 대상·권한이 있으면 배포하고 health check와 rollback을 검증한다.
7. 대상이 없으면 `BLOCKED_EXTERNAL`로 보고하며 배포 성공을 기록하지 않는다.

## 6. Workflow Engineering

`선행 Gate 확인 → 빌드 → 해시 → preflight → 로컬 smoke → 대상 승인 → 스테이징 배포 → health check → rollback rehearsal → 보고`

## 7. Memory Engineering

남길 것은 release, artifact hash, 배포 대상 참조, 배포 ID, 스테이징 URL, smoke 결과, rollback 결과다. 비밀값, 운영 데이터, 임시 테스트 계정의 인증정보와 실패한 중간 artifact는 남기지 않는다.

## 8. Loop Engineering

빌드마다 manifest를 새로 만들고 정적 검증과 8개 locale smoke를 반복한다. 해시·health·rollback 중 하나라도 실패하면 배포를 중단한다. 승인 URL과 rollback 근거까지 확보되면 Phase 7을 종료한다.
