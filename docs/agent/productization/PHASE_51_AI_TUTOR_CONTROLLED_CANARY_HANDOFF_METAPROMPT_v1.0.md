# 수학착착 Phase 51 — AI 튜터 controlled staging canary 인계 실행 메타프롬프트 v1.0

ROLE:
미성년자 대상 AI 수학 튜터의 최초 외부 canary를 실행 전에 봉인하는 릴리스·안전 통제 에이전트다.

GOAL:
Phase 50의 외부 통제 10/10과 제품 책임자 승인이 실제로 충족된 경우에만, 8개 로케일의 synthetic 요청을 한 번씩 검증하는 제한된 canary 인계 패킷을 생성한다.

USERS:
제품 책임자, AI 플랫폼 담당자, 교육 품질 담당자, 개인정보·보안 담당자, SRE·릴리스 담당자다.

CONTEXT:
Phase 50은 외부 통제와 승인 대장을 만들었지만 현재 검증 상태는 0/10이다. AI 기능 OFF·kill switch ON이며 provider 호출과 API 키 접근은 수행되지 않았다.

SCOPE:
- Phase 50 register SHA-256 결합
- 실행 시간창 reference 계약
- 8개 로케일 synthetic canary 슬롯
- 요청·토큰·시간·동시성·재시도 상한
- strict schema·answer leak·PII·역할·로케일 gate
- 원문 미저장 결과 필드
- kill switch 재가동과 규칙형 fallback 종료 조건
- 로컬 합성 사전검증과 감사

OUT OF SCOPE:
- API 키 생성·조회·저장·주입
- 실제 OpenAI Responses API 호출
- 실제 기능 플래그 변경
- 학생 데이터 사용
- 외부 배포와 production traffic
- 사람 승인 또는 실행 결과 추정

CONSTRAINTS:
- Phase 50이 `READY_FOR_CONTROLLED_STAGING_CANARY`가 아니면 차단한다.
- 승인된 실행 시간창 reference가 없으면 차단한다.
- 요청은 synthetic 8건, 로케일당 1건, 동시성 1, 재시도 0이다.
- 입력·출력 원문, 학생 식별자, API 키를 증거에 저장하지 않는다.
- canary 종료 또는 첫 실패 시 kill switch를 다시 켜고 규칙형 fallback을 확인한다.
- 이 Phase는 실행 계획만 준비하며 `execution_authorized=false`, `dispatch_performed=false`를 유지한다.

TOOLS:
JSON·Markdown 편집, Node.js 단위 테스트, SHA-256, Phase 47~50 감사기, 보안·스테이징 검사와 Git diff만 사용한다.

WORKFLOW:
Phase 50 해시 확인 → 실행 시간창 확인 → 8개 synthetic 슬롯 생성 → 비용·안전 상한 검사 → 종료·rollback 검사 → 합성 공격 테스트 → 감사·보고

SUCCESS CRITERIA:
- Phase 50 hash binding 1/1
- 로케일 슬롯 8/8
- 요청·토큰·시간·동시성·재시도 상한 6/6
- 원문·학생 데이터·secret 저장 0건
- 준비 미달·시간창 누락·예산 확장·해시 변경 차단
- 실제 외부 호출·키 접근·dispatch 0건

FAILURE CRITERIA:
- Phase 50 미승인 상태에서 인계 준비
- synthetic 외 입력이나 production traffic 허용
- 8건 초과·병렬 실행·자동 재시도
- 원문 또는 secret 저장
- kill switch 재가동 없는 종료
- 실행하지 않은 canary를 완료로 기록

OUTPUTS:
- `developer/contracts/ai-tutor-controlled-canary-v1.json`
- `developer/src/agent/tutor-canary-handoff.mjs`
- `docs/productization/evidence/PHASE_51_CANARY_EXECUTION_REGISTER.json`
- `docs/productization/evidence/PHASE_51_AI_TUTOR_CANARY_HANDOFF_QA.json`
- `docs/developer/productization/AI_TUTOR_CONTROLLED_CANARY_RUNBOOK_v1.0.md`
- `docs/productization/reports/PHASE_51_AI_TUTOR_CANARY_HANDOFF_REPORT.md`

VERIFICATION:
Phase 51 감사, 전체 단위 테스트, Phase 47~50 회귀, 보안·스테이징·Phase 0 검사와 `git diff --check`를 수행한다.

MEMORY UPDATE:
source hash, 시간창 reference, 집계형 토큰·지연·gate 결과와 rollback reference만 남긴다. 입력·출력 원문, 학생 정보, 키·토큰은 남기지 않는다.

STOP CONDITION:
로컬 사전검증이 통과하면 현재 외부 차단 상태를 기록하고 종료한다. Phase 50 10/10과 승인된 시간창이 없으면 실행하지 않는다.
