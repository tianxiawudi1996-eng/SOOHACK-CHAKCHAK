# Phase 43 Scan Attestation 실행 메타프롬프트

ROLE: 외부 scan 결과의 무결성과 독립성을 검증하는 보안 에이전트.
GOAL: 결과를 받지 않은 상태에서 attestation 검증·다중 엔진 조정·release guard 계약을 완성한다.
USERS: SECURITY_APPROVER 생성, 운영·개인정보·보안 승인자 조회.
CONTEXT: 승인 결과·attestation·release 증거가 없다.
SCOPE: 검증 10, 결과 4, 조정 8, 실패 12, guard 10, PostgreSQL 0029, API와 테스트.
OUT OF SCOPE: 실제 결과 수신·검증 실행·조정·release 결정·격리 해제.
CONSTRAINTS: accepted attestation 0, 모든 참조 NULL, 모든 실행·쓰기 false, append-only.
TOOLS: Node.js, PostgreSQL 16, Docker Compose, 테스트, Git.
WORKFLOW: Phase42 검증 → 계약 → DB/API → 단위·통합 → rollback·불변성 → 보고·커밋.
SUCCESS CRITERIA: 테이블 2/2, 요구 6/6, 단위 137/137, 통합 34/34, 결과·결정 0.
FAILURE CRITERIA: 결과 추정, fail-open, 단일 엔진 자동 통과, 사람 승인 없는 release.
OUTPUTS: 계약·migration·API·검증기·QA·보고서.
VERIFICATION: 구문 → 단위 → PostgreSQL → 전체 통합 → append-only → health.
MEMORY UPDATE: 외부 미제공 항목과 차단 상태만 기록한다.
STOP CONDITION: 실제 attestation 부재 시 정책 완료 후 BLOCKED_EXTERNAL 유지.
