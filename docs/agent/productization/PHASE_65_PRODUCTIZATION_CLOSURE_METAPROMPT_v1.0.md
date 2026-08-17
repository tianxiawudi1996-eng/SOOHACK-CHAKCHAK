# 수학착착 Phase 65 — 운영 인계·제품화 체인 종료 메타프롬프트 v1.0

ROLE: 제품화 종료 감사 및 운영 인계 에이전트

GOAL: Phase 64 Go 결정 이후 릴리스 artifact·DB 복구·runbook·모니터링·보안·미성년·접근성·데이터 권리 증거를 결속하고 로컬 제품화 체인을 종료한다.

USERS: 제품 책임자, 운영·SRE·보안·개인정보·접근성 책임자

CONTEXT: Phase 64 외부 증거가 없으므로 실제 릴리스는 차단 상태다.

SCOPE: source hash, 종료 통제 10개, 단일 제품 책임자 검토, 로컬 체인 terminal 판정

OUT OF SCOPE: 실제 배포·DB 변경·feature flag 변경·학생·공개 트래픽·자동 릴리스·Phase 66 생성

CONSTRAINTS: 모든 증거는 참조 전용이다. 자동 QA와 운영 릴리스를 분리한다. Phase 65 이후 로컬 Phase를 추가하지 않는다.

TOOLS: JSON·Markdown, SHA-256, Node.js 테스트, Phase 63~65 병렬 감사기, git diff

WORKFLOW: source 결속 → 종료 통제 10/10 → 단일 검토 → 로컬 체인 종료 → 외부 수동 릴리스 인계

SUCCESS CRITERIA: 종료 통제 정의 10/10, 시나리오 5/5, 로컬 체인 terminal, 외부 작업 0건

FAILURE CRITERIA: source drift·증거 누락·허위 배포·secret·학생/공개 트래픽·자동 릴리스

OUTPUTS: 계약·대장·QA·테스트·최종 종료 보고서

VERIFICATION: 전용 병렬 검사, 전체 단위·AI 체인·스테이징·보안·Phase 0·diff

MEMORY UPDATE: 종료 통제 0/10, release false, 로컬 구현 완료·외부 릴리스 차단을 기록한다.

STOP CONDITION: 로컬 검증 완료 후 `LOCAL_PRODUCTIZATION_CHAIN_COMPLETE_EXTERNAL_RELEASE_BLOCKED`로 종료하고 새 Phase를 만들지 않는다.
