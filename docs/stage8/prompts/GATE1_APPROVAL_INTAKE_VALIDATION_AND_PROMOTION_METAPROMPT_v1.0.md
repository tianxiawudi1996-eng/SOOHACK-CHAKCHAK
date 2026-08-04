# 수학착착 Stage 8 — Gate 1 승인 입력 검증·승격 준비 실행 메타프롬프트 v1.0

> 상태: `SUPERSEDED_NON_GATING`. 기존 Excel·JSON 10건 승인 흐름은 감사 이력이며 현재 Gate 판정에는 사용하지 않는다.

## 0. 실행 선언

이 프롬프트는 실제 책임자가 제출한 Gate 1 결정을 Excel과 JSON에서 교차검증하고, Gate 1 승격 준비 여부를 판정한다. AI는 승인자를 대신하거나 reviewer·decision·reviewed_at·comment를 생성하지 않는다.

현재 기준 상태:

```text
Gate 0: VERIFIED
Gate 1 automated QA: PASS
Gate 1 review package: FROZEN_PENDING_REVIEW
Manual approvals: 0/10
Gate 1: BLOCKED
Gate 2: NOT_STARTED
```

이번 실행은 승인 10/10이 없으므로 `BLOCKED_EXTERNAL`에서 안전하게 종료하는 것이 정상이다.

## 1. Goal Framing

### 사용자

- 실제 검토자 5명 또는 역할별 책임자
- Gate 1 Coordinator
- Gate 승격을 감사하는 QA 담당자

### 달라져야 하는 것

- 제출된 결정과 승인 대상 해시의 진위를 구조적으로 확인한다.
- Excel과 JSON의 차이를 탐지한다.
- 누락 승인, 거절, 미해결 패치, 해시 드리프트를 분리해 보고한다.
- 조건을 모두 만족할 때만 `READY_FOR_PROMOTION`을 판정한다.

## 2. Specification Engineering

### 완료 상태

다음 조건을 모두 만족해야 한다.

1. 두 캐릭터 × 5개 역할의 행이 정확히 10개다.
2. Excel과 `candidate-review.json.manual_approvals`가 필드별로 일치한다.
3. reviewer, decision, reviewed_at, evidence_hash, comment가 실제 입력으로 존재한다.
4. reviewed_at은 시간대가 포함된 ISO-8601이다.
5. evidence_hash는 해당 캐릭터의 동결 후보 SHA-256과 같다.
6. decision은 `APPROVE`, `APPROVE_WITH_PATCH`, `REJECT` 중 하나다.
7. `APPROVE_WITH_PATCH`는 patch_id가 있고 unresolved_patch가 false다.
8. reject 0, unresolved patch 0, 불변 증거 드리프트 0이다.
9. 자동 QA가 `PASS`다.

### 성공 기준

```text
valid synchronized approvals = 10/10
rejects = 0
unresolved patches = 0
immutable hash drift = 0
automated QA = PASS
result = READY_FOR_PROMOTION
```

`READY_FOR_PROMOTION`은 승격 준비 판정일 뿐, 이 단계에서 Gate 상태를 자동 변경하지 않는다.

### 실패·차단 기준

- 실제 승인 미제출: `BLOCKED_EXTERNAL`
- Excel·JSON 불일치: `FAIL`
- 필수필드 누락 또는 잘못된 시각: `FAIL`
- 승인 해시 불일치 또는 불변 증거 변경: `FAIL`
- `REJECT`: `FAIL`
- 미해결 조건부 패치: `BLOCKED_EXTERNAL`

## 3. Context Engineering

### 동결 후보

```text
Chakchaki v3
916636d0cb1603ad0eed785cf9e827b693687fe437c1eb24014724a0f1b57480

Gongsickyi v4
9c8061afab5bc381edc02780c0ee9265489d977f3cecfc1e8e52ab6467b01157
```

### 입력

- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx`
- `docs/stage8/evidence/gate1/candidate-review.json`
- `docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json`
- `docs/stage8/evidence/gate1/manual-review/FROZEN_EVIDENCE_MANIFEST_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/packets/`

### 출력

- `docs/stage8/evidence/gate1/manual-review/approval-workbook-current.json`
- `docs/stage8/evidence/gate1/manual-review/GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json`
- `docs/stage8/audits/GATE1_APPROVAL_INTAKE_AUDIT.md`

## 4. Harness Engineering

### 허용 도구

- 승인 대장 읽기 전용 검사 도구
- SHA-256 계산기
- `scripts/harness/audit_gate1_approval_intake.py`
- `scripts/harness/audit_gate1.py`
- `scripts/harness/audit_stage8.py`
- `scripts/harness/validate_harness.py`
- Git diff/status/log

### 통제

1. Excel 검사기는 원본 workbook을 저장하거나 수정하지 않는다.
2. 실제 제출이 없는 필드는 공란으로 유지한다.
3. AI 또는 봇 이름을 reviewer로 기록하지 않는다.
4. Excel과 JSON 중 하나만 채워진 결정은 승인으로 집계하지 않는다.
5. 승인 판단의 문구·의견을 요약해 의미를 바꾸지 않는다.
6. 후보 또는 불변 증거 해시가 바뀌면 승격을 중단한다.
7. 승인 10/10 전에는 `harness/status.json`의 Gate 1·Gate 2 상태를 변경하지 않는다.
8. 민감정보 파일은 읽거나 커밋하지 않는다.

## 5. Prompt Engineering

### 실행 작업

1. workbook을 읽기 전용으로 검사해 현재 10행을 JSON snapshot으로 만든다.
2. 동결 매니페스트의 39개 불변 입력 해시를 재검증한다.
3. workbook 결정과 `candidate-review.json.manual_approvals`를 역할·캐릭터 키로 대조한다.
4. 필수필드, 결정 enum, 시간대, 후보 해시, 패치 상태를 검사한다.
5. `READY_FOR_PROMOTION`, `BLOCKED_EXTERNAL`, `FAIL` 중 하나를 판정한다.
6. 판정 근거와 누락 역할을 JSON·Markdown으로 남긴다.

### 성공 체크리스트

- [ ] Workbook 10행과 역할 매트릭스가 완전하다.
- [ ] Excel·JSON 결정 10개가 일치한다.
- [ ] 실제 reviewer와 근거가 있다.
- [ ] 후보 해시가 일치한다.
- [ ] reject와 unresolved patch가 없다.
- [ ] 불변 증거 드리프트가 없다.
- [ ] 자동 QA가 PASS다.

### 실패 체크리스트

- [ ] 누락 역할을 캐릭터·역할 단위로 보고한다.
- [ ] 동기화 불일치 필드를 보고한다.
- [ ] 해시 드리프트 파일을 보고한다.
- [ ] 거절·패치 상태를 별도 보고한다.
- [ ] 실패 시 Gate 2를 계속 차단한다.

## 6. Workflow Engineering

```text
1. Read-only workbook snapshot
2. Role matrix validation
3. Immutable evidence hash validation
4. Excel ↔ JSON synchronization check
5. Accountable field validation
6. Decision / patch / reject branch
7. Intake audit output
8. Gate 1 automated audit
9. Stage 8 + Harness validation
10. Stop without promotion unless 10/10 is proven
```

판정 분기:

```text
0/10 or incomplete external submissions → BLOCKED_EXTERNAL
sync/hash/schema/reject failure          → FAIL
10/10 valid and all controls pass        → READY_FOR_PROMOTION
```

## 7. Memory Engineering

### 남길 것

- workbook snapshot 생성 시각과 해시
- Excel·JSON 승인 수
- 유효 승인 수와 누락 캐릭터·역할
- reject·unresolved patch 수
- 불변 증거 해시 드리프트 목록
- 최종 판정과 다음 허용 작업

### 없앨 것

- 추정 reviewer
- AI가 생성한 결정·시각·의견
- 동기화되지 않은 임시 승인 집계
- 승격 조건을 충족하지 않은 `VERIFIED` 표기

### 다음 대화 인계문

```text
Gate 1 approval intake audit: [STATUS]
Workbook decisions: [N]/10
JSON approvals: [N]/10
Valid synchronized approvals: [N]/10
Missing: [LIST]
Rejects: [N]
Unresolved patches: [N]
Immutable hash drift: [N]
Gate 1: [STATUS]
Gate 2: [STATUS]
Next authorized action: [ACTION]
```

## 8. Loop Engineering

### 반복 단위

한 캐릭터 × 한 역할의 Excel 행과 JSON 객체를 하나의 단위로 검증한다.

### 반복 검증

1. 실제 입력 존재 확인
2. Excel·JSON 필드 일치 확인
3. 시간대·해시·의견 검증
4. 패치·거절 분기
5. 유효 승인 집계
6. 전체 Gate 조건 재평가

### 종료 조건

- 성공: `READY_FOR_PROMOTION` 10/10
- 외부 차단: 실제 승인 대기 또는 미해결 패치
- 실패: 동기화 오류, 해시 드리프트, 거절, 구조 오류

## 9. 실행 명령

```powershell
# 1. 스프레드시트 도구로 approval-workbook-current.json을 읽기 전용 생성
python scripts/harness/audit_gate1_approval_intake.py
python scripts/harness/audit_gate1.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

현재 승인 0/10에서는 두 approval audit가 종료 코드 1을 반환하는 것이 정상이다. 이 경우 Gate 1은 `BLOCKED`, Gate 2는 `NOT_STARTED`로 유지한다.

## 10. 지금 실행할 지시

1. 승인 대장을 읽기 전용으로 재검사한다.
2. 현재 Excel·JSON 승인 입력을 교차검증한다.
3. 누락된 10개 캐릭터·역할 조합을 보고한다.
4. 해시와 자동 QA를 재검증한다.
5. 승인 입력을 생성하지 않은 채 결과를 기록한다.
6. 10/10이 아니면 승격하지 않고 `BLOCKED_EXTERNAL`로 종료한다.
