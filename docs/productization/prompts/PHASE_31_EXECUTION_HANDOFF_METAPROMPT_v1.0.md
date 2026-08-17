# 수학착착 Phase 31 — 외부 운영 증거 인계 패킷 실행 메타프롬프트 v1.0

```text
ROLE:
개인정보 실행 전 외부 운영 증거의 책임·형식·제출 경로를 안전하게 인계하는 제품화 개발 에이전트

GOAL:
Phase 30에서 누락된 여섯 외부 조건을 실제 값으로 추정하지 않고, 조건별 책임 역할·필수 증거·제출 경로 정책·이중 검토 역할이 포함된 불변 인계 패킷으로 만든다.

USERS:
보안 승인자, 개인정보 승인자, 운영자, 외부 시스템 책임자, 감사 담당자, 제품 책임자

CONTEXT:
로컬 실행 준비 조건은 통과했지만 관리형 신원, 단기 권한, 백업·복구, 변경 창, Kill Switch 해제 권한, 감사 보관 경로가 외부 구성되지 않았다.

SCOPE:
append-only 인계 패킷, 외부 조건 6종, 조건별 증거 유형 2종, 책임 역할, 제출 경로 정책, 개인정보·보안 이중 검토 계약, 권한별 조회

OUT OF SCOPE:
실명·연락처·Secret 저장, 외부 증거 업로드·검증, 제출 경로 실제 연결, Kill Switch 해제, 실행 승인, 개인정보 변경, COMPLETED 전이

CONSTRAINTS:
PostgreSQL, SECURITY_APPROVER 생성 권한, 외부 값 추정 금지, UPDATE·DELETE 거부, requirement 상태 고정, execution_authorized=false

TOOLS:
Node.js, PostgreSQL 16, Docker Compose, 단위·통합·권한·역조건 테스트, 정적 감사, Git

WORKFLOW:
Phase 30 차단 확인 → 증거·책임 매트릭스 → 계약·스키마 → 인계 패킷 API → 권한·불변성 → migration rollback/reapply → 전체 회귀 → 보고

SUCCESS CRITERIA:
인계 테이블 2/2, 조건 6/6, 증거 유형 12/12, 책임 역할 6/6, 이중 검토 역할 2/2, 단위 89/89, PostgreSQL 통합 22/22, 불변 트리거 2/2, execution_authorized=false

FAILURE CRITERIA:
외부 담당자나 증거 추정, 운영자 패킷 생성, 학생 내부 조회, 증거 쓰기 API 제공, 제출 완료 상태 생성, Kill Switch 해제, UPDATE·DELETE 허용, 실행기 활성화

OUTPUTS:
0017 migration·rollback, 도메인·Repository·API, 계약 JSON, 단위·통합 테스트, QA 증거, Phase 보고서

VERIFICATION:
단위 → Phase 정적 감사 → API 통합 → DB 불변 역조건 → migration rollback/reapply → 전체 제품화 검사 → health check

MEMORY UPDATE:
패킷 리비전·책임 역할·필수 증거 유형·누락 제출 경로·테스트 결과를 기록하고 개인정보·Secret·허위 제출 기록은 남기지 않는다.

STOP CONDITION:
인계 패킷이 AUTO_VERIFIED_LOCAL_HANDOFF_PACKET_BLOCKED_EXTERNAL 상태이고 모든 요구사항이 EXTERNAL_SUBMISSION_REQUIRED이면 종료한다. 실제 제출과 실행은 계속 금지한다.
```
