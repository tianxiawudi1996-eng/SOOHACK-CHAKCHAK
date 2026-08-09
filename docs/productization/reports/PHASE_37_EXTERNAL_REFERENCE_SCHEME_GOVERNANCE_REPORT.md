# 수학착착 Phase 37 외부 참조 scheme 거버넌스 보고서

## 결과

Phase 36의 6개 envelope 규칙에 scheme 제안 패킷, 승인자 직무분리, 정확한 대상 범위, 만료·철회·재승인 정책을 연결했다. 실제 제안·승인·allowlist 등록·활성화는 수행하지 않는다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_REFERENCE_SCHEME_GOVERNANCE_BLOCKED_EXTERNAL`이다. 외부 저장소 연결이나 증적 접수 승인이 아니다.

## 검증 결과

- 거버넌스 계약·정책 테이블 2/2
- 통제 정책 6/6, 제안 필드 10/10, 제한 필드 6/6
- 생명주기 상태 7/7, 재승인 트리거 6/6
- 실제 제안 0개, 현재 상태 6/6 `NOT_PROPOSED`
- 개인정보·보안 승인자 및 제안자 직무분리 6/6
- wildcard authority·무제한 경로 금지 6/6
- 실제 scheme·authority·bucket·path·region·tenant·승인자·시각 6/6 NULL
- 단위 테스트 113/113 PASS
- Phase 37 통합 1/1 PASS
- 전체 PostgreSQL 통합 28/28 PASS
- 계약·정책 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- 과거 envelope·대기열·수락·어댑터·검증·인계·준비도·만료·후속 패키지·법적 보존·해시 불일치 차단 계약 PASS
- 제안·승인·활성화·철회 경로 404, 기존 COMPLETED 전이 409
- allowlist·제출·자동 승격·연결·실행 승인 false, 원본 변경 0건

## 실패와 수정

첫 PostgreSQL 통합에서 정책 INSERT의 38개 컬럼에 40개 값 표현식이 전달되어 500이 발생했다. 불필요한 NULL 자리표시자 2개를 제거해 38:38로 수정하고 전용·전체 통합을 재검증했다. 실제 scheme 제안·승인자·최대 유효기간 부재는 의도된 외부 차단 상태다.

## 사실·가정·미결정

- 사실: 현재 scheme proposal이나 승인자 identity reference는 저장되지 않는다.
- 사실: allowlist 활성화와 metadata 제출 API가 없다.
- 가정: 실제 외부 운영자는 정확한 authority·bucket·path 범위를 제공해야 한다.
- 미결정: 승인 가능한 scheme 종류, 외부 제안자·승인자, 최대 유효기간, 철회 통지 경로와 재승인 SLA다.

## 다음 Phase

Phase 38은 실제 제안 전 검증할 authority·bucket·path 정규화, wildcard·경로 탈출·동형 문자 방어, DNS/리전 소유권 증명과 SSRF 차단 정책 계약을 설계한다. 네트워크 검증과 allowlist 등록은 별도 승인 전까지 금지한다.
