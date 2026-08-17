# 수학착착 Stage 8 — Gate 2 음영 2D 1인 승인·승격 실행 메타프롬프트 v1.0

## 0. 실행 선언

이 프롬프트는 음영 2D 포즈 시트 2개의 시각 검토를 제품 책임자 1인의 명시적 결정으로 고정하고 Gate 2 승격 가능성을 감사한다. AI는 승인 결정을 추정하지 않으며, 기존 Gate 1의 승인자 권한 참조만 재사용한다.

## 1. Goal Framing

- 사용자: 제품 책임자 `John KIM`, Stage 8 실행 담당자, 캐릭터·UI 구현 담당자
- 달라져야 하는 것: 두 캐릭터의 새 2D 시트가 원본 정체성과 제품 품질을 충족하는지 한 번의 명시적 결정으로 확정되고, 유효 승인일 때만 Gate 3가 열린다.

## 2. Specification Engineering

완료 상태:

1. 승인 정책이 `PROJECT_OWNER_SINGLE_APPROVAL`, 필요 승인 수가 1이다.
2. 승인자 권한은 기존 Gate 1 승인 기록의 `John KIM`과 일치한다.
3. 착착이·공식이 시트 SHA-256이 정책·결정·매니페스트·실제 파일에서 모두 일치한다.
4. 자동 QA가 `PASS`다.
5. 8개 수동 체크가 모두 `true`다.
6. `decision = APPROVE`, 시간대 포함 `reviewed_at`, `scope_acknowledged = true`다.
7. 승격 적용 전에는 Gate 2 `NOT_VERIFIED`, Gate 3 `entry_allowed = false`다.
8. 승격 적용 후에는 Gate 2 `VERIFIED`, Gate 3 `entry_allowed = true`다.

실패 기준은 해시 변조, 다른 승인자, 체크 누락, `REJECT`, 미해결 패치, 선행 Gate 불일치다. 결정 누락은 `BLOCKED_EXTERNAL`이다.

## 3. Context Engineering

- 정책: `docs/stage8/evidence/2d-pet/v1.0/2D_PET_SINGLE_APPROVER_POLICY_v1.0.json`
- 결정: `docs/stage8/evidence/2d-pet/v1.0/2D_PET_MANUAL_REVIEW_v1.0.json`
- 후보: `docs/stage8/evidence/2d-pet/v1.0/2D_PET_ASSET_MANIFEST_v1.0.json`
- 자동 QA: `docs/stage8/evidence/2d-pet/v1.0/2D_PET_AUTOMATED_QA_v1.0.json`
- 승인자 권한 기준: `docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_DECISION_v1.0.json`
- 상태: `harness/status.json`

## 4. Harness Engineering

- `scripts/harness/audit_2d_pet_single_approval.py`는 읽은 결정만 감사하며 승인을 생성하지 않는다.
- 해시·시간대·승인자·체크·승격 플래그를 모두 검증한다.
- 승인 입력 전에는 종료 코드 1과 `BLOCKED_EXTERNAL`이 정상이다.
- 민감정보·연락처·복구 코드는 읽거나 저장하지 않는다.

## 5. Prompt Engineering

지금 할 작업:

1. 정책·후보·승인자 권한 해시를 고정한다.
2. 현재 공란 결정 레코드를 감사한다.
3. 사용자에게 비교 페이지의 두 시트를 검토하도록 안내한다.
4. 사용자가 `APPROVE`를 명시한 경우에만 승인자·시각·8개 체크를 기록한다.
5. 사전 승격 감사가 `READY_FOR_PROMOTION`인지 확인한다.
6. Gate 2와 Gate 3 진입 플래그를 원자적으로 갱신한다.
7. 사후 감사와 전체 하네스를 실행한다.

## 6. Workflow Engineering

```text
정책 고정 → 후보 해시 재검증 → 사용자 결정 → 승인 레코드 → 사전 승격 감사 → 상태 승격 → 사후 감사 → Gate 3 인계
```

## 7. Memory Engineering

남길 것은 승인자 권한 참조, 결정, 검토 시각, 후보 해시, 8개 체크, 감사 결과와 Gate 상태다. 없앨 것은 추정 승인, 빈 체크, 승인 전 승격, 개인 연락처다.

## 8. Loop Engineering

`결정 검증 → 해시 검증 → 체크 검증 → 상태 일치 검증`을 반복한다. 유효 승인 1/1과 자동 QA PASS가 확인되면 승격 단계로 이동한다. 승인 누락이면 종료 코드 1로 대기하고, 오류나 거부이면 종료 코드 2로 중단한다.

## 실행 명령

```powershell
python scripts/harness/audit_2d_pet_assets.py
python scripts/harness/audit_2d_pet_single_approval.py
python scripts/harness/validate_harness.py
git diff --check
```
