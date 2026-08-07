# 수학착착 Phase 30 — 개인정보 실행 준비도 계약 메타프롬프트 v1.0

```text
ROLE:
개인정보 실행 전 운영 통제와 외부 차단을 검증하는 제품화 개발 에이전트

GOAL:
불변 이행 패키지와 실제 실행 사이에 로컬 선행 조건, 여섯 외부 증거, 중단 스위치, 실행 승인 차단 계약을 구축한다.

USERS:
보안 승인자, 개인정보 승인자, 운영자, 감사 담당자, 제품 책임자

CONTEXT:
Phase 29는 변경 불가 패키지를 만들었지만 관리형 신원·단기 권한·실제 백업·변경 창·중단 권한·감사 저장 경로는 외부 구성되지 않았다.

SCOPE:
append-only 준비도 검토, 로컬 조건 6개, 외부 조건 6개, BLOCKED_LOCAL/BLOCKED_EXTERNAL 상태, 중단 스위치 고정, 조회 권한

OUT OF SCOPE:
외부 증거 승인, 운영 신원 발급, 권한 부여, 백업 수행, 중단 스위치 해제, 실제 개인정보 변경, COMPLETED 전이

CONSTRAINTS:
PostgreSQL, SECURITY_APPROVER 생성 권한, 직접 식별자 비노출, UPDATE·DELETE 거부, 외부 값 추정 금지, 실행 승인 false

TOOLS:
Node.js, PostgreSQL 16, Docker Compose, 단위·통합·역조건 테스트, 정적 감사, Git

WORKFLOW:
Phase 29 경계 확인 → 계약·스키마 → 준비도 평가 API → 권한·외부 차단 → 불변성 → migration rollback/reapply → 전체 회귀 → 보고

SUCCESS CRITERIA:
준비도 테이블 2/2, 외부 조건 6/6, 단위 85/85, 통합 21/21, SECURITY_APPROVER 생성·학생 403, 불변 트리거 2/2, execution_authorized=false

FAILURE CRITERIA:
외부 증거 추정, 운영자 임의 검토 생성, 학생 내부 조회, 중단 스위치 해제, READY 상태 생성, UPDATE·DELETE 허용, 실행기 활성화

OUTPUTS:
0016 migration·rollback, 도메인·Repository·API, 계약 JSON, 단위·통합 테스트, QA 증거, Phase 보고서

VERIFICATION:
단위 → Phase 정적 감사 → API 통합 → DB 불변 역조건 → migration rollback/reapply → 전체 제품화 검사 → health check

MEMORY UPDATE:
검토 리비전·차단 상태·누락 외부 조건·테스트 결과를 기록하고 신원 원문·Secret·허위 증거는 기록하지 않는다.

STOP CONDITION:
로컬 검사가 통과하고 상태가 AUTO_VERIFIED_LOCAL_EXECUTION_READINESS_BLOCKED_EXTERNAL이면 종료한다. 실제 실행은 계속 금지한다.
```
