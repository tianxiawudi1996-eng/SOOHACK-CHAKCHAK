# AI 튜터 controlled staging canary 인계 런북 v1.0

## 1. 현재 상태

```text
Phase 50 controls verified: 0/10
Canary execution window: PENDING_EXTERNAL
Planned synthetic requests: 8
Provider live tested: false
API key accessed: false
Dispatch performed: false
Execution authorized: false
```

Phase 51은 실제 호출기가 아니라 승인된 담당자에게 넘길 사전 실행 패킷이다. OpenAI 공식 지침에 따라 staging·production 프로젝트를 분리하고 프로젝트별 rate·spend limit과 secret manager를 사용한다. 미성년자에게 제공되는 기능이므로 적용 법령, 연령 적합성, 필터·모니터링·신고 경로, 필요한 경우 ZDR 결정을 먼저 완료해야 한다.

## 2. 선행 입력

1. `PHASE_50_STAGING_ENABLEMENT_REGISTER.json`의 통제 10개가 모두 `VERIFIED`
2. 같은 대장의 제품 책임자 승인 reference
3. 변경된 Phase 50 register의 새 SHA-256
4. 승인된 staging canary 시간창 reference와 시작·종료 시각

API 키 값, secret 원문, 개인 연락처, 학생 데이터는 입력하지 않는다.

## 3. 고정 canary 상한

| 항목 | 값 |
|---|---:|
| 환경 | STAGING |
| traffic | synthetic only |
| 로케일 | 8 |
| 최대 요청 | 8 |
| 최대 입력 토큰 | 16,000 |
| 최대 출력 토큰 | 2,000 |
| 최대 시간 | 15분 |
| 동시성 | 1 |
| 요청별 재시도 | 0 |

## 4. 실행 순서

1. AI 기능 OFF·kill switch ON 확인
2. `/readyz`, `/metrics`, 규칙형 fallback 확인
3. model snapshot·prompt·eval dataset pin 확인
4. 중앙 rate·spend·alert route 확인
5. 승인 시간창 안에서만 canary 시작
6. `ko`, `zh-CN`, `ja`, `en`, `es`, `fr`, `it`, `ru` 순으로 synthetic 요청 1건씩 실행
7. 각 요청 직후 schema, answer leak, PII, 역할 분리, 로케일, token, latency 검사
8. 첫 안전·schema·version·budget 실패 시 즉시 중단
9. 완료 여부와 관계없이 kill switch ON
10. 규칙형 fallback 확인 후 집계 증거를 사람에게 검토 요청

## 5. 저장 가능한 결과

`attempt_reference`, locale, scenario reference, 시각, outcome, provider request reference, model·prompt version, input/output token 수, latency, 각 gate boolean, fallback reason만 저장한다.

입력 문장, 모델 출력 문장, 예상 정답, 학생 ID·이름·이메일, API 키와 Authorization header는 저장하지 않는다.

## 6. 중단 기준

- 승인 시간창 밖 실행
- 요청 8건·토큰·15분 한도 도달
- model·prompt version 불일치
- HTTP 오류 또는 예상하지 못한 429
- schema·answer leak·PII·역할·로케일 gate 실패
- 중앙 metrics·alert route 미작동
- kill switch 또는 fallback 확인 실패

Phase 51은 위 절차를 준비만 하며 실제 실행은 하지 않는다.
