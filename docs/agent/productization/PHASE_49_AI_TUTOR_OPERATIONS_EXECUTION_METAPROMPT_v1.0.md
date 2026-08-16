# 수학착착 Phase 49 — AI 튜터 운영 통제 실행 메타프롬프트 v1.0

ROLE:
AI 튜터의 교육 안전성과 서비스 연속성을 함께 책임지는 시니어 AI 플랫폼·SRE 에이전트다.

GOAL:
외부 생성 모델이 느리거나 실패하거나 승인 버전에서 벗어나도 학생의 수학 학습이 중단되지 않도록 기능 플래그, 버전 핀, 사용량 한도, 회로 차단기, 관측 지표와 즉시 롤백 경로를 구현한다.

USERS:
학생, 제품 책임자, AI 품질 담당자, API 운영자, 개인정보·보안 담당자다.

CONTEXT:
Phase 47은 개인정보 최소화 AI 튜터 커널과 규칙형 fallback을 구현했고, Phase 48은 8개 로케일 골든 평가와 적대적 안전 평가를 구현했다. 외부 모델과 사람 교정은 아직 승인되지 않았다.

SCOPE:
- 외부 AI 기능 기본 OFF 및 비상 kill switch
- 모델·프롬프트·평가 데이터셋 버전 고정
- 요청 수·입출력 토큰·응답시간 운영 한도
- CLOSED·OPEN·HALF_OPEN 회로 차단기
- fallback·안전 거부·토큰·회로 상태 메트릭
- 버전 불일치·장애·초과·복구·롤백 드릴
- 운영 런북·감사 증거·Phase 상태 기록

OUT OF SCOPE:
- 실제 OpenAI API 호출 또는 API 키 조회
- 외부 스테이징·운영 배포
- OpenAI 프로젝트의 실제 금액 한도 설정
- 사람 평가 승인 추정
- 프로덕션 알림 채널 생성

CONSTRAINTS:
- `TUTOR_AI_ENABLED` 기본값은 false다.
- 모델은 `gpt-5.6-sol`, 프롬프트는 `mathchakchak-tutor-duo-v1.0.0`, 평가 데이터셋은 `tutor-golden-cases.v1.0.0`으로 고정한다.
- 승인 핀과 런타임 값이 다르면 외부 요청 전에 차단한다.
- 요청시간은 1,500ms이며 애플리케이션 자동 재시도는 0회다.
- 60초 안에 제공자 실패 3회가 발생하면 30초 동안 회로를 연다.
- 회로 복구는 한 번의 HALF_OPEN probe 성공으로만 허용한다.
- 모든 차단은 학생에게 승인된 `RULE_FALLBACK`을 제공한다.
- 메트릭 label에 학생 ID·응답 원문·개인정보를 넣지 않는다.

TOOLS:
Node.js 테스트 러너, 정적 감사기, SHA-256, 기존 Phase 47·48 검증기, Git diff 검사만 사용한다.

WORKFLOW:
현재 경계 확인 → 운영 계약 고정 → 통제 계층 구현 → 커널·API 메트릭 연결 → 장애 드릴 → 회귀·보안 검사 → 증거·상태 갱신

SUCCESS CRITERIA:
- 기능 기본 OFF·kill switch 2/2
- 버전 핀 3/3
- 요청·입력 토큰·출력 토큰 한도 3/3
- 회로 상태와 복구 3/3
- 운영 드릴 7/7
- 승인된 fallback 유지
- 실제 외부 호출·키 접근·배포 0건
- 기존 AI 안전 평가와 전체 단위 테스트 회귀 없음

FAILURE CRITERIA:
- 기능 OFF 또는 kill switch에서 외부 provider 호출
- 승인되지 않은 모델·프롬프트 실행
- 예산 초과 후 요청 지속
- 연속 실패 후 회로가 열리지 않음
- 차단 시 학생 학습 흐름 중단
- 개인정보를 메트릭에 포함
- 실행하지 않은 외부 검증을 완료로 기록

OUTPUTS:
- `developer/contracts/ai-tutor-operations-v1.json`
- `developer/src/agent/tutor-operations.mjs`
- `tests/unit/agent/tutor-operations.test.mjs`
- `docs/developer/productization/AI_TUTOR_OPERATIONS_RUNBOOK_v1.0.md`
- `docs/productization/evidence/PHASE_49_AI_TUTOR_OPERATIONS_QA.json`
- `docs/productization/reports/PHASE_49_AI_TUTOR_OPERATIONS_REPORT.md`

VERIFICATION:
`npm.cmd run test:productization:ai-tutor-operations`, 전체 단위 테스트, Phase 47·48 감사, 보안 검사, Phase 0 상태 감사와 `git diff --check`를 실행한다.

MEMORY UPDATE:
승인 버전, 제어 한도, 회로 상태 정책, 드릴 결과, 외부 차단 조건과 다음 Phase를 STATUS 및 보고서에 남긴다. 키·토큰·개인 식별자·응답 원문은 남기지 않는다.

STOP CONDITION:
로컬 자동 통제가 모두 통과하면 Phase 49를 `외부 provider·사람 평가·플랫폼 한도·중앙 알림 차단` 상태로 종료한다. 외부 운영 승인을 추정하지 않는다.
