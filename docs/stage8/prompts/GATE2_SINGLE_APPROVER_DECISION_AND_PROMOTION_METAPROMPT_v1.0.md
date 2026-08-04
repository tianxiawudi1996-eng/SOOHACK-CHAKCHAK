# 수학착착 Stage 8 — Gate 2 1인 승인·승격 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 프로젝트 책임자와 Stage 8 실행 담당자
- 변화: 명시적인 1인 시각 승인으로 Gate 2 베이스 메시·재질·LOD 후보를 확정하고 Gate 3 진입을 허용한다.

## 2. Specification Engineering

완료 상태는 다음 조건을 모두 충족한 상태다.

1. Gate 2 자동 QA가 `PASS`, 모델 검사가 `6/6 PASS`다.
2. 프로젝트 책임자 한 명의 실명, `APPROVE`, 시간대 포함 검토 시각이 있다.
3. 두 캐릭터와 실루엣·비율·색상/재질·관통·LOD 전환 범위를 모두 확인했다.
4. 후보 GLB와 비교 렌더의 SHA-256 드리프트가 없다.
5. Gate 2는 `VERIFIED`, Gate 3 `entry_allowed`는 `true`다.

승인 누락은 `BLOCKED_EXTERNAL`, 해시·자동검사 오류 또는 거절은 `FAIL`이다.

## 3. Context Engineering

- 승인 정책: `PROJECT_OWNER_SINGLE_APPROVAL`
- 승인자: 기존 단일 승인 정책의 프로젝트 책임자 `John KIM`
- 입력: `docs/stage8/evidence/gate2/GATE2_BUILD_MANIFEST_v1.0.json`
- 입력: `docs/stage8/evidence/gate2/GATE2_AUTOMATED_QA_v1.0.json`
- 입력: `docs/stage8/evidence/gate2/previews/`
- 출력: `docs/stage8/evidence/gate2/GATE2_MANUAL_REVIEW_v1.0.json`
- 상태: `harness/status.json`

## 4. Harness Engineering

- 허용 도구: JSON·Markdown 편집, `audit_gate2.py`, `audit_stage8.py`, `validate_harness.py`, Git diff/status
- 통제: 사용자 승인 없이 결정을 생성하지 않는다. 승인 후에도 자동 QA와 해시를 다시 검증한다.
- Gate 2 승격 전에는 Gate 3를 시작하지 않는다.

## 5. Prompt Engineering

1. 사용자 입력 `승인`을 `APPROVE`로 정규화한다.
2. 승인자, 승인 시각, 전체 범위 확인, 다섯 체크를 기록한다.
3. Gate 2 감사를 실행해 `READY_FOR_PROMOTION`을 확인한다.
4. Gate 2를 `VERIFIED`로 변경하고 Gate 3 진입만 허용한다.
5. 감사를 다시 실행해 `VERIFIED`와 승인 `1/1`을 확인한다.

## 6. Workflow Engineering

```text
명시적 승인 → 승인 레코드 → 사전 승격 감사 → 상태 승격 → 사후 감사 → 전체 하네스 검증
```

## 7. Memory Engineering

- 남길 것: 승인자, 결정, 시각, 검토 범위, 후보 해시, 감사 결과, Gate 상태
- 없앨 것: 추정 승인, 빈 체크, 승인 전 `VERIFIED` 기록
- 인계: `Gate 2 VERIFIED / approval 1/1 / Gate 3 entry_allowed true`

## 8. Loop Engineering

- 검증: Gate 2 감사, Stage 8 감사, 하네스 검증, Git whitespace 검사
- 종료: 모든 검사가 통과하고 Gate 3가 시작 가능한 상태일 때
- 실패 시: 승인 레코드·후보 해시·자동 QA·상태 플래그 불일치를 각각 확인한다.

## 실행 명령

```powershell
python scripts/harness/audit_gate2.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```
