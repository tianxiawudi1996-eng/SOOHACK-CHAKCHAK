# 수학착착 Phase 39 — 외부 참조 소유권 증명·DNS 무결성 인계 계약 실행 메타프롬프트 v1.0

ROLE:
외부 참조 소유권 증명과 DNS snapshot을 실제 접수하기 전에 제출 형식·발급자 신뢰·TTL·철회·재검증 요건을 설계하는 보안·개인정보 제품화 에이전트다.

GOAL:
Phase 38의 비어 있는 대상 검증 정책에 메타데이터 전용 증명 인계 형식과 fail-closed 검토 순서를 append-only 계약으로 연결한다.

USERS:
SECURITY_APPROVER만 계약 리비전을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 최소화된 정책을 조회한다. 학생은 접근할 수 없다.

CONTEXT:
실제 target, proof issuer, 증적 참조, DNS snapshot, 허용 TTL·재검증 SLA·철회 채널은 제공되지 않았다.

SCOPE:
- 증명 제출 필드 12개
- issuer trust 요건 8개
- 증명 생명주기 7개
- 재검증 트리거 8개
- DNS snapshot 필드 8개
- 메타데이터 전용·불변 참조·SHA-256·서명·만료·철회 필수 정책
- PostgreSQL 0025, 생성·조회 API, 단위·통합 검사

OUT OF SCOPE:
실제 증명 제출·수신·다운로드, issuer 검증, 서명 검증, DNS 조회·snapshot 생성, 철회 polling, allowlist 쓰기·활성화, 외부 연결과 실행.

CONSTRAINTS:
- proof·issuer·evidence·signature·DNS·시각 필드는 모두 NULL이다.
- TTL·재검증 SLA·철회 polling 주기는 외부 정책 전까지 NULL이다.
- 원문·자격·비밀 자료를 저장하지 않는다.
- 중단 스위치와 실행 차단을 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검증기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 38 검증 → 증명 필드 → issuer trust → 생명주기·재검증 → DNS snapshot 형식 → API/DB → 역조건 → 전체 회귀 → 보고·커밋.

SUCCESS CRITERIA:
- 계약·요건 테이블 2/2
- 요건 6/6, 증명 필드 12/12, issuer trust 8/8, 생명주기 7/7, 재검증 8/8, DNS 필드 8/8
- proof·issuer·DNS snapshot 0개
- 단위 121/121, Phase 통합 1/1, 전체 PostgreSQL 통합 30/30
- UPDATE/DELETE 2/2 차단, migration forward·rollback·reapply PASS
- proof intake·DNS·철회 polling·allowlist·연결·실행 권한 false

FAILURE CRITERIA:
증명·issuer·TTL 추정, 원문·비밀 저장, 발급자와 검토자 동일 허용, 서명·만료·철회 생략, DNS 결과 생성 주장, 외부 증명 없이 활성화, 최신 체인 미검증, 롤백 불능.

OUTPUTS:
메타프롬프트, 인계 계약, PostgreSQL 0025 migration/rollback, API, 단위·통합 테스트, 정적 검증기, 개발 문서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only → rollback/reapply → 전체 제품화 → health check.

MEMORY UPDATE:
정책 수, 실제 증명 0개, 안전 경계, 검증 결과와 외부 차단 사유만 기록한다. 실제 외부 주소·issuer·DNS 결과·비밀은 기록하지 않는다.

STOP CONDITION:
승인된 외부 증명 채널과 issuer trust 정책이 없으므로 인계 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
