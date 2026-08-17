# 수학착착 외부 활성화 인계 Runbook v1.0

## 현재 상태

로컬 개발·PostgreSQL·API·화면·테스트 체인은 완료됐다. 외부 연결, 실제 증거, scanner 실행, 사람의 release 결정과 운영 배포는 승인되지 않았다.

## 활성화 순서

1. 운영 환경·Secret·감사 sink와 백업 복구를 승인한다.
2. 외부 transport·certificate·trust anchor를 별도 보안 검토한다.
3. reference scheme과 정확한 target ownership을 승인한다.
4. proof issuer·intake channel·quarantine storage·KMS·allowlist·retention을 승인한다.
5. scanner identity·engine binary·signature DB freshness·격리 환경·보조 엔진을 승인한다.
6. 동일 object SHA-256에 대한 독립 attestation 두 개를 수집한다.
7. 결과를 fail-closed로 조정하고 별도 SECURITY reviewer가 이해상충을 선언한다.
8. 사람의 release 결정을 append-only로 기록한다.
9. staging 전체 회귀·백업·rollback·health·smoke 후 운영 배포 승인을 받는다.

각 단계는 앞 단계 증거가 없으면 시작하지 않는다. 비밀번호·token·개인 연락처 원문은 저장소에 기록하지 않는다.

## 롤백

외부 증거가 만료·철회·불일치하면 kill switch를 유지하고 연결·검사·release를 중단한다. 적용된 migration은 수정하지 않고 새 migration으로 되돌리며 DB 백업 복구를 검증한다.
