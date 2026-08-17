# 수학착착 Phase 9 — 운영·유지보수 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 학습자·보호자, 제품 운영자, 개발자, 장애 대응 담당자
- 달라져야 하는 것: 검증된 제품이 안전하게 배포·관측·복구되고 반복 개선될 수 있어야 한다.

## 2. Specification Engineering

완료 상태는 배포·rollback, health·로그·메트릭·알림, DB 백업·복구, 인증 경계, 장애 대응, 의존성·보안 업데이트 주기가 문서와 자동검사로 고정된 상태다.

성공 기준:

- 운영 SLI·SLO와 alert 기준 정의
- 배포·rollback runbook 검증
- 백업·복구 rehearsal PASS
- 인증 게이트웨이와 secret-manager 경계 검증
- 로그 PII·답안 유출 0
- 의존성·취약점 감사 PASS
- 유지보수 책임·주기·인계 상태 명시

실패·차단 기준:

- 운영 권한·외부 대상이 필요한 변경을 추정 실행: `BLOCKED_EXTERNAL`
- 운영 데이터 또는 비밀값 노출: `FAIL`
- rollback·복구 미검증: `FAIL`

## 3. Context Engineering

- 웹 스테이징: `infra/deployment/Dockerfile.staging`
- API·DB 스테이징: `infra/deployment/compose.api-staging.yaml`
- Phase 8 증적: `docs/productization/evidence/PHASE_8_INTEGRATION_QA.json`
- 운영 기준: `docs/developer/productization/SECURITY_OPERATIONS_BASELINE_v1.0.md`

## 4. Harness Engineering

- Docker health·restart·rollback
- API·DB smoke와 통합테스트
- 로그 민감정보 검사
- npm audit와 의존성 잠금
- Git diff/status/log
- 외부 서비스 변경은 명시적 대상·권한이 있을 때만 수행

## 5. Prompt Engineering

1. 현재 런타임과 운영 기준선을 인벤토리화한다.
2. SLI·SLO·로그·메트릭·알림 계약을 작성한다.
3. 배포·rollback과 DB 백업·복구 절차를 작성하고 격리 환경에서 연습한다.
4. 인증·비밀값·권한 경계를 외부 승격 체크리스트로 만든다.
5. 의존성·취약점·데이터 보존 감사를 자동화한다.
6. 장애 시나리오를 반복 검증하고 보고서를 남긴다.

## 6. Workflow Engineering

`운영 기준선 → 관측성 → 배포·rollback → 백업·복구 → 보안 경계 → 장애 연습 → 유지보수 주기 → 운영 인계`

## 7. Memory Engineering

남길 것은 서비스·담당 역할, SLO, alert 조건, 배포·복구 절차, rehearsal 결과, 의존성 상태, 미해결 외부 입력이다. 비밀번호·토큰·복구 코드·개인정보 원문은 남기지 않는다.

## 8. Loop Engineering

장애·배포·복구 시나리오를 격리 환경에서 반복한다. 자동검사와 수동 운영 검토가 모두 통과하면 Phase 9를 종료한다. 외부 권한이 없으면 로컬 증적까지 완료하고 외부 단계만 명시적으로 차단한다.
