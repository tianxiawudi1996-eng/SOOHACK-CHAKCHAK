# 수학착착 Phase 33 — 외부 증거 수신 어댑터 계약 실행 메타프롬프트 v1.0

ROLE: 개인정보 이행 증거의 외부 연결 경계를 통제하는 보안·백엔드·PostgreSQL 개발 에이전트

GOAL: Phase 32의 검증 정책 앞단에 수신 포트, 서명, 발급자 신뢰, 재전송 방지, 격리, 실패 복구 계약을 추가하되 실제 외부 연결과 증거 수신은 활성화하지 않는다.

USERS: SECURITY_APPROVER, PRIVACY_APPROVER, OPERATOR 및 운영 연결 책임자

CONTEXT: Phase 32는 상태기계만 정의했고 제출 채널·발급자·서명 정책·유효기간은 외부 미결정 상태다. PostgreSQL 16, Node.js API, append-only 운영 증적 구조를 유지한다.

SCOPE: 6개 통제별 포트 계약, 6단계 파이프라인, mTLS 필수 계약, 서명·발급자 신뢰·재전송 방지·격리·재처리·실패 복구의 fail-closed 상태, 해시·리비전·멱등성, API 읽기/계약 생성, 단위·통합·역조건 테스트.

OUT OF SCOPE: 네트워크 접속, 실제 endpoint/인증서/서명 알고리즘 추정, 증거 원문 저장, 격리 해제, 재시도 실행, 검증 상태 변경, 개인정보 이행 실행.

CONSTRAINTS: SECURITY_APPROVER만 생성하며 운영 역할은 읽기만 가능하다. 모든 포트는 `MISSING_EXTERNAL`, endpoint와 transport identity는 NULL, 네트워크와 실행 승인은 false, mTLS·서명·replay·격리는 필수, 원문 저장·자동 해제는 false다.

TOOLS: Node.js 24, PostgreSQL 16, `pg`, Docker Compose, node:test, 정적 validator, Git diff/status.

WORKFLOW: Phase 32 최신 계약 확인 → 도메인 계약 생성 → PostgreSQL 0019 적용 → API 연결 → 단위 테스트 → Phase 통합 → append-only 역조건 → rollback/reapply → 전체 회귀 → 보고서·상태 갱신.

SUCCESS CRITERIA: 포트 6/6와 파이프라인 6/6, 단위 97/97, Phase 통합 1/1, PostgreSQL 통합 24/24, UPDATE/DELETE 2/2 차단, migration 왕복 PASS, 네트워크·수신·실행 false.

FAILURE CRITERIA: 외부 값을 임의 생성하거나 연결을 열고, 원문을 저장하거나 자동 격리 해제·재시도를 제공하고, 과거 계약·만료 패키지·활성 법적 보존·해시 불일치를 허용하거나 원본 데이터를 변경한다.

OUTPUTS: 도메인 모듈, 0019 migration/rollback, 계약 JSON, API·repository, 단위·통합 테스트, 개발 계약, QA 증거, Phase 보고서, STATUS·로드맵.

VERIFICATION: 구문 검사, 단위 테스트, 정적 Phase 검사, PostgreSQL 16 통합, 불변성 역조건, migration forward/rollback/reapply, 전체 제품화 검사, `git diff --check`.

MEMORY UPDATE: Phase 33 상태, 테스트 수, 외부 미결정 항목, 안전 경계, 다음 Phase 범위를 기록한다. 비밀값·인증서·증거 원문은 기록하지 않는다.

STOP CONDITION: 자동 검증이 모두 통과하면 `AUTO_VERIFIED_LOCAL_INTAKE_ADAPTER_CONTRACT_BLOCKED_EXTERNAL`로 종료한다. 실제 연결 정보나 권한이 필요하면 외부 차단 상태를 유지한다.
