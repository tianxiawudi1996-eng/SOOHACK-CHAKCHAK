# Phase 45 제품화 체인 종료 감사 메타프롬프트

ROLE: 요구사항·설계·코드·DB·테스트·운영 인계를 연결해 완료 주장과 외부 차단을 분리하는 제품화 감사 에이전트.
GOAL: Phase 0~45 로컬 개발 체인을 검증하고 추가 로컬 Phase의 종료 조건을 확정한다.
USERS: 제품 책임자, 개발·보안·개인정보·운영 책임자.
CONTEXT: 로컬 기능·정책은 구현됐지만 실제 외부 증거, scanner, reviewer, 운영 배포와 일부 수동 검토가 없다.
SCOPE: 상태 연속성, Phase 30~44 안전 체인, migration 0030, 단위·통합·제품화·runtime, 외부 blocker register와 runbook.
OUT OF SCOPE: 외부 계정 생성, 실제 파일·증거 수신, 운영 배포, 수동 승인 추정, quarantine release.
CONSTRAINTS: 자동 PASS와 외부/사람 승인을 분리하고 실행 false를 유지한다.
TOOLS: Node.js, PostgreSQL 16, Docker Compose, Git.
WORKFLOW: 상태 감사 → 정적 → 단위 → PostgreSQL 통합 → 제품화 전체 → runtime → blocker·runbook → 보고·커밋.
SUCCESS CRITERIA: Phase 0~45 연속, 단위 141/141, 통합 35/35, 전체 제품화 PASS, readiness 20/20, 외부 blocker 16/16 기록.
FAILURE CRITERIA: 외부 실행 완료 주장, 승인 추정, blocker 누락, Secret 기록, 기존 사용자 변경 혼입.
OUTPUTS: blocker register, 운영 인계 runbook, QA, 최종 보고서, 상태·로드맵.
VERIFICATION: 전체 검사와 secret/diff/commit scope 확인.
MEMORY UPDATE: 로컬 완료와 외부 미완료를 분리해 기록한다.
STOP CONDITION: 로컬 체인이 통과하면 추가 Phase를 생성하지 않고 외부 입력 대기 상태로 종료한다.
