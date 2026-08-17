# 수학착착 Stage 8 — Gate 1 프로젝트 책임자 1인 승인 실행 메타프롬프트 v1.0

## 0. 실행 선언

이 프롬프트는 기존 `5역할 × 2캐릭터 = 10건` 승인 정책을 중단하고, 권한 있는 프로젝트 책임자 한 명이 두 캐릭터와 Gate 1 전체 증거 패키지를 한 번에 승인하도록 절차를 단순화한다. 기존 10건 승인 자료는 감사 이력으로만 보존하며 Gate 판정에 사용하지 않는다.

## 1. Goal Framing

### 사용자

- 수학착착 프로젝트 책임자
- Gate 1 상태를 검증하는 QA 담당자

### 달라져야 하는 것

- 캐릭터 제작 내부 통제를 제품 규모에 맞게 단순화한다.
- 한 명의 권한 있는 책임자가 두 캐릭터 패키지 전체를 한 번 검토한다.
- 자동 QA와 후보 해시를 유지하면서 불필요한 10건 입력을 제거한다.

## 2. Specification Engineering

### 완료 상태

1. 승인 정책이 `PROJECT_OWNER_SINGLE_APPROVAL`이다.
2. approval_required는 1이다.
3. 실제 approver_name이 있다.
4. decision은 `APPROVE`, `APPROVE_WITH_PATCH`, `REJECT` 중 하나다.
5. reviewed_at은 시간대 포함 ISO-8601이다.
6. scope_acknowledged가 true다.
7. Chakchaki와 Gongsickyi 후보 해시가 정책·실제 파일과 일치한다.
8. 자동 QA가 PASS다.
9. 미해결 패치와 해시 드리프트가 없다.

### 성공 기준

```text
single approval = 1/1
automated QA = PASS
rejects = 0
unresolved patches = 0
hash drift = 0
status = READY_FOR_PROMOTION
```

### 실패·차단 기준

- 승인자 또는 결정 누락: `BLOCKED_EXTERNAL`
- 해시·시각·범위 확인 오류: `FAIL`
- `REJECT`: `FAIL`
- 미해결 `APPROVE_WITH_PATCH`: `BLOCKED_EXTERNAL`

## 3. Context Engineering

### 승인 범위

- Chakchaki v3 전체 보드와 16개 방향 파일
- Gongsickyi v4 전체 보드와 16개 방향 파일
- 오버레이·차이 주석·자동 QA·Canonical View Register
- 동결 후보 해시 2개와 불변 증거 패키지

### 입력

- `docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_POLICY_v1.0.json`
- `docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_DECISION_v1.0.json`
- `docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json`
- `docs/stage8/evidence/gate1/manual-review/FROZEN_EVIDENCE_MANIFEST_v1.0.json`

### 출력

- `docs/stage8/evidence/gate1/single-approval/GATE1_SINGLE_APPROVER_AUDIT_v1.0.json`
- `docs/stage8/audits/GATE1_SINGLE_APPROVER_AUDIT.md`

## 4. Harness Engineering

### 허용 도구

- JSON·Markdown 편집기
- SHA-256 계산기
- `scripts/harness/audit_gate1_single_approval.py`
- `scripts/harness/audit_gate1.py`
- `scripts/harness/audit_stage8.py`
- `scripts/harness/validate_harness.py`

### 통제

1. 승인자 이름·결정·시각은 실제 사용자 입력만 사용한다.
2. 한 결정은 두 캐릭터와 전체 Gate 1 패키지에 적용된다.
3. 기존 10건 대장과 검토 패킷은 `SUPERSEDED_NON_GATING` 이력이다.
4. 후보 해시가 하나라도 바뀌면 단일 승인을 무효화한다.
5. 승인 감사만으로 Gate 상태를 자동 승격하지 않는다.
6. `READY_FOR_PROMOTION` 후 별도 승격 트랜잭션을 실행한다.
7. Gate 1 `VERIFIED` 전에는 Gate 2를 시작하지 않는다.

## 5. Prompt Engineering

### 지금 할 작업

1. 단일 승인 정책과 결정 스키마를 검증한다.
2. 실제 프로젝트 책임자 정보를 한 번만 입력받는다.
3. 두 후보 해시·자동 QA·동결 증거를 재검증한다.
4. 단일 결정을 `READY_FOR_PROMOTION`, `BLOCKED_EXTERNAL`, `FAIL`로 판정한다.
5. 기존 10건 승인 흐름을 비활성 Gate 이력으로 유지한다.

### 단일 승인 입력

```text
Approver name:
Decision:
Reviewed at:
Scope acknowledged: true
Comment: optional
```

## 6. Workflow Engineering

```text
1. Activate single-approver policy
2. Validate candidate hashes and automated QA
3. Receive one accountable project-owner decision
4. Validate timestamp, scope, decision and patch state
5. READY_FOR_PROMOTION or BLOCKED_EXTERNAL/FAIL
6. Controlled Gate 1 promotion transaction
7. Gate 2 entry only after Gate 1 VERIFIED
```

## 7. Memory Engineering

### 남길 것

- 활성 승인 정책과 이전 정책의 superseded 상태
- 책임자 이름
- 단일 결정·시각·승인 범위
- 두 후보 해시와 감사 결과

### 없앨 것

- 새 정책에서 불필요한 역할별 10건 승인 입력
- AI가 생성한 승인자·결정·시각
- `READY_FOR_PROMOTION` 이전 Gate 승격

## 8. Loop Engineering

### 반복 단위

프로젝트 책임자 한 명의 전체 패키지 결정 한 건이다.

### 종료 조건

- 성공: 유효 단일 승인 1/1
- 외부 차단: 책임자 입력 대기 또는 미해결 패치
- 실패: 거절, 해시 드리프트, 자동 QA 실패

## 9. 실행 명령

```powershell
python scripts/harness/audit_gate1_single_approval.py
python scripts/harness/audit_gate1.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

## 10. 지금 실행할 지시

1. 기존 10건 승인 정책을 비활성 이력으로 전환한다.
2. 단일 승인 정책·결정 파일·감사기를 생성한다.
3. 실제 책임자 결정이 없으면 0/1 `BLOCKED_EXTERNAL`로 종료한다.
4. 승인자 정보를 추정하지 않는다.
5. Gate 1과 Gate 2 상태는 승격 트랜잭션 전까지 유지한다.
