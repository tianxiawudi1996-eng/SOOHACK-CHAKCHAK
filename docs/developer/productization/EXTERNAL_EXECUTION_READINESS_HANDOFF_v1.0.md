# 수학착착 외부 실행 준비·증거 인계서 v1.0

## 1. 결과 상태

```text
EXTERNAL_EXECUTION_PREPARED_WAITING_FOR_AUTHORIZED_INPUT
Execution authorized: false
Dispatch performed: false
Evidence submission enabled: false
Verification enabled: false
Production release authorized: false
```

이 문서는 외부 실행을 시작하기 위한 준비 패킷이다. 실제 외부 담당자에게 발송한 요청서가 아니며, 외부 증거·승인·계약·운영 권한을 포함하지 않는다.

## 2. 외부 실행 순서

```text
정책·권한 승인
  ↓
역할 소유자·검토자 확인
  ↓
제출 경로 reference 확인
  ↓
증거 참조·SHA-256·만료 시각 수령
  ↓
독립 검토·이해상충 확인
  ↓
반려·철회·만료 검사
  ↓
제품 책임자 수동 검토
  ↓
운영 배포 승인
```

앞 단계의 reference가 없으면 다음 단계로 이동하지 않는다.

## 3. Workstream 요약

| ID | 외부 작업 | 현재 | 최소 시작 입력 |
|---|---|---|---|
| D80-02 | 합법 콘텐츠 30,000개 | NOT_REQUESTED | 사용권 범위·검수 책임 역할 |
| D80-03 | OCR 실제 벤치마크 | NOT_REQUESTED | 승인된 제공자·벤치마크 범위 |
| D80-04 | 48개 학습 계획 검토 | NOT_REQUESTED | 독립 전문가 검토 프로토콜 |
| D80-05 | 교사·학부모 운영·보호자 동의 | NOT_REQUESTED | 관리형 인증·기관 명부·보호자 연결 정책 |
| D80-06 | 100명·8~12주 학습효과 파일럿 | NOT_REQUESTED | 동의·코호트·분석 계획 승인 |
| D80-07 | 독립 수학 전문가 이중 검토 | NOT_REQUESTED | 검토자 독립성·대상 목록 |
| D80-08 | 실제 AI 모델 8개 언어 검증 | NOT_REQUESTED | 모델·프롬프트·데이터셋 pin과 실행창 |
| D80-09 | 대치동 2~3개 학원 파일럿 | NOT_REQUESTED | 기관 계약·동의·프로토콜 |
| D80-10 | 상용 운영·복구 검증 | NOT_REQUESTED | 법률 정책·복구훈련창·변경창 |

## 4. 제출 데이터 계약

허용되는 값은 내부 참조 ID, SHA-256, 상태, 제출·검증·만료 시각, 반려 코드다. 원문 파일은 외부 승인 저장소에서 관리하고 이 저장소에는 기록하지 않는다.

```text
workstream_id:
owner_role_code:
review_role_code:
internal_reference:
evidence_sha256:
submitted_at:
verified_at:
expires_at:
status: NOT_REQUESTED | SUBMITTED | VERIFIED | REJECTED | EXPIRED | REVOKED
rejection_code:
```

금지: 실명·개인 연락처·토큰·Secret·결제정보·백업 payload·학생/학원 식별정보·법률 원문·AI 원문 응답.

## 5. 담당자에게 전달할 비개인적 요청문 초안

> 수학착착 외부 실행 준비 대장의 `{{WORKSTREAM_ID}}` 작업에 대해 역할 소유자와 독립 검토자 여부를 확인해 주십시오. 제출은 승인된 외부 경로의 내부 참조 ID와 SHA-256만 사용하며, 원문·개인정보·Secret·토큰은 전달하지 않습니다. 현재 시스템은 제출·검증·배포를 자동 수행하지 않습니다. 선행 조건과 이해상충이 해소된 경우에만 `SUBMITTED` 상태로 접수하며, 독립 검토 완료 전에는 `VERIFIED`로 변경하지 않습니다.

## 6. 반려·중단 기준

- 담당 역할 또는 검토 역할이 확인되지 않음
- 제출 경로가 승인되지 않음
- SHA-256이 없거나 기존 참조와 불일치
- 만료·철회된 증거
- 이해상충 미신고 또는 동일 검토자 중복
- 개인정보·Secret·원문 payload가 포함됨
- 선행 정책·동의·복구·변경 창이 승인되지 않음

이 경우 해당 Workstream만 `REJECTED` 또는 `BLOCKED_EXTERNAL`로 유지하고 자동 재시도하지 않는다.

## 7. 현재 외부 입력 대기

첫 입력은 실명이나 연락처가 아니라 다음 세 가지 역할 기반 값이다.

1. `owner_role_confirmation`
2. `review_role_confirmation`
3. `approved_submission_route_reference`

이 세 값이 제공되기 전에는 실제 요청 발송이나 증거 접수를 수행하지 않는다.
