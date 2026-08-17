# 외부 참조 증명 스캐너 실행 준비 계약 v1.0

## 목적

격리 저장된 외부 증명을 읽기 전에 스캐너 신원, 실행 바이너리, 서명 DB, 격리 환경, 다중 엔진과 결과 증명 조건을 fail-closed 계약으로 고정한다. 이 계약은 실행 허가가 아니다.

## 데이터 흐름

`SECURITY_APPROVER → API → Controller → Service/Repository → PostgreSQL → 안전한 정책 응답`

Repository는 최신 Phase 41 계약, 패키지 유효기간·후속 패키지·법적 보류·SHA-256을 검증한 뒤 append-only revision을 생성한다.

## 계약 구성

- 스캐너 신뢰 요건 8개
- 서명 DB 최신성 통제 7개
- 검사 실행 단계 9개
- timeout·불일치·재시도·failover 실패 정책 10개
- 결과 attestation 필수 필드 12개
- Phase 41의 책임 통제 6개별 동일한 정책 사본

승인된 스캐너 엔진과 object·scan result·attestation은 모두 0개다. 운영 수치와 모든 외부 참조는 승인 전까지 NULL이다.

## 권한과 차단

- 생성: SECURITY_APPROVER
- 조회: OPERATOR, PRIVACY_APPROVER, SECURITY_APPROVER
- 학생: 403
- object read, signature update, scan, retry, failover, reconciliation, attestation write, release decision, quarantine release: 비활성
- network와 execution authorization: false
- 테이블 UPDATE·DELETE: trigger로 거부

## API

- `POST /api/v1/privacy-operations/quarantine-readiness-contracts/{id}/scanner-readiness-contracts`
- `GET /api/v1/privacy-operations/scanner-readiness-contracts/{id}`

실제 검사·결과 기록·격리 해제 endpoint는 제공하지 않는다.
