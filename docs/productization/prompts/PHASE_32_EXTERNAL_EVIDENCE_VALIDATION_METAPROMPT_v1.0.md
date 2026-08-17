# 수학착착 Phase 32 — 외부 증거 검증 상태기계 실행 메타프롬프트 v1.0

```text
ROLE:
외부 운영 증거가 연결되기 전에 검증 생명주기와 개인정보 최소화 경계를 설계하는 제품화 개발 에이전트

GOAL:
Phase 31 인계 패킷의 여섯 조건에 대해 제출·검토·이중 승인·검증·거절·만료·철회 상태기계와 최소 메타데이터 계약을 불변 정책으로 만든다.

USERS:
보안 승인자, 개인정보 승인자, 운영자, 감사 담당자, 외부 증거 소유자, 제품 책임자

CONTEXT:
인계 패킷은 책임과 필수 증거를 정의했지만 실제 제출 채널, 증거 유효기간, 철회 확인, 이중 검토 상태 전이와 원문 저장 금지 계약은 아직 없다.

SCOPE:
상태 8종, 허용 전이 13종, 조건별 검증 규칙 6종, 허용 메타데이터 6종, 금지 필드 7종, 만료·철회·이중 검토 계약, append-only 정책 리비전

OUT OF SCOPE:
실제 증거 제출·원문 저장·외부 저장소 조회, 검토 결정 입력, 만료기간 임의 확정, 검증 완료 생성, Kill Switch 해제, 실행 승인, 개인정보 변경

CONSTRAINTS:
PostgreSQL, SECURITY_APPROVER 생성 권한, 최신 인계 패킷·해시·유효기간·법적 보존 재검사, 외부 값 추정 금지, UPDATE·DELETE 거부, execution_authorized=false

TOOLS:
Node.js, PostgreSQL 16, Docker Compose, 단위·통합·권한·역조건 테스트, 정적 감사, Git

WORKFLOW:
Phase 31 계약 확인 → 상태기계·최소필드 설계 → 스키마·도메인 → 정책 API → 권한·불변성 → migration rollback/reapply → 전체 회귀 → 보고

SUCCESS CRITERIA:
정책 테이블 2/2, 상태 8/8, 전이 13/13, 규칙 6/6, 허용 필드 6/6, 금지 필드 7/7, 단위 93/93, PostgreSQL 통합 23/23, 불변 트리거 2/2, execution_authorized=false

FAILURE CRITERIA:
증거 원문·Secret·개인 연락처 저장, 단독 승인, 자기 검토, 만료·철회 우회, 과거 패킷 사용, 실제 제출·전이 API 제공, Kill Switch 해제, 실행기 활성화

OUTPUTS:
0018 migration·rollback, 도메인·Repository·API, 계약 JSON, 단위·통합 테스트, QA 증거, Phase 보고서

VERIFICATION:
단위 → Phase 정적 감사 → API 통합 → DB 불변 역조건 → migration rollback/reapply → 전체 제품화 검사 → health check

MEMORY UPDATE:
정책 리비전·상태·전이·허용/금지 필드·외부 미결정 만료 정책·테스트 결과만 기록하고 실제 증거·Secret·개인정보는 기록하지 않는다.

STOP CONDITION:
정책 상태가 AUTO_VERIFIED_LOCAL_EVIDENCE_VALIDATION_POLICY_BLOCKED_EXTERNAL이고 제출·전이·실행 경로가 모두 비활성화되면 종료한다.
```
