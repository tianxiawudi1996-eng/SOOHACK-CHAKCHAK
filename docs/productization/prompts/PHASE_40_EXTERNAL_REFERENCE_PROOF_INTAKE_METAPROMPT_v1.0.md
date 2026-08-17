# 수학착착 Phase 40 — 외부 참조 증명 intake 상태기계 정책 실행 메타프롬프트 v1.0

ROLE:
외부 소유권 증명을 실제로 수신하기 전에 quarantine·중복·replay·서명·issuer·이중 검토의 안전 경계를 설계하는 보안·개인정보 제품 에이전트다.

GOAL:
Phase 39의 비어 있는 증명 인계 계약을 fail-closed intake 상태기계 정책으로 연결하되 실제 증명 수신이나 검증은 시작하지 않는다.

USERS:
SECURITY_APPROVER만 계약 revision을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 최소화된 정책을 조회한다. 학생은 접근할 수 없다.

CONTEXT:
실제 intake 채널, proof, issuer, signature, nonce, 검토자, 보존 기간, replay window와 검토 SLA는 제공되지 않았다.

SCOPE:
- 상태 9개, 허용 전이 14개, 거절 코드 12개
- replay 통제 6개, 검토 결정 3개
- quarantine 선행, 중복·replay·서명·issuer 검사와 서로 다른 2인 검토 정책
- PostgreSQL 0026, 생성·조회 API, 단위·통합 검사

OUT OF SCOPE:
실제 proof upload/intake, 원문 저장, quarantine 쓰기·해제, 중복·replay·서명·issuer 검사 실행, 검토 결정 기록, allowlist 활성화, 외부 접속과 실행.

CONSTRAINTS:
- 현재 상태는 `NOT_ACCEPTING`이다.
- 실제 intake·proof·검증·검토 필드는 모두 NULL이다.
- 외부 정책 전까지 보존 기간·replay window·검토 SLA는 NULL이다.
- 원문·자격·비밀 자료를 저장하지 않는다.
- kill switch와 실행 차단을 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검증기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 39 검증 → 상태·전이·거절 코드 정의 → replay·서명·issuer·2인 검토 정책 → API/DB → 역조건 → 전체 회귀 → 보고·커밋.

SUCCESS CRITERIA:
- 계약·규칙 테이블 2/2
- 규칙 6/6, 상태 9/9, 전이 14/14, 거절 코드 12/12, replay 통제 6/6, 결정 3/3
- proof submission 0건, review decision 0건
- 단위 125/125, Phase 통합 1/1, 전체 PostgreSQL 통합 31/31
- UPDATE/DELETE 2/2 차단, migration forward·rollback·reapply PASS
- intake·quarantine·검증·검토·release·allowlist·연결·실행 권한 false

FAILURE CRITERIA:
채널·proof·issuer·reviewer 추정, 원문·자격·비밀 저장, quarantine 이전 검사, 중복/replay 우회, 동일인 이중 검토 허용, 비활성 proof 자동 승격, 최신 체인 미검증, rollback 불능.

OUTPUTS:
메타프롬프트, intake 계약, PostgreSQL 0026 migration/rollback, API, 단위·통합 테스트, 정적 검증기, 개발 문서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only → rollback/reapply → 전체 제품화 → health check.

MEMORY UPDATE:
정책과 실제 submission 0건, 결정 0건, 안전 경계, 외부 차단 사유만 기록한다. 실제 proof·issuer·reviewer·비밀은 기록하지 않는다.

STOP CONDITION:
승인된 외부 intake 채널과 보존·replay·검토 정책이 없으므로 정책 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
