# 수학착착 Phase 38 — 외부 참조 대상 정규화·SSRF 방어 계약 실행 메타프롬프트 v1.0

ROLE:
외부 참조 대상이 등록되기 전에 authority·bucket·path의 모호성과 SSRF 위험을 fail-closed 정책으로 차단하는 보안·개인정보 제품화 에이전트다.

GOAL:
Phase 37의 미제안 상태를 유지하면서 엄격한 단일 파싱, 정규화, 거부 규칙, 소유권 증명, DNS·리전 검증 요건을 append-only 계약으로 고정한다.

USERS:
SECURITY_APPROVER만 계약 리비전을 생성한다. OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 최소화된 정책을 조회한다. 학생은 접근할 수 없다.

CONTEXT:
Phase 37은 scheme·authority·bucket·path를 추정하거나 저장하지 않았다. 실제 제안값, 승인자, DNS 결과, 소유권 증명, 허용 포트는 아직 외부 제공과 승인이 없다.

SCOPE:
- 대상 정규화 단계 8개
- 거부 규칙 14개
- 소유권 증명 유형 6개
- 금지 주소 클래스 8개
- wildcard·userinfo·IP literal·경로 탈출·인코딩 우회·동형문자 차단
- redirect 0회, DNS 재바인딩·사설망 차단 정책
- PostgreSQL 0024, 생성·조회 API, 단위·통합 검사

OUT OF SCOPE:
실제 대상 입력, URI 파싱 실행, DNS 조회, 리전 조회, 소유권 증명 제출·검증, allowlist 쓰기·활성화, 외부 참조 fetch, 네트워크 접속과 실행.

CONSTRAINTS:
- 실제 정규화 대상·결과·증적·DNS snapshot·검증 시각은 모두 NULL이다.
- 허용 포트는 외부 정책 전까지 빈 배열이다.
- redirect는 금지하고 최대 횟수는 0이다.
- 공인 주소 여부를 실제 조회했다고 추정하지 않는다.
- 중단 스위치와 실행 차단을 유지한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, 정적 검증기, 단위·통합 테스트, Git diff/status.

WORKFLOW:
Phase 37 검증 → 정규화 토큰 → 거부·SSRF 규칙 → 소유권 증명 계약 → API/DB → 역조건 검사 → 전체 회귀 → 보고·커밋.

SUCCESS CRITERIA:
- 계약·규칙 테이블 2/2
- 규칙 6/6, 정규화 8/8, 거부 규칙 14/14, 소유권 증명 6/6, 금지 주소 8/8
- 대상·소유권 증적·DNS snapshot 0개
- 단위 117/117, Phase 통합 1/1, 전체 PostgreSQL 통합 29/29
- UPDATE/DELETE 2/2 차단, migration forward·rollback·reapply PASS
- DNS·redirect·allowlist·fetch·연결·실행 권한 false

FAILURE CRITERIA:
대상값 추정, Unicode authority를 검증 없이 신뢰, wildcard·IP literal·사설망·경로 탈출 허용, redirect 수행, DNS 조회 수행 주장, 외부 증명 없이 allowlist 쓰기, 원문·비밀 저장, 최신 체인 미검증, 롤백 불능.

OUTPUTS:
메타프롬프트, 정책 계약, PostgreSQL 0024 migration/rollback, API, 단위·통합 테스트, 정적 검증기, 개발 문서, QA JSON, 완료 보고서, 상태·로드맵.

VERIFICATION:
구문·JSON → 단위 → Phase 정적 → PostgreSQL 통합 → 전체 통합 → append-only 역조건 → rollback/reapply → 전체 제품화 → health check.

MEMORY UPDATE:
규칙 수, 대상·증적 0개, 안전 경계, 테스트 결과와 외부 차단 사유만 기록한다. 실제 외부 이름·주소·DNS 결과·비밀값은 기록하지 않는다.

STOP CONDITION:
실제 제안과 소유권 증명, 승인된 DNS 검증 경로가 없으므로 정책 계약만 완료하고 `BLOCKED_EXTERNAL`을 유지한다.
