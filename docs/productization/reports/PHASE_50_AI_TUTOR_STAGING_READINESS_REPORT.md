# Phase 50 AI 튜터 staging 승격 준비 보고서

## 1. 결과

AI 튜터 외부 provider를 staging에서 활성화하기 전에 필요한 10개 외부 통제와 제품 책임자 승인을 fail-closed 계약으로 구현했다. 로컬 자동 QA는 통과했지만 실제 외부 증거가 0/10이므로 상태는 `AUTO_VERIFIED_LOCAL_AI_STAGING_PACKET_BLOCKED_EXTERNAL`이다. AI 기능 OFF·kill switch ON·provider 미호출 상태를 유지한다.

## 2. Goal Framing

- 사용자: 제품 책임자, 교육 품질·개인정보·보안·AI 플랫폼·FinOps·SRE·릴리스 담당자
- 문제: 로컬 AI 안전장치가 있어도 외부 프로젝트 분리, secret 관리, 비용·속도 제한, 미성년자 데이터 통제와 사람 교정 없이는 안전한 staging canary를 증명할 수 없다.
- 변화: 외부 활성화 전 필요한 증거와 승인 경계가 10개 통제로 고정되고, 하나라도 누락되면 실행이 자동 차단된다.
- 성공 지표: 통제 정의 10/10, 로컬 시나리오 6/6, 안전 기본값 4/4, secret 원문 0건, 외부 실행 0건
- 제외 범위: API 키 생성·조회·주입, OpenAI 프로젝트 변경, 실제 provider 요청, 외부 배포, production 승격

## 3. 산출물

- 실행 계약·판정기: `developer/contracts/ai-tutor-staging-readiness-v1.json`, `developer/src/agent/tutor-staging-readiness.mjs`
- 증거: `docs/productization/evidence/PHASE_50_STAGING_ENABLEMENT_REGISTER.json`, `docs/productization/evidence/PHASE_50_AI_TUTOR_STAGING_READINESS_QA.json`
- 운영 문서: `docs/agent/productization/PHASE_50_AI_TUTOR_STAGING_READINESS_EXECUTION_METAPROMPT_v1.0.md`, `docs/developer/productization/AI_TUTOR_STAGING_ENABLEMENT_RUNBOOK_v1.0.md`
- 실행·감사: `scripts/productization/run_ai_tutor_staging_readiness_phase50.mjs`, `scripts/productization/validate_ai_tutor_staging_readiness_phase50.mjs`
- 단위 테스트: `tests/unit/agent/tutor-staging-readiness.test.mjs`
- 배포 기본값: `infra/deployment/compose.api-staging.yaml`

## 4. 검증 결과

| 검사 | 결과 |
|---|---|
| Phase 50 준비도 시나리오 | PASS, 6/6 |
| 외부 통제 계약 | 정의 10/10, 검증 0/10 |
| 전체 단위 테스트 | PASS, 168/168 |
| Phase 47 AI 튜터 kernel | PASS |
| Phase 48 품질·안전 평가 | PASS, golden 32/32·adversarial 9/9 |
| Phase 49 운영 통제 | PASS, drill 7/7 |
| Phase 7 로컬 staging | PASS, 산출물 35/35·로케일 8/8 |
| 보안 검사 | PASS, known vulnerabilities 0 |
| Phase 0 상태 검사 | PASS |
| `git diff --check` | PASS, 오류 0 |

## 5. 실패와 수정

최초 staging 회귀에서 현재 매니페스트와 기존 4180 웹 컨테이너의 `math-learning/app.js` 해시가 달라 실패했다. 원인은 현재 Compose 관리 밖에서 실행 중이던 이전 이미지가 신규 산출물을 제공하지 못한 것이었다.

기존 컨테이너를 삭제하지 않고 `mathchakchak-staging-v010-pre-phase50`으로 보존한 뒤 현재 산출물로 빌드한 이미지 `sha256:9620bb138894b53d2ab019fc161bff81d6bef80255cc5fd023a32e5e94f4e8db`를 `mathchakchak-staging-v010`으로 기동했다. 수정 후 웹·API health 200, 컨테이너 healthy, HTTP 산출물 해시 35/35와 로케일 8/8을 확인했다. API와 PostgreSQL은 교체하지 않았다.

## 6. 현재 차단 조건

- 외부 통제 검증: 0/10
- 제품 책임자 승인: `NOT_REQUESTED`
- provider live test: false
- API 키 접근: false
- OpenAI 프로젝트 설정: false
- 외부 staging 배포: false
- canary 준비: false
- 실행 권한: false

## 7. 다음 Phase 진입 여부

Phase 50 로컬 작업은 완료됐다. Phase 51의 실제 controlled staging canary는 외부 통제 10/10과 명시적 제품 책임자 승인 reference가 제공되기 전까지 시작하지 않는다. 다음 허용 작업은 실행 없는 Phase 51 canary 절차·증거 템플릿 준비 또는 외부 증거의 한 항목씩 입력·검증이다.
