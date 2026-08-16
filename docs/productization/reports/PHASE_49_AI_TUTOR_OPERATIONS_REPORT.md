# Phase 49 AI 튜터 운영 통제 보고서

## 결과

외부 생성 모델의 버전 변경, 장애, 지연, 사용량 초과가 학생 학습 중단으로 이어지지 않도록 로컬 운영 통제 계층을 구현했다. 기능은 기본 OFF이며 모든 차단 경로는 승인된 `RULE_FALLBACK`으로 전환된다.

현재 상태는 `AUTO_VERIFIED_LOCAL_AI_OPERATIONS_EXTERNAL_ENABLEMENT_BLOCKED`다. 로컬 통제와 장애 드릴은 통과했지만 외부 provider, 운영 프로젝트, 사람 평가와 중앙 모니터링은 승인되지 않았다.

## 구현 범위

- 기능 기본 OFF와 비상 kill switch
- 모델·프롬프트·평가 데이터셋 3중 버전 핀
- 프로세스별 일일 요청·입력 토큰·출력 토큰 한도
- 3회 실패·60초 창·30초 cooldown 회로 차단기
- HALF_OPEN 단일 probe 복구
- fallback·안전 거부·토큰·회로 상태 Prometheus 메트릭
- DB 변경 없는 즉시 규칙형 fallback 롤백

## 사실과 차단 조건

- 실제 OpenAI API 호출: 0건
- API 키 접근: 0건
- 외부 배포: 0건
- 사람 교육·언어 교정: 0/1
- OpenAI 프로젝트 금액 hard limit: 외부 설정 필요
- 중앙 예산 카운터·알림 경로: 외부 인프라 필요
- 불변 provider model snapshot: 확인 필요

## 자동 검증

- Phase 49 운영 드릴: 7/7 PASS
- 기능 기본 OFF·kill switch: 2/2 PASS
- 모델·프롬프트·평가 데이터셋 핀: 3/3 PASS
- 요청·입력 토큰·출력 토큰 한도: 3/3 PASS
- CLOSED·OPEN·HALF_OPEN 회로 상태: 3/3 PASS
- `/metrics` AI 운영 지표 HTTP 검사: 1/1 PASS
- 전체 단위 테스트: 162/162 PASS
- Phase 47 커널 회귀: PASS
- Phase 48 골든 32/32·적대 9/9: PASS
- 보안 검사: PASS, 알려진 취약점 0건
- Phase 49 계약 SHA-256 감사: PASS

첫 구현 후 운영 메트릭이 클래스 내부에서만 검증되는 공백을 발견해 실제 `/metrics` HTTP 응답 테스트를 추가했다. 또한 일일 예산 카운터를 Prometheus 누적 counter로 사용하면 자정에 값이 감소하는 문제와, 미승인 프롬프트가 provider 생성 중 서버 시작을 중단시킬 가능성을 발견했다. 누적·일일 지표를 분리하고 provider 생성 전 승인 핀 사전검사를 추가한 뒤 전체 검사를 재실행했다. AI 튜터 지표는 정상 노출되고 secret marker는 포함되지 않았다.

## 운영 판단

실제 요금은 코드에 가격표를 고정하지 않고 요청·토큰 envelope와 외부 OpenAI 프로젝트 spend limit의 이중 통제로 설계했다. 현재 카운터는 단일 프로세스 범위이므로 다중 인스턴스 운영 승격 전 중앙 durable counter가 필요하다.

학생 대화는 낮은 지연이 중요하고 승인된 규칙형 대체가 있으므로 애플리케이션 재시도는 0회로 고정했다. provider 실패 시 즉시 fallback을 제공하고 연속 실패는 회로 차단기로 흡수한다.

## 다음 Phase

Phase 50에서는 staging 승격 준비 패킷을 만든다. 미성년자 데이터 경계, 별도 OpenAI 프로젝트·secret manager·rate/spend limit, 사람 교정, 중앙 모니터링과 승인 체크리스트를 실제 외부 수행과 명확히 분리한다.
