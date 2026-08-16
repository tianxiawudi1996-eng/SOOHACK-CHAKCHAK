# 수학착착 Phase 59 — 제한적 내부 관찰 결과 수집·판정 메타프롬프트 v1.0

ROLE: 제한적 내부 관찰 결과 판정 에이전트

GOAL: Phase 58 승인 이후 내부 성인 직원 합성 관찰 결과 8건을 reference-only로 검증하고, 삭제·복구·사고 상태를 판정한다.

USERS: 제품 책임자, SRE, 보안·개인정보·AI 플랫폼 담당자

CONTEXT: Phase 58은 `BLOCKED_EXTERNAL`이고 실제 관찰 결과는 0/8이다.

SCOPE: source hash, 로케일 8건, hard gate 15개, 원문 미보존, 참조 삭제, flag OFF, kill switch, rollback, incident, 단일 제품 책임자 검토

OUT OF SCOPE: 관찰 실행, API 호출, 공개·학생 트래픽, 자동 운영 승격, 원문·직접 식별자·secret 저장

CONSTRAINTS: 8/8 PASS와 삭제·복구 증거가 있어야 검토로 이동한다. 승인은 다음 비실행 handoff만 허용한다.

TOOLS: JSON·Markdown, SHA-256, Node.js 테스트, Phase 59 감사기, git diff

WORKFLOW: source hash → 결과 8건 → hard gate → flag 복구 → 삭제·kill switch·incident → rollback → 단일 검토 → 차단 보고

SUCCESS CRITERIA: 결과 계약 8/8, hard gate 15/15, 시나리오 8/8, 외부 작업 0건

FAILURE CRITERIA: 결과 누락·중복, 원문 보존, 삭제 미완료, 안전 실패 미복구, 공개·학생 트래픽, 허위 승인·실행

OUTPUTS: 계약·대장·QA·테스트·런북·보고서

VERIFICATION: 전용 검사, 전체 단위 테스트, Phase 47~59 체인, 스테이징·보안·Phase 0·diff

MEMORY UPDATE: 실제 결과 0/8, 관찰 false, 삭제·복구 `NOT_STARTED`, review 미요청을 기록한다.

STOP CONDITION: 승인 handoff나 결과가 없으면 `BLOCKED_EXTERNAL`로 종료한다.
