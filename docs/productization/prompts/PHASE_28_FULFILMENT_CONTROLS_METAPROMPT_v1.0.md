# 수학착착 Phase 28 — 개인정보 이행 dry-run·법적 보류·이중 승인 실행 메타프롬프트 v1.0

```text
ROLE:
개인정보 이행 안전성·PostgreSQL 영향 분석·직무 분리·감사를 연결하는 시니어 웹개발 에이전트

GOAL:
실제 데이터 변경 전에 영향 범위, 법적 보류, 서로 다른 2인의 승인을 검증하고 파괴적 실행을 차단한다.

USERS:
개인정보 운영자, 개인정보 승인자, 보안 승인자

CONTEXT:
Phase 27은 요청 승인까지 제공하지만 실제 이행 전 영향 산정·법적 보류·이중 승인 통제가 없다.

SCOPE:
DRY_RUN 계획, 영향 집계·해시, 법적 보류 설정·해제, 역할 분리, 서로 다른 승인자 2인, PostgreSQL 트랜잭션·롤백

OUT OF SCOPE:
원본 데이터 변경, 파일 내보내기, 동의 변경, COMPLETED 전이, 운영 신원 발급, 법률 준수 인증

CONSTRAINTS:
모든 계획은 DRY_RUN_ONLY다. 활성 법적 보류는 승인을 차단한다. 동일 사용자 또는 동일 역할의 중복 승인을 허용하지 않는다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, node:test, 정적 감사, Git

WORKFLOW:
운영 경계 확인 → 0014 DB 설계 → dry-run 영향 산정 → 법적 보류 → 역할 분리 이중 승인 → 실행 차단 → 단위·통합 → 롤백·재적용 → 전체 회귀 → 보고

SUCCESS CRITERIA:
통제 테이블 5/5, 단위 74/74, Phase 28 통합 1/1, 전체 통합 19/19, 학생 접근 403, 법적 보류 409, 이중 승인 2/2, 실행기 비활성, 마이그레이션 PASS

FAILURE CRITERIA:
원본 데이터 변경, 보류 중 승인, 동일 승인자의 이중 승인, 영향 원문 노출, 승인만으로 완료 상태 생성

OUTPUTS:
0014 마이그레이션·롤백, 이행 통제 도메인·API·Repository, 계약·테스트·QA·보고서

VERIFICATION:
npm.cmd run test:unit; npm.cmd run test:productization:fulfilment-controls; 전체 integration; PostgreSQL 롤백·재적용; 전체 productization; git diff --check

MEMORY UPDATE:
Phase 28 자동 검증과 실제 이행 차단을 STATUS·ROADMAP·보고서에 기록한다.

STOP CONDITION:
로컬 통제 검증 후 AUTO_VERIFIED_LOCAL_FULFILMENT_CONTROLS로 종료한다. 별도 운영 승인 전 파괴적 실행기를 만들거나 실행하지 않는다.
```
