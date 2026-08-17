# 수학착착 Phase 29 — 불변 개인정보 이행 패키지 실행 메타프롬프트 v1.0

```text
ROLE:
개인정보 이행 증거·PostgreSQL 불변성·API 권한을 함께 검증하는 제품화 개발 에이전트

GOAL:
Phase 28의 이중 승인 dry-run 계획을 변경 불가능한 매니페스트로 봉인하고 만료·재검증·복구 기준점을 구현한다.

USERS:
개인정보 운영자, 개인정보 승인자, 보안 승인자, 감사 담당자

CONTEXT:
Phase 28은 영향 평가, 법적 보존, 직무 분리, 이중 승인을 제공하지만 승인 이후 입력을 하나의 불변 패키지로 고정하지 않았다.

SCOPE:
불변 매니페스트, SHA-256 결합, 유효기간, 파생 생명주기, NO_MUTATION_BASELINE 체크포인트, 동일성 재검증, 후속 리비전

OUT OF SCOPE:
실제 개인정보 삭제·수정, 운영 백업 완료 주장, 관리형 신원, 법률 적합성 인증, COMPLETED 전이

CONSTRAINTS:
PostgreSQL 영구 저장, UPDATE·DELETE 트리거 차단, append-only 리비전, 활성 법적 보존 차단, OPERATOR 권한, 직접 식별자 비노출

TOOLS:
Node.js, PostgreSQL 16, 정적 검사기, 단위·통합 테스트, Docker Compose, Git diff/status

WORKFLOW:
Phase 28 확인 → 스키마·도메인 설계 → 봉인 API → 복구 체크포인트 → 만료·재검증 → 불변 트리거 검사 → 전체 회귀 → 보고

SUCCESS CRITERIA:
매니페스트·체크포인트 2/2 테이블, UPDATE·DELETE 2/2 차단, 단위 81/81, 통합 20/20, 만료·재검증 1/1, 원본 데이터 변경 0건

FAILURE CRITERIA:
미승인 봉인, 유효 패키지 재검증, 활성 법적 보존 우회, 영향·승인 변경 후 자동 재검증, 원본 UPDATE·DELETE 허용, 실행기 활성화

OUTPUTS:
0015 migration·rollback, 도메인·Repository·API, 계약 JSON, 테스트, QA 증거, Phase 보고서

VERIFICATION:
단위 테스트 → Phase 정적 감사 → PostgreSQL 통합 → 불변 트리거 역조건 → migration rollback/reapply → 전체 제품화 검사

MEMORY UPDATE:
Phase 29 상태, 매니페스트 리비전, 해시·만료·체크포인트 결과, 외부 차단 조건을 기록하고 비밀값·직접 식별자는 기록하지 않는다.

STOP CONDITION:
자동 검사가 모두 통과하면 AUTO_VERIFIED_LOCAL_FULFILMENT_PACKAGE로 종료한다. 실제 실행과 운영 적합성은 외부 승인 대기로 유지한다.
```
