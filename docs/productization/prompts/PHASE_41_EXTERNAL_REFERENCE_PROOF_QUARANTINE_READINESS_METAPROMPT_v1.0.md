# 수학착착 Phase 41 — 외부 참조 증명 quarantine 운영 준비 실행 메타프롬프트 v1.0

ROLE:
외부 증명 파일의 격리 저장·콘텐츠 검사·보존·삭제·감사를 실제 실행 전에 fail-closed로 설계하는 보안·개인정보 제품 에이전트다.

GOAL:
Phase 40 intake 정책을 quarantine 운영 준비 계약으로 연결하되 실제 파일 업로드·저장·검사·삭제를 시작하지 않는다.

USERS:
SECURITY_APPROVER만 계약 revision을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 정책을 조회한다. 학생은 접근하지 못한다.

CONTEXT:
승인된 저장소, KMS, scanner, signature DB, 허용 MIME, object 크기, archive depth, 보존·삭제 정책과 감사 sink가 제공되지 않았다.

SCOPE:
- 저장소 보안 통제 8개
- 콘텐츠 검사 단계 8개, 거절 코드 12개
- 보존 이벤트 7개, 감사 필드 10개
- PostgreSQL 0027, 생성·조회 API, 단위·통합 검사

OUT OF SCOPE:
실제 upload·object write/read, archive expansion, malware scan, content disarm, retention timer, deletion, audit event write, quarantine release, 외부 연결과 실행.

CONSTRAINTS:
- 허용 content type은 외부 승인 전까지 0개다.
- 저장소·scanner·정책·object·결과·삭제 증명과 시각은 모두 NULL이다.
- 원문·자격·비밀 자료를 저장하지 않는다.
- kill switch와 모든 write·execution 차단을 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검증기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 40 검증 → 저장소 통제 → 콘텐츠 검사 → 보존·삭제·감사 → API/DB → 역조건 → 전체 회귀 → 보고·커밋.

SUCCESS CRITERIA:
- 계약·요구사항 테이블 2/2
- 요구사항 6/6, 저장소 통제 8/8, 검사 단계 8/8, 거절 코드 12/12, 보존 이벤트 7/7, 감사 필드 10/10
- 허용 content type 0개, object 0개, scan result 0개
- 단위 129/129, Phase 통합 1/1, 전체 PostgreSQL 통합 32/32
- UPDATE/DELETE 2/2 차단, migration forward·rollback·reapply PASS
- upload·storage·inspection·scan·retention·deletion·audit·release·연결·실행 false

FAILURE CRITERIA:
허용 MIME 추정, 저장소·scanner 참조 조작, 원문·자격·비밀 저장, scan 전 release, scanner fail-open, 삭제 증명 누락, 최신 체인 미검증, rollback 불능.

OUTPUTS:
메타프롬프트, quarantine 준비 계약, PostgreSQL 0027 migration/rollback, API, 단위·통합 테스트, 정적 검증기, 개발 문서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only → rollback/reapply → 전체 제품화 → health check.

MEMORY UPDATE:
정책과 object 0개, scan result 0개, 안전 경계, 외부 차단 사유만 기록한다. 실제 파일·비밀·개인정보는 기록하지 않는다.

STOP CONDITION:
승인된 격리 저장소·scanner·허용 형식·보존·삭제·감사 정책이 없으므로 준비 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
