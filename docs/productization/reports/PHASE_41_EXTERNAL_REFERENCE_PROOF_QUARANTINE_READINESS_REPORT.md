# 수학착착 Phase 41 외부 참조 증명 quarantine 운영 준비 보고서

## 결과

Phase 40 intake 정책을 격리 저장소·콘텐츠 검사·보존·삭제·감사의 fail-closed 운영 준비 계약으로 연결했다. 실제 파일을 업로드·저장·검사·삭제하거나 quarantine에서 해제하지 않았다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_QUARANTINE_READINESS_POLICY_BLOCKED_EXTERNAL`이다. 이는 저장소나 scanner가 운영된다는 뜻이 아니라 외부 통제가 없는 상태에서 준비 조건과 차단 경계가 검증됐다는 뜻이다.

## 검증 결과

- quarantine 계약·요구사항 테이블 2/2
- 요구사항 6/6, 저장소 보안 8/8, 콘텐츠 검사 8/8, 거절 코드 12/12
- 보존 이벤트 7/7, 감사 필드 10/10, 허용 content type 0개
- 실제 object 0개, scan result 0개
- 단위 테스트 129/129 PASS
- Phase 41 통합 1/1 PASS
- 전체 PostgreSQL 통합 32/32 PASS
- 계약·요구사항 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- upload·scan·retention·deletion·release 경로 404, COMPLETED 전이 409
- storage·inspection·scan·retention·deletion·audit·release·연결·실행 false, 원본 변경 0건

## 실패와 수정

첫 PostgreSQL 통합에서 idempotency scope `privacy.proof.quarantine.readiness.{UUID}`가 기존 `varchar(64)` 제약을 초과해 계약 생성 API가 500을 반환했다. 트랜잭션이 rollback되어 부분 데이터는 남지 않았다. scope를 충돌 없이 의미를 유지하는 `privacy.quarantine.{UUID}`로 줄여 64자 이내로 맞춘 뒤 API 컨테이너를 재빌드하고 Phase 통합부터 재검증했다.

## 사실·가정·미결정

- 사실: 실제 object, scan result, 삭제 증명과 감사 이벤트는 저장되지 않는다.
- 사실: 허용 content type은 0개이고 storage·scanner 실행 API가 없다.
- 가정: 운영 시 승인된 전용 quarantine namespace와 격리 scanner가 제공되어야 한다.
- 미결정: 저장소·KMS·scanner, MIME allowlist, 최대 크기·archive depth, 보존·삭제·감사 정책이다.

## 다음 Phase

Phase 42는 scanner 신원·서명 DB freshness·engine 다양성·timeout·재시도·failover·결과 attestation의 검증 실행 준비 계약을 설계한다. 외부 scanner 증명과 승인이 있기 전까지 검사 실행은 금지한다.
