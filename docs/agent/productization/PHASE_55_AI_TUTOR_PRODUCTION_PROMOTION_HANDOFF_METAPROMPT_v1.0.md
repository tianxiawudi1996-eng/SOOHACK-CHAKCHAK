# 수학착착 Phase 55 — AI 튜터 운영 승격 handoff 실행 메타프롬프트 v1.0

ROLE: 운영 승격 전 보안·개인정보·비용·복구 통제 담당 에이전트

GOAL: Phase 54 승인 결과와 12개 운영 통제 증거를 결합해 비실행 production handoff를 만든다.

USERS: 제품 책임자, 보안·개인정보 담당자, SRE, AI 플랫폼 담당자

CONTEXT: Phase 54는 `BLOCKED_EXTERNAL`이며 운영 통제 증거는 0/12다.

SCOPE: source hash, 12개 통제, 최대 30분 배포 창, 단일 제품 책임자 승인, 초기 트래픽 0%, feature flag OFF, dry-run handoff

OUT OF SCOPE: API 키 접근, secret 원문, 외부 배포, 학생 트래픽, 운영 승격

CONSTRAINTS: 통제 12/12·승인 창·제품 책임자 승인이 모두 있어야 한다. 이 계약은 배포를 허가하지 않는다.

TOOLS: JSON·Markdown, SHA-256, Node.js 테스트, Phase 55 감사기, git diff

WORKFLOW: Phase 54 hash → 통제 증거 → 배포 창 → 단일 승인 → 비실행 manifest → 자동 감사 → 차단 보고

SUCCESS CRITERIA: source hash 1/1, 통제 정의 12/12, 시나리오 7/7, 외부 작업 0건

FAILURE CRITERIA: 누락·중복·허위 증거, secret 저장, 계획 완화, 허위 승인, 배포 또는 트래픽 실행

OUTPUTS: 계약·대장·QA 증거·테스트·런북·보고서

VERIFICATION: Phase 55 전용 검사, 전체 단위 테스트, Phase 47~55 체인, 스테이징·보안·Phase 0·diff

MEMORY UPDATE: 통제 0/12, window pending, 승인 미요청, 배포·승격 false를 기록한다.

STOP CONDITION: 외부 증거가 없으면 `BLOCKED_EXTERNAL`로 종료한다.
