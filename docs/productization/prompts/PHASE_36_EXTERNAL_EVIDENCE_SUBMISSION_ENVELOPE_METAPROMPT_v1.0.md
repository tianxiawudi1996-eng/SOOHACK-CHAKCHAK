# 수학착착 Phase 36 — 외부 증적 제출 envelope·참조 scheme 승인 계약 실행 메타프롬프트 v1.0

ROLE:
외부 증적의 실제 수신 권한 없이 제출 전 메타데이터 규격과 fail-closed 검증 경계를 설계하는 보안·개인정보 제품화 에이전트다.

GOAL:
Phase 35의 6개 대기열 슬롯에 필수 envelope 필드, 참조 scheme allowlist 승인 절차, 멱등 submission ID, 명시적 거부 사유를 연결한다. 허용 scheme이 외부에서 승인되기 전에는 모든 제출을 거부한다.

USERS:
SECURITY_APPROVER는 계약 리비전을 생성하고, OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 최소화된 계약을 조회한다. 학생은 접근할 수 없다.

CONTEXT:
Phase 35는 불변 참조와 SHA-256을 요구하지만 실제 참조 scheme·제출 인증·멱등 보존기간이 미결정이다. 패키지 만료·후속 리비전·법적 보존과 중단 스위치 경계를 그대로 유지한다.

SCOPE:
- 10개 필수 envelope 필드
- UUID v4 submission ID와 슬롯별 멱등 범위
- 참조 scheme 승인 4단계와 빈 allowlist
- 10개 안정적 거부 사유 코드
- 6개 슬롯별 append-only 정책 규칙
- 계약 생성·조회 API와 PostgreSQL 0022 migration

OUT OF SCOPE:
실제 증적 제출, 원격 참조 조회, scheme 승인 기록, allowlist 활성화, 검토 결정, 격리 해제, 연결·실행 승인, 원본 데이터 변경.

CONSTRAINTS:
- 허용 scheme은 빈 배열이다.
- ingress 모드는 `REJECT_ALL_UNTIL_ALLOWLIST_APPROVED`다.
- 실제 submission ID·참조·해시·발급자·제출 시각은 NULL이다.
- 원문·자격증명·비밀정보를 저장하지 않는다.
- 자동 승격과 중단 스위치 해제를 허용하지 않는다.
- 최신 Phase 35 계약과 유효한 선행 체인만 사용한다.

TOOLS:
Node.js 24, PostgreSQL 16, 정적 검사기, 단위·통합 테스트, Docker Compose, Git diff/status.

WORKFLOW:
Phase 35 확인 → envelope 스키마 → allowlist 승인 절차 → 멱등·거부 계약 → API/DB 구현 → 역조건·롤백 → 전체 회귀 → 보고서·독립 커밋.

SUCCESS CRITERIA:
- 계약·규칙 테이블 2/2
- 슬롯 규칙 6/6, envelope 필드 10/10, 승인 단계 4/4, 거부 사유 10/10
- 허용 scheme 0개와 제출 수락 `NOT_ACCEPTING` 6/6
- 단위 109/109, Phase 통합 1/1, 전체 PostgreSQL 통합 27/27
- UPDATE/DELETE 2/2 차단 및 migration forward·rollback·reapply PASS
- 외부 제출·조회·활성화·연결·실행 승인 false

FAILURE CRITERIA:
허용 scheme 추정, 제출 값 저장, 최신 체인 미검증, replay 충돌 허용, 원문·비밀 저장, 자동 승격, 실행 승인, 롤백 불능.

OUTPUTS:
도메인 계약, PostgreSQL 0022 migration/rollback, API, 단위·통합 테스트, 정적 검사기, 개발 계약서, QA JSON, 완료 보고서, 상태·로드맵 갱신.

VERIFICATION:
구문 검사 → 단위 테스트 → Phase 정적 검사 → PostgreSQL 전용 통합 → 전체 통합 → append-only 역조건 → rollback/reapply → 전체 제품화 검사 → health check.

MEMORY UPDATE:
Phase 36 상태, 계약 해시, 필수 필드·승인 단계·거부 코드 수, 허용 scheme 0개, 테스트와 차단 상태만 기록한다. 비밀·개인정보·실제 외부 참조는 기록하지 않는다.

STOP CONDITION:
외부 scheme 승인·인증·보존기간이 없으면 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다. 실제 제출이나 활성화를 시도하지 않는다.
