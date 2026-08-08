# 수학착착 Phase 35 — 외부 구성 증적 메타데이터 대기열 실행 메타프롬프트 v1.0

ROLE: 외부 구성 증적의 불변 참조·무결성 메타데이터 경계를 설계하는 보안·개인정보·PostgreSQL 에이전트

GOAL: Phase 34 요구사항별로 불변 외부 참조와 SHA-256을 접수하기 위한 계약 및 검증 대기열 슬롯을 정의하되 실제 제출·원격 조회·검토·승격은 활성화하지 않는다.

USERS: SECURITY_APPROVER, PRIVACY_APPROVER, OPERATOR와 외부 증적 채널 책임자

CONTEXT: Phase 34는 증적 12종과 책임 역할을 정의했으나 제출 채널·참조 정책·검토 TTL·실제 증적은 모두 외부 미결정이다. PostgreSQL 16 append-only 구조와 Kill Switch를 유지한다.

SCOPE: 7단계 검증 대기열 계약, 요구사항별 슬롯 6개, 허용 증적 종류 12개, 불변 참조·SHA-256·발급자 출처·중복 방지 요구, 원문·자격·비밀 저장 금지, API 읽기/계약 생성, 단위·통합·역조건 테스트.

OUT OF SCOPE: 실제 증적 참조·해시 입력, 외부 참조 fetch, 제출 ID 발급, queue enqueue·상태 전이, 검토 결정, 자동 승격, 자격정보 저장, 네트워크 연결과 개인정보 이행.

CONSTRAINTS: SECURITY_APPROVER만 계약 생성이 가능하다. 모든 슬롯은 `AWAITING_EXTERNAL_SUBMISSION_CHANNEL`, 실제 메타데이터는 NULL, 검증은 `NOT_SUBMITTED`, 자동 승격과 연결·실행은 false다.

TOOLS: Node.js 24, PostgreSQL 16, Docker Compose, `pg`, node:test, 정적 validator, Git diff/status.

WORKFLOW: Phase 34 최신 패킷 확인 → 대기열 계약 생성 → PostgreSQL 0021 적용 → API 연결 → 단위 테스트 → Phase 통합 → append-only 역조건 → rollback/reapply → 전체 회귀 → 보고서·상태 갱신.

SUCCESS CRITERIA: 단계 7/7, 슬롯 6/6, 증적 종류 12/12, 단위 105/105, Phase 통합 1/1, PostgreSQL 통합 26/26, UPDATE/DELETE 2/2 차단, migration 왕복 PASS, 제출·승격·연결 false.

FAILURE CRITERIA: 증적이나 채널을 추정하고, 원문·자격·비밀을 저장하며, fetch·enqueue·검토·활성화 API를 제공하거나, 과거 패킷·만료·법적 보존·해시 불일치를 허용한다.

OUTPUTS: 도메인 모듈, 0021 migration/rollback, 계약 JSON, API·repository, 단위·통합 테스트, 개발 계약, QA 증거, Phase 보고서, STATUS·로드맵.

VERIFICATION: 구문 검사, 단위 테스트, 정적 Phase 검사, PostgreSQL 통합, 불변성 역조건, migration forward/rollback/reapply, 전체 제품화 검사, `git diff --check`.

MEMORY UPDATE: Phase 35 상태, 테스트 수, 외부 미결정 채널·정책, 안전 경계와 다음 Phase를 기록한다. 실제 참조·해시·증적·자격정보는 기록하지 않는다.

STOP CONDITION: 자동 검증이 통과하면 `AUTO_VERIFIED_LOCAL_CONFIGURATION_EVIDENCE_QUEUE_BLOCKED_EXTERNAL`로 종료하며 외부 채널이 없으면 차단을 유지한다.
