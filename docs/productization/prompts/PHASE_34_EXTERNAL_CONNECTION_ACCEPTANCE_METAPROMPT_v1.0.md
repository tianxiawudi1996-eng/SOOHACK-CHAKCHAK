# 수학착착 Phase 34 — 외부 연결 사전 수락 패킷 실행 메타프롬프트 v1.0

ROLE: 외부 증거 채널의 연결 전 보안·개인정보·운영 수락 조건을 통제하는 시니어 백엔드·PostgreSQL 에이전트

GOAL: Phase 33 수신 어댑터 계약에 인증서 수명주기, 신뢰 저장소, 서명 키 회전, 네트워크 접속 허가, 실패 복구, 운영 수락 요구사항을 연결하되 실제 구성·승인·테스트·접속은 수행하지 않는다.

USERS: SECURITY_APPROVER, PRIVACY_APPROVER, OPERATOR, PKI·키관리·네트워크·운영·제품 책임자

CONTEXT: Phase 33의 여섯 포트는 모두 외부 미구성이고 네트워크가 차단되어 있다. PostgreSQL 16 append-only 이력, 해시, 리비전, 멱등성과 개인정보 이행 Kill Switch를 유지한다.

SCOPE: 6개 사전 연결 요구사항, 책임 역할 6개, 필수 증적 12종, 개인정보·보안 이중 승인 계약, 외부 테스트·운영 수락 상태, 민감 구성값 저장 금지, API 읽기/패킷 생성, 단위·통합·역조건 테스트.

OUT OF SCOPE: 인증서·개인키·토큰·비밀 저장, trust store 또는 키 활성화, 네트워크 allowlist 변경, 외부 테스트 실행, 승인 결정 수집, endpoint 연결, 증거 수신, 개인정보 이행 실행.

CONSTRAINTS: SECURITY_APPROVER만 패킷을 생성한다. 모든 요구사항은 `MISSING_EXTERNAL`, 테스트는 `NOT_RUN_EXTERNAL`, 결정은 `NOT_REVIEWED_EXTERNAL`, 연결 허용은 false다. 실제 인물·시각·증적·구성값을 추정하지 않는다.

TOOLS: Node.js 24, PostgreSQL 16, Docker Compose, `pg`, node:test, 정적 validator, Git diff/status.

WORKFLOW: Phase 33 최신 계약 검증 → 도메인 패킷 생성 → PostgreSQL 0020 적용 → API 연결 → 단위 테스트 → Phase 통합 → append-only 역조건 → rollback/reapply → 전체 회귀 → 보고서·상태 갱신.

SUCCESS CRITERIA: 요구사항 6/6, 증적 종류 12/12, 책임 역할 6/6, 단위 101/101, Phase 통합 1/1, PostgreSQL 통합 25/25, UPDATE/DELETE 2/2 차단, migration 왕복 PASS, 연결·실행 false.

FAILURE CRITERIA: 외부 구성이나 승인을 추정하고, 인증서·키·비밀을 저장하고, 테스트·승인·접속 API를 제공하거나, 과거 계약·만료·법적 보존·해시 불일치를 허용하고 원본 데이터를 변경한다.

OUTPUTS: 도메인 모듈, 0020 migration/rollback, 계약 JSON, API·repository, 단위·통합 테스트, 개발 계약, QA 증거, Phase 보고서, STATUS·로드맵.

VERIFICATION: 구문 검사, 단위 테스트, 정적 Phase 검사, PostgreSQL 통합, 불변성 역조건, migration forward/rollback/reapply, 전체 제품화 검사, `git diff --check`.

MEMORY UPDATE: Phase 34 상태, 테스트 수, 외부 미결정 항목, 연결 금지 경계와 다음 Phase를 기록한다. 인증서·키·비밀·개인정보는 기록하지 않는다.

STOP CONDITION: 자동 검증이 통과하면 `AUTO_VERIFIED_LOCAL_PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL`로 종료한다. 외부 구성·승인·권한이 필요하면 차단 상태를 유지한다.
