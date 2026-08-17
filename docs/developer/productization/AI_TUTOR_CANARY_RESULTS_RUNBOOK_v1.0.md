# AI 튜터 canary 결과 수집·판정 런북 v1.0

## 1. 현재 상태

```text
Phase 51 handoff: BLOCKED_EXTERNAL
Canary result records: 0/8
Provider live tested: false
Kill switch rearmed: NOT_STARTED
Rollback: NOT_STARTED
Human review: NOT_REQUESTED
Production promotion allowed: false
```

## 2. 결과 레코드

실제 canary 이후 로케일당 한 레코드만 입력한다. 저장 필드는 attempt·scenario·provider request reference, 시작·종료 시각, outcome, model·prompt version, token, latency와 gate boolean이다.

입력·출력 문장, 예상 정답, 학생 식별자, 이메일·전화번호, API 키, Authorization header는 저장하지 않는다.

## 3. 자동 판정

- 결과 없음: `AWAITING_RESULTS`
- 8건 미만 또는 kill switch 미확인: `RESULTS_INCOMPLETE`
- hard gate 실패와 rollback 완료: `CANARY_REJECTED_AUTOMATICALLY`
- 8/8 PASS와 kill switch 재가동: `READY_FOR_HUMAN_CANARY_REVIEW`
- 제품 책임자 승인: `CANARY_ACCEPTED_FOR_EXTENDED_STAGING`
- 제품 책임자 반려: `CANARY_REJECTED_BY_HUMAN_REVIEW`

어떤 판정도 production 승격을 허용하지 않는다.

## 4. Hard gate

1. strict schema
2. safety policy
3. answer leak 없음
4. PII 없음
5. 착착이·공식이 역할 분리
6. 요청 로케일 준수
7. model·prompt pin 일치
8. token·시간 상한 준수
9. kill switch 재가동

## 5. 실패와 rollback

첫 실패에서 canary를 중단하고 kill switch를 켠 뒤 규칙형 fallback을 확인한다. 실패 결과를 최종 기록하려면 rollback status `COMPLETED`, 내부 evidence reference와 완료 시각이 필요하다.

## 6. 사람 검토

자동 8/8 PASS 후 제품 책임자 한 명이 집계 결과와 원본이 아닌 내부 증거 reference를 검토한다. 승인해도 extended staging 관찰만 허용하며 production은 별도 Phase와 승인 대상으로 남긴다.
