# 수학착착 개인정보 이행 통제 설계 v1.0

## 목표

승인된 개인정보 권리 요청에 대해 실제 데이터 변경 전에 이행 계획과 영향 범위를 산정하고, 법적 보존 보류와 서로 다른 두 승인자의 결정을 검증한다. 이번 단계에서는 어떤 원본 데이터도 변경하지 않는다.

## 요구사항

| ID | 요구사항 | 인수 기준 |
|---|---|---|
| PRIV-28-01 | dry-run 계획 | 승인된 요청과 담당 운영자에게 하나의 `DRY_RUN_ONLY` 계획만 허용한다. |
| PRIV-28-02 | 영향 산정 | 학생 프로필·진단·학습·복습·공식 세션의 행 수와 보존할 개인정보 운영 기록을 집계한다. |
| PRIV-28-03 | 법적 보류 | 활성 보류가 있으면 모든 이행 승인을 409로 차단하고 해제 사유를 기록한다. |
| PRIV-28-04 | 이중 승인 | `PRIVACY_APPROVER`와 `SECURITY_APPROVER`가 서로 다른 계정으로 각각 승인해야 한다. |
| PRIV-28-05 | 권한 분리 | 운영자·개인정보 승인자·보안 승인자 역할을 DB에서 다시 검증한다. |
| PRIV-28-06 | 실행 차단 | 이중 승인 후에도 파괴적 실행기와 `COMPLETED` 전이는 비활성화한다. |

## 흐름

```text
APPROVED 권리 요청
→ 담당 운영자의 DRY_RUN 계획
→ PostgreSQL 영향 행 수 집계 + SHA-256
→ 활성 법적 보류 확인
→ 개인정보 승인자 결정
→ 보안 승인자 결정
→ DUAL_APPROVED
→ 실제 실행 [비활성]
```

## 영향 산정 경계

- 삭제 대상 후보: 학생 프로필, 진단 세션, 학습 세션, 복습 항목, 공식 학습 세션
- 보존 대상: 권리 요청, 상태 이력, 결정, 승인, 감사·법적 보존 기록
- 반환값은 행 수 집계와 평가 해시뿐이며 답안·문제·사용자 식별자 원문을 포함하지 않는다.
- 실제 삭제 순서, FK 연쇄 범위, 백업·복구, 통지 결과는 향후 승인된 실행기에서 다시 계산해야 한다.

## API

- `POST /privacy-operations/requests/{id}/fulfilment-plans`
- `POST /privacy-operations/fulfilment-plans/{id}/impact-assessment`
- `GET /privacy-operations/fulfilment-plans/{id}`
- `POST /privacy-operations/requests/{id}/legal-holds`
- `POST /privacy-operations/legal-holds/{id}/release`
- `POST /privacy-operations/fulfilment-plans/{id}/approvals`

로컬 승인자 세션은 `/local-demo/privacy-approver/{privacy|security}/session`에서만 발급하며 로컬 데모 비활성 환경에서는 404다.

## 제외 범위와 외부 차단

실제 삭제·정정·내보내기·동의 변경, 법적 보존 데이터 분리 저장소, 운영 신원, 이중 승인 조직 정책, 사용자 통지와 이의제기는 제외한다. 운영 전환은 `BLOCKED_EXTERNAL_IDENTITY_POLICY`다.
