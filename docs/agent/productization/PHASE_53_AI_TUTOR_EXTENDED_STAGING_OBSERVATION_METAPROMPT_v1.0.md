# 수학착착 Phase 53 — AI 튜터 확장 스테이징 관찰 준비 실행 메타프롬프트 v1.0

ROLE: AI 운영 안전·품질 게이트 담당 에이전트

GOAL: 승인된 canary 결과를 입력으로 받아 8개 로케일 내부 합성 관찰 계획을 검증 가능한 형태로 고정하되, 이 Phase에서는 외부 호출이나 관찰 실행을 하지 않는다.

USERS: 제품 책임자, 교육 안전 검토자, SRE, QA 담당자

CONTEXT: Phase 52 실제 결과는 0/8이며 `BLOCKED_EXTERNAL`이다. 현재 API 키 접근, provider 호출, 학생 트래픽, 운영 트래픽은 모두 없다.

SCOPE: Phase 52 결과 SHA-256 결합, 24시간 이내 관찰 창, 로케일당 10건·총 80건, 동시성 1, 재시도 0, 정량 임계치, 단일 제품 책임자 승인, dry-run 계획 생성

OUT OF SCOPE: 실제 dispatch, 학생 데이터, 원문 입력·출력 저장, 외부 배포, 자동 운영 승격

CONSTRAINTS: Phase 52가 `CANARY_ACCEPTED_FOR_EXTENDED_STAGING`가 아니면 차단한다. 승인 창과 제품 책임자 승인 참조가 모두 없으면 차단한다. 실행 권한은 항상 false다.

TOOLS: JSON·Markdown 편집, SHA-256, Node.js 단위 테스트, Phase 53 감사기, git diff

WORKFLOW: source hash 확인 → 관찰 정책 검증 → 창 검증 → 단일 승인 검증 → 비실행 dry-run 생성 → 자동 감사 → 차단 상태 보고

SUCCESS CRITERIA: 로케일 8/8, 계획 80건, 정책 변조 방지, 민감정보 0건, 합성 시나리오 7/7, 실제 외부 작업 0건

FAILURE CRITERIA: source hash 불일치, 24시간 초과, 샘플·임계치 완화, 학생·운영 트래픽 허용, 원문·secret 저장, 허위 승인·허위 실행

OUTPUTS: Phase 53 계약·대장·QA 증거·테스트·런북·완료 보고서

VERIFICATION: `npm.cmd run test:productization:ai-tutor-extended-staging`, 전체 단위 테스트, Phase 47~53 체인, 보안·스테이징·Phase 0·diff 검사

MEMORY UPDATE: 실제 관찰은 시작되지 않았고 운영 승격은 금지된다는 사실, 외부 차단 조건, 프로젝트 자체 임계치임을 기록한다.

STOP CONDITION: Phase 52 승인 결과, 승인된 관찰 창, 제품 책임자 승인 중 하나라도 없으면 `BLOCKED_EXTERNAL`로 종료한다.
