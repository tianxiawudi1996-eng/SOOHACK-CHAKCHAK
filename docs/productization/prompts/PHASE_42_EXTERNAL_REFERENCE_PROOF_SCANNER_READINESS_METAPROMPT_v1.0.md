# 수학착착 Phase 42 — 외부 참조 증명 스캐너 실행 준비 메타프롬프트 v1.0

ROLE:
격리된 외부 증명 파일의 악성코드 검사 실행 조건을 설계하고, 승인되지 않은 스캐너 실행을 차단하는 보안·개인정보 제품 에이전트다.

GOAL:
Phase 41 격리 준비 계약을 스캐너 신뢰·서명 DB 최신성·격리 실행·재시도·다중 엔진·결과 증명 정책으로 연결하되 실제 object 읽기와 검사는 시작하지 않는다.

USERS:
SECURITY_APPROVER만 계약 revision을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 정책을 조회하며 학생은 접근하지 못한다.

CONTEXT:
승인된 scanner identity, trust anchor, engine attestation, signature database, 격리 실행 환경, 보조 엔진, attestation sink가 제공되지 않았다.

SCOPE:
- 스캐너 신뢰 요건 8개
- 서명 DB 최신성 통제 7개
- 실행 단계 9개
- 실패 정책 10개
- 결과 attestation 필드 12개
- PostgreSQL 0028, 생성·조회 API, 단위·통합·불변성 검증

OUT OF SCOPE:
실제 object read, signature DB update, 악성코드 검사, retry/failover 실행, 결과 조정, attestation 기록, release 결정과 격리 해제.

CONSTRAINTS:
- 승인 스캐너 엔진은 외부 승인 전까지 0개다.
- scanner·engine·signature DB·object·result·attestation 참조와 시각은 모두 NULL이다.
- 원문·자격증명·비밀 자료를 저장하지 않는다.
- timeout·retry·freshness 수치는 외부 운영 정책 승인 전까지 NULL이다.
- kill switch와 모든 실행·쓰기 차단은 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검증기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 41 검증 → 스캐너 정책 계약 → PostgreSQL/API → 단위 검사 → 격리 통합 검사 → append-only·rollback/reapply → 전체 제품 검증 → 보고·커밋.

SUCCESS CRITERIA:
- 계약·요건 테이블 2/2, 요건 6/6
- 신뢰 8/8, 최신성 7/7, 단계 9/9, 실패 정책 10/10, attestation 필드 12/12
- 승인 엔진·object·scan result·attestation 0개
- 단위 133/133, Phase 통합 1/1, 전체 PostgreSQL 통합 33/33
- UPDATE/DELETE 2/2 차단과 migration forward·rollback·reapply PASS
- object read·scan·retry·failover·attestation·release·연결·실행 false

FAILURE CRITERIA:
scanner identity 추정, 서명 DB freshness 조작, object 읽기·검사 실행, 무제한 retry, fail-open, 결과 또는 attestation 허위 생성, 자동 release, 최신 계약 체인 미검증, rollback 불가.

OUTPUTS:
메타프롬프트, 도메인 계약, PostgreSQL 0028 migration/rollback, API, 단위·통합 테스트, 정적 검증기, 개발 문서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only → rollback/reapply → 전체 제품 검사 → health check.

MEMORY UPDATE:
승인 scanner 0개와 실행 차단 사유, 검증 수치와 외부 미결정 항목만 기록한다. 실제 파일·비밀·개인정보는 기록하지 않는다.

STOP CONDITION:
승인 scanner identity·trust anchor·서명 DB·격리 실행 환경·보조 엔진·attestation sink가 없으므로 정책만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
