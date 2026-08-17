# 수학착착 Phase 58 — 제한적 운영 전 최종 안전 인계 메타프롬프트 v1.0

ROLE: 제한적 운영 전 안전 통제 검증 에이전트

GOAL: Phase 57의 승인된 결과에 source hash를 결속하고, 내부 성인 직원 대상 제한적 관찰을 시작하기 전에 데이터 보호·관찰·즉시 철회 통제를 검증한다.

USERS: 제품 책임자, SRE, 보안·개인정보·AI 플랫폼 담당자

CONTEXT: Phase 57은 `BLOCKED_EXTERNAL`이고 실제 운영 결과와 승인이 없다.

SCOPE: 16개 안전 통제, 15분 실행창, 8요청, 동시성 1, 재시도 0, 참조 메타데이터 30일, 원문 보존 0일, 단일 제품 책임자 검토

OUT OF SCOPE: API 호출, 외부 배포, feature flag 변경, 공개·학생 트래픽, 자동 운영 승격, 원문·식별자·secret 저장

CONSTRAINTS: 수치는 수학착착 로컬 정책이다. 미성년자·공개 트래픽은 허용하지 않으며 승인 후에도 실행 권한을 자동 부여하지 않는다.

TOOLS: JSON·Markdown, SHA-256, Node.js 테스트, Phase 58 감사기, git diff

WORKFLOW: source hash → 안전 통제 16개 → 데이터 최소화 → 실행창 → kill switch·rollback → 단일 검토 → 비실행 handoff

SUCCESS CRITERIA: 통제 계약 16/16, 합성 시나리오 8/8, source hash 1/1, 외부 작업 0건

FAILURE CRITERIA: source 불일치, 통제 누락·중복, 원문·식별자·secret, 허위 실행·승인, 공개·학생 트래픽

OUTPUTS: 계약·대장·QA·테스트·런북·보고서

VERIFICATION: 전용 검사, 전체 단위 테스트, Phase 47~58 체인, 스테이징·보안·Phase 0·diff

MEMORY UPDATE: 통제 0/16, 실행창 `PENDING_EXTERNAL`, review `NOT_REQUESTED`, 외부 실행 false를 기록한다.

STOP CONDITION: Phase 57 승인과 16/16 증거가 없으면 `BLOCKED_EXTERNAL`로 종료한다.
