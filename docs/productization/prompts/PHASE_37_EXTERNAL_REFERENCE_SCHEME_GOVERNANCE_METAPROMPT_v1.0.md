# 수학착착 Phase 37 — 외부 참조 scheme 제안·승인·철회 거버넌스 실행 메타프롬프트 v1.0

ROLE:
외부 저장소 연결 권한 없이 참조 scheme의 제안·승인·범위 제한·철회·재승인 정책을 설계하는 보안·개인정보 제품화 에이전트다.

GOAL:
Phase 36의 빈 allowlist 상태를 유지하면서 scheme 제안 패킷, 개인정보·보안 승인자 직무분리, 정확한 대상 범위, 만료·철회·재승인 조건을 append-only 계약으로 고정한다.

USERS:
SECURITY_APPROVER는 계약 리비전을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 최소화된 정책을 조회한다. 학생은 접근할 수 없다.

CONTEXT:
Phase 36은 envelope와 거부 코드를 정의했으나 scheme 소유자, authority·bucket·path 범위, 최대 유효기간, 철회와 재승인 정책이 미결정이다. 실제 제안이나 승인 정보는 제공되지 않았다.

SCOPE:
- scheme 제안 필드 10개
- 대상 제한 필드 6개
- 생명주기 상태 7개
- 재승인 트리거 6개
- 제안자·개인정보·보안 승인자 직무분리
- wildcard authority와 무제한 경로 금지
- 만료·철회·재승인 필수 계약
- PostgreSQL 0023, 생성·조회 API, 단위·통합 검사

OUT OF SCOPE:
실제 scheme 제안 접수, reviewer 배정, 승인·반려, allowlist 등록·활성화, 원격 조회, 증적 제출, 연결·실행 승인.

CONSTRAINTS:
- 제안·승인자·대상·시각은 모두 NULL이다.
- 현재 상태는 `NOT_PROPOSED`다.
- 개인정보·보안 승인자는 서로 달라야 하고 제안자와도 달라야 한다.
- 정확한 authority·bucket·path 범위를 요구하며 wildcard와 무제한 경로를 금지한다.
- 최대 유효기간은 외부 정책 전까지 NULL이다.
- 중단 스위치와 실행 차단을 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검사기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 36 검증 → 제안 스키마 → 직무분리 → 대상 범위 → 생명주기·재승인 → API/DB → 역조건·롤백 → 전체 회귀 → 보고서·커밋.

SUCCESS CRITERIA:
- 계약·정책 테이블 2/2
- 정책 6/6, 제안 필드 10/10, 제한 필드 6/6, 상태 7/7, 재승인 6/6
- 제안 0개, 정책 상태 `NOT_PROPOSED` 6/6
- 단위 113/113, Phase 통합 1/1, 전체 PostgreSQL 통합 28/28
- UPDATE/DELETE 2/2 차단, migration forward·rollback·reapply PASS
- allowlist 활성화·제출·연결·실행 승인 false

FAILURE CRITERIA:
scheme 또는 대상 추정, 동일 제안자·승인자 허용, wildcard 대상 허용, 무기한 승인, 실제 활성화, 원문·비밀 저장, 최신 체인 미검증, 롤백 불능.

OUTPUTS:
도메인 계약, PostgreSQL 0023 migration/rollback, API, 단위·통합 테스트, 정적 검사기, 개발 계약서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only 역조건 → rollback/reapply → 전체 제품화 → health check.

MEMORY UPDATE:
필드·상태·트리거 수, 제안 0개, 안전 경계와 테스트 결과만 기록한다. reviewer 실명, 실제 외부 대상·Secret은 기록하지 않는다.

STOP CONDITION:
실제 제안 패킷과 승인 권한이 없으면 정책 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
