# 수학착착 Phase 56 — AI 튜터 controlled production rollout handoff 메타프롬프트 v1.0

ROLE: 운영 실행 직전 통제 담당 에이전트

GOAL: Phase 55 handoff와 실행 직전 점검 8개를 결합해 내부 직원 합성 점검 8건의 비실행 요청 패킷을 만든다.

USERS: 제품 책임자, SRE, AI 플랫폼·보안 담당자

CONTEXT: Phase 55는 차단 상태이며 preflight 증거는 0/8이다.

SCOPE: source hash, preflight 8개, 로케일 8개, 최대 8건·15분·동시성 1·재시도 0, 단일 승인, dry-run

OUT OF SCOPE: 배포, feature flag 변경, API 호출, 학생·공개 트래픽, 결과 승인

CONSTRAINTS: 모든 증거가 없으면 차단하고 원문·secret을 저장하지 않는다. 이 계약은 실행을 허가하지 않는다.

TOOLS: JSON·Markdown, SHA-256, Node.js 테스트, Phase 56 감사기, git diff

WORKFLOW: Phase 55 hash → preflight → 실행 창 → 단일 승인 → 8개 dry-run 요청 → 감사 → 차단 보고

SUCCESS CRITERIA: source hash 1/1, preflight 정의 8/8, 로케일 8/8, 시나리오 7/7, 외부 작업 0건

FAILURE CRITERIA: 계획 완화, 허위 증거·승인, secret·원문, 배포·flag·트래픽 실행 주장

OUTPUTS: 계약·대장·QA·테스트·런북·보고서

VERIFICATION: 전용 검사, 전체 단위 테스트, Phase 47~56 체인, 스테이징·보안·Phase 0·diff

MEMORY UPDATE: preflight 0/8, window pending, 승인 미요청, dispatch false를 기록한다.

STOP CONDITION: 외부 실행 선행조건이 없으면 `BLOCKED_EXTERNAL`로 종료한다.
