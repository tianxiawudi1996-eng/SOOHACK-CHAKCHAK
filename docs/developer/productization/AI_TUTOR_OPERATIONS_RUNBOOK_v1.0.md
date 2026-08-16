# AI 튜터 운영 통제·롤백 런북 v1.0

## 1. 운영 목표

AI 튜터는 학습 보조 계층이며 수학 채점과 진도 상태의 권한을 갖지 않는다. 외부 모델을 사용할 수 없는 경우에도 서버 채점과 승인된 착착이·공식이 규칙형 피드백으로 학습을 계속한다.

## 2. 제어 흐름

```text
튜터 요청
→ 기능 플래그·kill switch
→ 모델·프롬프트 버전 핀
→ 요청·토큰 예산
→ 회로 상태
→ OpenAI Responses provider
→ 스키마·교육 안전 검사
→ 생성형 응답 또는 RULE_FALLBACK
→ 개인정보 없는 운영 메트릭
```

어느 단계에서든 실패하면 외부 오류를 학생에게 노출하지 않고 `RULE_FALLBACK`으로 전환한다. 외부 모델은 채점 결과, 정답 원문, 학생 ID, 세션 토큰을 받지 않는다.

## 3. 승인 버전

| 항목 | 승인 값 | 변경 조건 |
|---|---|---|
| 모델 | `gpt-5.6-sol` | Phase 48 평가 재실행, 사람 교정, 제품 책임자 승인 |
| 프롬프트 | `mathchakchak-tutor-duo-v1.0.0` | 골든·적대 평가 PASS |
| 데이터셋 | `tutor-golden-cases.v1.0.0` | SHA-256 갱신과 검토 이력 |

현재 모델 값은 2026-08-10 공식 최신 모델 resolver로 확인했지만, 불변 provider snapshot은 확인되지 않았다. 실제 운영 승격 전에는 사용 가능한 snapshot과 프로젝트 권한을 별도로 검증한다.

## 4. 환경변수

| 변수 | 기본값 | 목적 |
|---|---:|---|
| `TUTOR_AI_ENABLED` | `false` | 생성형 경로 사용 허가 |
| `TUTOR_AI_KILL_SWITCH` | `false` | true이면 생성형 경로 즉시 차단 |
| `TUTOR_AI_MODEL` | `gpt-5.6-sol` | 승인 모델 핀; 다른 값은 실행 전 차단 |
| `TUTOR_AI_PROMPT_VERSION` | 승인 v1.0.0 | 승인 프롬프트 핀 |
| `TUTOR_AI_TIMEOUT_MS` | `1500` | provider 최대 대기시간 |
| `TUTOR_AI_DAILY_REQUEST_LIMIT` | `1000` | 프로세스별 UTC 일일 요청 한도 |
| `TUTOR_AI_DAILY_INPUT_TOKEN_LIMIT` | `1000000` | 프로세스별 입력 토큰 한도 |
| `TUTOR_AI_DAILY_OUTPUT_TOKEN_LIMIT` | `250000` | 프로세스별 출력 토큰 한도 |
| `TUTOR_AI_CIRCUIT_FAILURE_THRESHOLD` | `3` | 회로 개방 실패 수 |
| `TUTOR_AI_CIRCUIT_WINDOW_MS` | `60000` | 실패 집계 창 |
| `TUTOR_AI_CIRCUIT_COOLDOWN_MS` | `30000` | HALF_OPEN 전환 대기시간 |

API 키는 저장소에 기록하지 않고 외부 secret manager에서 주입해야 한다. local·staging·production은 서로 다른 OpenAI 프로젝트와 키·rate/spend limit를 사용해야 한다.

## 5. 예산과 재시도 정책

로컬 제어는 요청 수와 입출력 토큰을 비용 대리 지표로 제한한다. 실제 금액 hard limit는 OpenAI 프로젝트에서 별도로 설정해야 한다. 다중 인스턴스에서는 현재 프로세스 메모리 카운터만으로 전체 사용량을 보장할 수 없으므로 중앙 durable counter가 필요하다.

학생 상호작용의 1,500ms 지연 한도를 지키기 위해 애플리케이션 자동 재시도는 0회다. 429·5xx·네트워크 실패는 즉시 fallback으로 전환하고 회로 실패로 기록한다. 재시도 폭주는 실패 요청도 rate limit에 포함되는 위험을 키우므로 금지한다.

## 6. 회로 차단기

- `CLOSED`: 외부 요청 허용
- `OPEN`: 60초 안에 실패 3회 발생 시 30초간 외부 요청 차단
- `HALF_OPEN`: cooldown 후 한 요청만 probe로 허용
- probe 성공: `CLOSED`
- probe 실패: 다시 `OPEN`

기능 OFF, kill switch, 버전 불일치, 예산 초과와 회로 OPEN은 모두 provider 호출 전 차단한다.

## 7. 관측과 경보

`/metrics`에서 다음을 수집한다.

- provider 시도 수
- 생성형·fallback 턴 수와 fallback 원인
- 안전 검사 거부 수
- 입출력 토큰
- 평균 provider 지연
- 회로 상태

권장 경보 초안:

- P0: 안전 거부 후 원문이 학생에게 노출되거나 fallback도 실패
- P1: 회로 OPEN 지속 5분, fallback 비율 20% 초과, 예산 강제 차단
- P2: provider 평균 지연 1,200ms 초과, 버전 불일치 배포 시도

실제 경보 임계치는 스테이징 부하 시험과 승인된 운영 트래픽 기준선으로 보정한다. 메트릭 label에는 사용자·학생·세션·응답 식별자를 넣지 않는다.

## 8. 승격 절차

1. Phase 48 골든·적대 평가와 사람 교정을 완료한다.
2. 미성년자 데이터 흐름, 보존 정책, Zero Data Retention 적용 여부를 승인받는다.
3. 별도 staging OpenAI 프로젝트, secret manager, rate/spend limit를 구성한다.
4. 승인 snapshot·프롬프트·데이터셋 핀을 확인한다.
5. 기능 OFF 상태로 배포하고 `/readyz`, `/metrics`, 규칙형 fallback을 확인한다.
6. 제한된 staging 트래픽에서 기능을 켜고 지연·토큰·fallback·안전 거부를 확인한다.
7. 운영 승인을 받은 뒤에만 production에서 활성화한다.

## 9. 즉시 롤백

가장 빠른 롤백은 `TUTOR_AI_KILL_SWITCH=true` 또는 `TUTOR_AI_ENABLED=false` 설정 후 안전한 재시작이다. DB 마이그레이션 롤백은 필요하지 않으며 기존 규칙형 튜터가 학습을 계속한다.

롤백 후 확인:

1. 신규 provider 시도 증가가 멈춘다.
2. 튜터 API가 `RULE_FALLBACK`을 반환한다.
3. 채점·학습 진도·다국어 화면이 정상이다.
4. 회로·fallback 원인·오류 로그를 보존한다.
5. 승인 없이 재활성화하지 않는다.

## 10. 현재 차단 조건

- 외부 provider live test 미수행
- API 키·secret manager·별도 OpenAI 프로젝트 미구성
- 플랫폼 rate/spend limit 미설정
- 불변 모델 snapshot 미확인
- 사람 교육·언어 교정 0/1
- 미성년자 데이터 통제 검토 미완료
- 중앙 durable 예산 카운터와 알림 경로 미구성
