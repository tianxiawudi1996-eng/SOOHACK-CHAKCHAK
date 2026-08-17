# AI 튜터 staging 승격 준비·증거 입력 런북 v1.0

## 1. 현재 상태

```text
Local control plane: PASS
Required external controls: 10
Verified external controls: 0/10
Product-owner authorization: NOT_REQUESTED
Provider live test: false
API key accessed: false
Ready for controlled canary: false
Execution authorized: false
```

이 단계는 외부 시스템을 설정하는 작업이 아니라, 외부 담당자가 완료한 설정의 참조 증거를 수집하고 검증하는 준비 단계다.

## 2. 입력해야 하는 정보

다음 항목을 순서대로 한 개씩 입력한다. 모든 값은 실제 설정을 가리키는 내부 reference여야 하며 키·토큰·URL 비밀번호·개인 연락처 원문을 입력하지 않는다.

| 순서 | 통제 ID | 입력할 reference | 담당 역할 |
|---:|---|---|---|
| 1 | `STAGING_PROJECT_SEPARATION` | 서로 다른 staging·production OpenAI 프로젝트를 증명하는 문서 reference | AI 플랫폼 |
| 2 | `SECRET_MANAGER_BINDING` | staging API 키의 secret manager binding reference | 보안 |
| 3 | `RATE_LIMIT_CONFIGURATION` | staging 프로젝트 rate limit 정책 reference | AI 플랫폼 |
| 4 | `SPEND_LIMIT_CONFIGURATION` | staging 프로젝트 spend alert·hard limit 정책 reference | FinOps |
| 5 | `UNDER_18_DATA_CONTROL_REVIEW` | 미성년자 데이터 흐름·필터·모니터링 승인 reference | 개인정보 |
| 6 | `RETENTION_AND_ZDR_DECISION` | 보존 정책과 해당 시 Zero Data Retention 결정 reference | 개인정보 |
| 7 | `IMMUTABLE_MODEL_SNAPSHOT_PIN` | staging에서 허용할 불변 모델 snapshot reference | AI 품질 |
| 8 | `HUMAN_EVAL_CALIBRATION` | Phase 48 사람 교육·언어 교정 승인 reference | 교육 품질 |
| 9 | `CENTRAL_METRICS_AND_ALERT_ROUTE` | 중앙 예산 카운터·대시보드·알림 route reference | SRE |
| 10 | `ROLLBACK_REHEARSAL` | kill switch와 규칙형 fallback 롤백 드릴 reference | 릴리스 |

각 통제는 다음 형태로만 갱신한다.

```json
{
  "id": "CONTROL_ID",
  "owner_role": "ROLE",
  "status": "VERIFIED",
  "evidence_reference": "INTERNAL-REFERENCE",
  "verified_at": "2026-08-10T16:10:00+09:00"
}
```

## 3. 최종 승인

통제 10개가 검증된 후 제품 책임자가 canary 준비를 승인하면 다음 reference를 추가한다.

```json
{
  "status": "APPROVED",
  "approval_reference": "PRODUCT-OWNER-APPROVAL-REFERENCE",
  "approved_at": "2026-08-10T16:20:00+09:00",
  "approval_inferred": false
}
```

이 승인은 `READY_FOR_CONTROLLED_STAGING_CANARY`까지만 허용한다. 실제 실행·외부 메시지·키 주입·배포 권한을 자동으로 부여하지 않는다.

## 4. 차단 규칙

- 10개 중 하나라도 미검증·거부: `BLOCKED_EXTERNAL`
- 중복·누락 통제: `FAIL`
- secret-like 값 탐지: `FAIL_SECURITY`
- 10/10이나 승인 없음: `BLOCKED_EXTERNAL`
- 모든 통제와 승인 유효: `READY_FOR_CONTROLLED_STAGING_CANARY`
- 어떤 경우에도 이 대장만으로 `execution_authorized=true`가 되지 않는다.

## 5. 안전한 staging 기본값

배포 구성은 다음 기본값을 사용한다.

```text
TUTOR_AI_ENABLED=false
TUTOR_AI_KILL_SWITCH=true
TUTOR_AI_MODEL=gpt-5.6-sol
TUTOR_AI_PROMPT_VERSION=mathchakchak-tutor-duo-v1.0.0
```

기능 OFF 상태에서 `/readyz`, `/metrics`, 규칙형 튜터와 rollback을 먼저 확인한다. 외부 키는 저장소나 일반 `.env` 파일에 기록하지 않고 승인된 secret manager binding을 통해서만 주입한다.

## 6. 외부 활성화 이후 검증 순서

1. 별도 staging 프로젝트와 secret binding 확인
2. rate·spend limit 확인
3. 기능 OFF·kill switch ON으로 배포
4. Health·metrics·fallback 검사
5. 승인된 canary 시간대에 kill switch 해제
6. 제한된 synthetic 요청만 실행
7. schema·안전·지연·토큰·fallback·회로 상태 확인
8. 즉시 kill switch 재가동
9. 결과를 사람에게 검토 요청

실제 canary 실행 메타프롬프트는 Phase 51에서 별도로 작성한다.
