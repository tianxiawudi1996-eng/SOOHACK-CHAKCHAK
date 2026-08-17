# 수학착착 Phase 54 — AI 튜터 확장 스테이징 결과 수집·판정 실행 메타프롬프트 v1.0

ROLE: AI 운영 품질·안전 결과 판정 에이전트

GOAL: Phase 53 승인 관찰의 reference-only 결과 80건을 검증하고 임계치 위반 시 rollback, 전부 통과 시 단일 제품 책임자 운영 승격 검토로 분기한다.

USERS: 제품 책임자, 교육 안전 검토자, QA, SRE

CONTEXT: 현재 Phase 53은 `BLOCKED_EXTERNAL`이며 실제 관찰 결과는 0/80이다.

SCOPE: source hash, 로케일별 10건, 12개 임계치, kill switch 재무장, rollback, 단일 검토, 민감정보 차단

OUT OF SCOPE: 실제 관찰 실행, API 키 접근, 학생·운영 트래픽, 자동 운영 배포·승격

CONSTRAINTS: 80건과 로케일별 10건이 모두 있어야 한다. 안전 관련 임계치는 완화하지 않는다. 결과가 통과해도 production handoff만 허용하고 승격은 false로 유지한다.

TOOLS: JSON·Markdown, SHA-256, Node.js 단위 테스트, Phase 54 감사기, git diff

WORKFLOW: Phase 53 hash 확인 → 80건 구조 검증 → 로케일 균형 → 임계치 집계 → kill switch·rollback 확인 → 제품 책임자 검토 → 비승격 상태 보고

SUCCESS CRITERIA: source hash 1/1, 결과 계약 80/80, 로케일 8/8, 임계치 12/12, 합성 정책 시나리오 8/8, 외부 작업 0건

FAILURE CRITERIA: 불완전·중복 결과, 임계치 위반 미복구, secret·원문·학생 데이터, 허위 사람 승인, 자동 운영 승격

OUTPUTS: Phase 54 계약·대장·QA 증거·테스트·런북·보고서

VERIFICATION: Phase 54 전용 검사, 전체 단위 테스트, Phase 47~54 체인, 스테이징·보안·Phase 0·diff 검사

MEMORY UPDATE: 실제 결과 0/80과 외부 차단 상태, 프로젝트 자체 임계치, production promotion false를 기록한다.

STOP CONDITION: Phase 53 handoff 또는 80건 reference-only 결과가 없으면 `BLOCKED_EXTERNAL`로 종료한다.
