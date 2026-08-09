# 수학착착 Phase 39 외부 참조 소유권 증명·DNS 무결성 인계 계약 보고서

## 결과

Phase 38 대상 검증 정책에 증명 메타데이터, issuer trust, TTL·철회·재검증, DNS snapshot 무결성 인계 계약을 연결했다. 실제 증명·issuer·DNS 결과는 접수하거나 생성하지 않았다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_PROOF_HANDOFF_BLOCKED_EXTERNAL`이다. 외부 증명을 검증하거나 네트워크에 접속했다는 의미가 아니다.

## 검증 결과

- 증명 인계 계약·요건 테이블 2/2
- 요건 6/6, 증명 필드 12/12, issuer trust 8/8
- 생명주기 7/7, 재검증 트리거 8/8, DNS snapshot 필드 8/8
- 실제 proof 0개, issuer 0개, DNS snapshot 0개
- 메타데이터 전용·불변 참조·서명·만료·철회 필수 6/6
- 원문·자격·비밀 저장 금지와 issuer/reviewer 분리 6/6
- 단위 테스트 121/121 PASS
- Phase 39 통합 1/1 PASS
- 전체 PostgreSQL 통합 30/30 PASS
- 계약·요건 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- proof·issuer decision·DNS snapshot·revalidate·activate 경로 404, COMPLETED 전이 409
- proof intake·DNS·철회 polling·allowlist·연결·실행 권한 false, 원본 변경 0건

## 실패와 수정

첫 PostgreSQL 통합에서 증명 요건 INSERT의 52개 열에 55개 값이 전달되어 생성 API가 500을 반환했다. 트랜잭션은 롤백되어 부분 데이터는 남지 않았다. proof·DNS·시각 필드의 NULL 자리표시자 3개를 제거해 52:52로 맞추고 API 컨테이너를 재빌드했으며 Phase 통합 1/1을 재검증했다. 실제 증명 접수나 외부 동작은 수행되지 않았다.

## 사실·가정·미결정

- 사실: 실제 proof, issuer identity, DNS snapshot은 저장되지 않는다.
- 사실: proof intake, signature validation, DNS capture, revocation polling API가 없다.
- 가정: 실제 운영자는 승인된 issuer와 불변 참조·SHA-256 기반 증명을 제공해야 한다.
- 미결정: issuer trust anchor, 허용 서명 알고리즘, proof TTL, DNS TTL, 재검증 SLA와 철회 채널이다.

## 다음 Phase

Phase 40은 외부 증명 접수 전 quarantine·중복·replay·서명 검증·review decision 상태기계와 안전한 메타데이터 intake 승인 계약을 설계한다. 실제 접수와 검증 실행은 별도 승인 전까지 금지한다.
