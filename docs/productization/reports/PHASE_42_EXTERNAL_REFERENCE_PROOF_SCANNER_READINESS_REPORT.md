# 수학착착 Phase 42 외부 참조 증명 스캐너 실행 준비 보고서

## 결과

Phase 41 격리 준비 계약을 scanner identity·trust anchor·engine attestation·서명 DB 최신성·격리 실행·다중 엔진·결과 attestation 정책으로 연결했다. 실제 object 읽기, 악성코드 검사, 결과 기록과 격리 해제는 구현하지 않았다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_SCANNER_READINESS_POLICY_BLOCKED_EXTERNAL`이다. 이는 스캐너가 운영 중이라는 뜻이 아니라 실행 전 계약과 차단 경계가 로컬 PostgreSQL에서 검증됐다는 뜻이다.

## 검증 결과

- scanner 계약·요건 테이블 2/2
- 책임 통제 6/6, scanner trust 8/8, signature freshness 7/7
- 실행 단계 9/9, 실패 정책 10/10, attestation 필드 12/12
- 승인 scanner engine 0개, object 0개, scan result 0개, attestation 0개
- 단위 테스트 133/133 PASS
- Phase 42 통합 1/1 PASS
- 전체 PostgreSQL 통합 33/33 PASS
- 계약·요건 UPDATE/DELETE 2/2 차단
- 기존 데이터를 보존한 단일 트랜잭션 rollback·reapply DDL PASS
- object read·scan·retry·failover·reconciliation·attestation·release·연결·실행 false
- 전체 제품화 검사 PASS, `/readyz` 200, runtime readiness 20/20 PASS

## 실패와 수정

전체 통합 첫 실행에서 기존 테스트 세 개가 요구하는 `TEST_SESSION_HMAC_SECRET`가 현재 셸에 없어 30/33으로 중단됐다. 코드나 migration 결함은 아니었다. 컨테이너와 동일한 로컬 격리 테스트 값을 프로세스 환경에만 주입하고 재실행하여 33/33을 통과했다. 해당 값은 저장소에 기록하지 않았다.

직접 rollback은 통합검사로 생성한 6개 계약과 36개 요건을 삭제하므로 수행하지 않았다. 대신 rollback과 reapply DDL을 단일 트랜잭션에서 실행하고 마지막에 전체 rollback하여 데이터 손실 없이 왕복 가능성을 검증했다.

## 사실·가정·미결정

- 사실: 승인된 스캐너 엔진, object, scan result, attestation은 0개다.
- 사실: 실제 scan·attestation·release endpoint는 없다.
- 가정: 운영 주체가 승인 scanner identity, trust anchor와 격리 실행 환경을 제공해야 한다.
- 미결정: engine/version, signature DB source와 최대 freshness, timeout·retry, 보조 엔진, attestation sink다.

## 다음 Phase

Phase 43은 실제 실행을 허가하지 않은 채 scan result attestation 검증·다중 엔진 결과 조정·사람의 release 결정 준비 계약을 설계한다. 외부 스캐너 증거가 승인되기 전에는 결과 작성과 격리 해제를 계속 차단한다.
