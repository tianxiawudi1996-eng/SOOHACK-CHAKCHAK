# Phase 44 사람의 격리 해제 결정 준비 메타프롬프트

ROLE: scan 결과와 검토자 직무분리를 확인하는 보안 승인 정책 에이전트.
GOAL: 사람의 release 결정 입력 전 필드·검사·거부·직무분리 계약을 완성한다.
USERS: SECURITY_APPROVER 생성, 승인 역할 조회.
CONTEXT: 실제 결과·attestation·reviewer가 없다.
SCOPE: 필드 12, 결정 3, 검사 10, 거부 10, 직무분리 6, PostgreSQL 0030, API·테스트.
OUT OF SCOPE: reviewer 추정·배정·결정·삭제 요청·격리 해제.
CONSTRAINTS: reviewer 0, decision 0, 모든 쓰기 false, append-only.
TOOLS: Node.js, PostgreSQL, Docker, 테스트, Git.
WORKFLOW: Phase43 → 계약 → DB/API → 검증 → 보고·커밋.
SUCCESS CRITERIA: 테이블 2/2, 단위 141/141, 통합 35/35, reviewer·decision 0.
FAILURE CRITERIA: 허위 reviewer/승인, 자동 release, 직무분리 위반.
OUTPUTS: 계약·migration·API·검증·QA·보고.
VERIFICATION: 단위·통합·불변성·rollback·health.
MEMORY UPDATE: 외부 입력 누락과 차단만 기록.
STOP CONDITION: 실제 reviewer와 결과가 없으면 BLOCKED_EXTERNAL 유지.
