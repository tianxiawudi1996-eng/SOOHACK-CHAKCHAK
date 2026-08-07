# 수학착착 Phase 26 — 학생 개인정보 권리 요청 실행 메타프롬프트 v1.0

```text
ROLE:
요구사항·PostgreSQL·API·권한·감사를 연결하는 시니어 개인정보 보호 웹개발 에이전트

GOAL:
학생이 자신의 데이터 권리 요청을 안전하게 접수·조회·취소하고 모든 변경 이력을 추적할 수 있게 한다.

USERS:
1차 사용자는 인증된 학생이다. 보호자는 향후 관리형 신원·활성 연결·대리권 검증 후 별도 채널을 사용한다.

CONTEXT:
기존 consent_record와 데이터 보존 정책은 있으나 권리 요청 접수 API와 상태 이력 테이블은 없다.

SCOPE:
6개 요청 유형, 본인 소유권, 멱등성, PostgreSQL 요청·이력 테이블, 목록·상세·취소 API, 단위·통합 테스트

OUT OF SCOPE:
즉시 물리 삭제, 자동 동의 변경, 실제 내보내기 파일, 운영자 결정 화면, 보호자 대리 접수, 법률 준수 인증

CONSTRAINTS:
요청 접수와 실제 이행을 분리한다. 내부 사용자·학생 식별자와 학습 원문을 응답에 노출하지 않는다.

TOOLS:
Node.js 24, PostgreSQL 16, Docker Compose, node:test, 정적 검증 스크립트, Git diff/status

WORKFLOW:
기존 정책 확인 → 요구사항·법적 경계 기록 → DB 마이그레이션 → 도메인 상태 전이 → API·Repository → 단위 테스트 → PostgreSQL 롤백·재적용 → 통합·전체 회귀 → 보고

SUCCESS CRITERIA:
요청 유형 6/6, 단위 테스트 66/66, 데이터 권리 통합 1/1, 전체 PostgreSQL 통합 17/17, 마이그레이션 전진·롤백·재적용 PASS, 내부 식별자 노출 0

FAILURE CRITERIA:
요청만으로 데이터 삭제, 타인 요청 노출, 상태 전이 우회, 이력 없는 변경, 멱등성 미적용, 보호자 신원 추정

OUTPUTS:
0012 마이그레이션·롤백, 데이터 권리 도메인, API·Repository, 계약·테스트·QA 증거·Phase 보고서

VERIFICATION:
npm.cmd run test:unit; npm.cmd run test:productization:data-rights; PostgreSQL 16 롤백·재적용; 전체 integration; 전체 productization; git diff --check

MEMORY UPDATE:
Phase 26 상태, 실행한 검사, 외부 차단 조건, 다음 Phase 작업을 STATUS·ROADMAP·보고서에 기록한다.

STOP CONDITION:
로컬 자동 검증이 모두 통과하면 AUTO_VERIFIED_LOCAL_DATA_RIGHTS로 종료한다. 보호자 대리 접수와 실제 이행은 외부 신원·정책 승인 없이 시작하지 않는다.
```
