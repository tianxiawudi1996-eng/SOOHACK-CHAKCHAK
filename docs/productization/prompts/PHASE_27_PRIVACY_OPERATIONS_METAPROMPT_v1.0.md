# 수학착착 Phase 27 — 개인정보 운영자 처리 큐 실행 메타프롬프트 v1.0

```text
ROLE:
개인정보 요청 운영·권한·PostgreSQL 트랜잭션·감사를 연결하는 시니어 웹개발 에이전트

GOAL:
권리 요청을 안전하게 배정·신원 확인·검토·승인/반려하되 실제 이행 전에는 완료로 표시하지 않는다.

USERS:
로컬 합성 개인정보 운영자와 요청 상태를 조회하는 학생

CONTEXT:
Phase 26은 학생 요청 접수·조회·취소를 제공하지만 운영자 큐·결정·증적 저장이 없다.

SCOPE:
로컬 합성 ADMIN 인증, 운영 큐, 담당자 배정, 신원 증적, 승인·반려 사유, 상태 이력, 멱등성, PostgreSQL 롤백

OUT OF SCOPE:
운영 관리자 발급, 신분증 원문 저장, 실제 삭제·정정·내보내기·동의 변경, COMPLETED 전이, 법률 준수 인증

CONSTRAINTS:
학생과 운영 권한을 분리하고 직접 식별자를 운영 응답에서 제거한다. 실제 이행 실행기가 없으면 완료를 차단한다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, node:test, 정적 감사, Git

WORKFLOW:
권한 경계 확인 → 0013 DB 설계 → 운영 상태 전이 → 로컬 합성 ADMIN API → 단위·역조건 테스트 → PostgreSQL 통합 → 롤백·재적용 → 전체 회귀 → 보고

SUCCESS CRITERIA:
운영 테이블 3/3, 단위 71/71, 운영 통합 1/1, 전체 통합 18/18, 학생 접근 403, 완료 전이 409, 마이그레이션 전진·롤백·재적용 PASS

FAILURE CRITERIA:
학생의 운영 큐 접근, 담당자 충돌 무시, 증적 없는 신원 확인, 사유 없는 결정, 식별자 노출, 자동 완료·파괴적 이행

OUTPUTS:
0013 마이그레이션·롤백, 운영 도메인·API·Repository, 계약·테스트·QA·보고서

VERIFICATION:
npm.cmd run test:unit; npm.cmd run test:productization:privacy-operations; 전체 integration; PostgreSQL 롤백·재적용; 전체 productization; git diff --check

MEMORY UPDATE:
Phase 27 상태와 외부 관리형 신원·정책 차단을 STATUS·ROADMAP·보고서에 남긴다.

STOP CONDITION:
로컬 검증 통과 시 AUTO_VERIFIED_LOCAL_PRIVACY_OPERATIONS로 종료한다. 외부 신원·정책 승인 없이 운영 배포나 이행 실행기를 시작하지 않는다.
```
