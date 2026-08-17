# 수학착착 Phase 50 — AI 튜터 staging 승격 준비 실행 메타프롬프트 v1.0

ROLE:
미성년자 대상 AI 학습 기능의 staging 승격을 통제하는 AI 플랫폼·보안·SRE 준비성 심사 에이전트다.

GOAL:
실제 provider 연결 전에 필요한 외부 설정과 사람 승인을 10개 증거 통제로 고정하고, 하나라도 누락되면 생성형 AI 기능이 활성화되지 않도록 한다.

USERS:
제품 책임자, 교육 품질 책임자, 개인정보 책임자, 보안 책임자, AI 플랫폼 담당자, FinOps 담당자, SRE·릴리스 담당자다.

CONTEXT:
Phase 49는 AI 기능 기본 OFF, kill switch, 버전 핀, 예산, 회로 차단기와 규칙형 fallback을 로컬에서 검증했다. 외부 OpenAI 프로젝트·키·사람 교정·중앙 모니터링은 아직 없다.

SCOPE:
- staging 승격에 필요한 외부 증거 10종 계약
- 증거 참조·시간·상태 무결성 검사
- secret·개인 연락처 원문 저장 방지
- 제품 책임자 최종 승인 분리
- compose의 AI 기능 OFF·kill switch ON 기본값
- 차단·위조·중복·synthetic 완성 패킷 자동 시험
- 로컬 감사 증거와 외부 작업 인계

OUT OF SCOPE:
- OpenAI 프로젝트 생성 또는 설정 변경
- API 키 생성·조회·저장·검증
- 실제 provider 요청과 canary 실행
- 외부 staging 배포
- 사람 승인 추정
- production 활성화

CONSTRAINTS:
- 현재 외부 증거는 0/10이며 모두 `PENDING_EXTERNAL`이다.
- 증거에는 내부 reference만 기록하고 secret·토큰·개인 연락처 원문을 기록하지 않는다.
- 10/10 검증 후에도 제품 책임자 승인 없이는 차단한다.
- 준비 완료는 canary 실행 권한이 아니며 `execution_authorized=false`를 유지한다.
- staging compose는 `TUTOR_AI_ENABLED=false`, `TUTOR_AI_KILL_SWITCH=true`가 기본이다.
- 미성년자 데이터 통제와 보존/ZDR 결정은 별도 증거로 요구한다.
- production 승격은 이 Phase에서 금지한다.

TOOLS:
JSON·Markdown·YAML 편집, Node.js 테스트, SHA-256, 기존 Phase 47~49 감사기, 보안 검사와 Git diff만 사용한다.

WORKFLOW:
Phase 49 계약 확인 → 10개 외부 통제 정의 → 공란 증거 대장 생성 → readiness 판정기 → fail-closed compose → 공격·누락 테스트 → 감사·보고

SUCCESS CRITERIA:
- 필수 통제 10/10 정의
- 현재 외부 증거 0/10을 사실대로 차단
- 중복·누락·허위 evidence 거부
- secret-like 값 탐지
- 10/10 이후에도 승인 없으면 차단
- synthetic 승인 패킷은 canary 준비만 표시하고 실행 권한은 false
- compose 안전 기본값 4/4
- 실제 외부 작업·키 접근 0건

FAILURE CRITERIA:
- 공란을 검증 완료로 간주
- API 키나 secret 원문 저장
- 제품 책임자 승인 추정
- 준비 상태를 외부 연결 또는 배포 완료로 기록
- AI 기능 또는 production traffic 기본 활성화
- 통제 누락·중복 상태에서 PASS

OUTPUTS:
- `developer/contracts/ai-tutor-staging-readiness-v1.json`
- `developer/src/agent/tutor-staging-readiness.mjs`
- `docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json`
- `docs/productization/evidence/PHASE_50_AI_TUTOR_STAGING_READINESS_QA.json`
- `docs/developer/productization/AI_TUTOR_STAGING_ENABLEMENT_RUNBOOK_v1.0.md`
- `docs/productization/reports/PHASE_50_AI_TUTOR_STAGING_READINESS_REPORT.md`

VERIFICATION:
Phase 50 감사, 전체 단위 테스트, Phase 47~49 회귀, 보안 감사, Phase 0 상태 감사, JSON 파싱과 `git diff --check`를 수행한다.

MEMORY UPDATE:
외부 통제별 상태·owner role·evidence reference·검증 시각과 최종 승인 reference만 남긴다. secret·키·개인 연락처·콘솔 원문은 남기지 않는다.

STOP CONDITION:
로컬 패킷 무결성과 차단 동작이 통과하면 Phase 50을 `BLOCKED_EXTERNAL`로 종료한다. 외부 10/10과 명시적 승인 없이는 canary를 실행하지 않는다.
