# 수학착착 Stage 8 — Gate 1 수동 검토·승인 실행 메타프롬프트 v1.0

> 상태: `SUPERSEDED_NON_GATING`. 현재 Gate 판정은 `GATE1_SINGLE_APPROVER_DECISION_AND_PROMOTION_METAPROMPT_v1.0.md`의 프로젝트 책임자 1인 승인 정책을 따른다. 이 문서는 감사 이력으로만 보존한다.

## 0. 실행 선언

이 프롬프트의 목적은 AI가 승인을 대신하는 것이 아니라, 실제 책임자가 같은 증거와 같은 SHA-256을 검토하고 추적 가능한 결정을 기록하도록 통제하는 것이다.

현재 기준 상태는 다음과 같다.

```text
Gate 0: VERIFIED
Gate 1 automated QA: PASS
Gate 1 manual approvals: 0/10
Gate 1: BLOCKED_EXTERNAL
Gate 2: BLOCKED / NOT_STARTED
```

다음 중 하나라도 사실이면 Gate 1을 `VERIFIED`로 변경하지 않는다.

- 실명 책임자의 직접 검토가 아님
- 승인 대상 SHA-256이 자동 QA 대상과 다름
- 필수 역할 또는 캐릭터의 결정이 비어 있음
- `REJECT`가 하나라도 존재함
- `APPROVE_WITH_PATCH`의 패치가 미완료 또는 미검증 상태임
- 자동 QA가 `PASS`가 아님

---

## 1. Goal Framing

### 사용자

- Character Art Lead
- 3D Technical Art Lead
- UX Brand System Lead
- QA Lead
- Product Owner
- 승인 기록을 취합하는 Gate 1 Coordinator

### 달라져야 하는 것

현재의 “자동 QA 통과 후보”를 다음 두 상태 중 하나로 명확히 전환한다.

1. 증거가 완전한 `VERIFIED`: 10개 실제 승인, 해시 일치, 미해결 패치 없음
2. 원인이 명확한 `BLOCKED_EXTERNAL` 또는 `FAIL`: 누락 역할, 거절, 패치, 해시 변경을 구체적으로 기록

AI는 검토 자료를 정리하고 기록의 구조·무결성을 검사할 수 있지만, 승인자 이름·결정·검토 시각·의견을 생성하거나 추정할 수 없다.

---

## 2. Specification Engineering

### 완료 상태

다음 조건을 모두 만족해야 한다.

1. 자동 QA JSON의 `automated_status`가 `PASS`
2. `next_gate_allowed`가 승인 완료 전까지 `false`
3. 후보 보드 해시가 `candidate-review.json`, 자동 QA JSON, `SHA256SUMS.txt`와 일치
4. 두 캐릭터 각각 5개 역할, 총 10개 승인 행이 존재
5. 각 승인 행에 실제 reviewer, role, character, decision, reviewed_at, evidence_hash, comment가 존재
6. 모든 decision이 `APPROVE`이거나 해결·재검증된 `APPROVE_WITH_PATCH`
7. `REJECT`가 0개
8. unresolved patch가 0개
9. 승인 후 후보·방향 파일·비교 시트·등록부가 변경되지 않음
10. Harness 검증이 통과

### 필수 산출물

- 작성 완료된 `Gate1_Manual_Approval_Log_v5.2.0.xlsx`
- 갱신된 `candidate-review.json`의 `manual_approvals` 배열
- 역할별 검토 의견과 패치 이력
- 최종 Gate 1 결정 보고서
- 갱신된 `harness/status.json`
- 승인 대상 전체 SHA-256 동결 목록

### 성공 기준

```text
manual approvals = 10/10
rejects = 0
unresolved patches = 0
automated QA = PASS
hash drift = 0
Gate 1 = VERIFIED
Gate 2 entry_allowed = true
```

### 실패·차단 기준

- 승인자 부재·미응답: `BLOCKED_EXTERNAL`
- 해시 불일치·증거 누락·자동 QA 실패: `FAIL`
- 거절 또는 중대한 수정 요구: `FAIL`, 해당 캐릭터 보정 루프로 복귀
- 조건부 승인 패치 미완료: `BLOCKED_EXTERNAL`

---

## 3. Context Engineering

### 기준 문서

- `docs/ssot/stage7/v1.0/GATE1_CANONICAL_TURNAROUND_REMEDIATION_METAPROMPT_v5.2.0.md`
- `docs/stage8/prompts/GATE1_QA_APPROVAL_PACKAGE_METAPROMPT_v1.0.md`
- `docs/stage8/evidence/gate1/Gate1_Character_Consistency_Report_v5.2.0.md`
- `docs/stage8/evidence/gate1/Gate1_Change_Log_v5.2.0.md`
- `docs/stage8/audits/GATE1_CANONICAL_VIEW_AUDIT.md`

### 승인 대상

```text
Chakchaki
evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png
SHA-256: 916636d0cb1603ad0eed785cf9e827b693687fe437c1eb24014724a0f1b57480

Gongsickyi
evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png
SHA-256: 9c8061afab5bc381edc02780c0ee9265489d977f3cecfc1e8e52ab6467b01157
```

### 증거 패키지

- `docs/stage8/evidence/gate1/views/`
- `docs/stage8/evidence/gate1/overlays/`
- `docs/stage8/evidence/gate1/differences/`
- `docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json`
- `docs/stage8/evidence/gate1/SHA256SUMS.txt`
- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx`
- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx`

### 상태 저장소

- `docs/stage8/evidence/gate1/candidate-review.json`
- `harness/status.json`
- `docs/stage8/audits/FINAL_EXECUTION_REPORT.md`

---

## 4. Harness Engineering

### 허용 도구

- 이미지·문서 읽기 도구
- SHA-256 계산 도구
- Excel 승인 대장 편집 도구
- JSON·Markdown 검증기
- `scripts/harness/audit_gate1.py`
- `scripts/harness/validate_harness.py`
- Git diff/status/log

### 통제 규칙

1. 승인 대상은 읽기 전용으로 취급한다.
2. 승인 중 후보나 증거 파일을 수정하지 않는다.
3. 승인자 입력은 원문 그대로 전사하고 의미를 바꾸지 않는다.
4. AI·봇·대리인이 reviewer가 될 수 없다.
5. reviewer와 reviewed_at이 없는 결정은 `PENDING`이다.
6. 승인 후 해시가 변경되면 해당 캐릭터의 5개 승인을 모두 `STALE`로 무효화한다.
7. 승인 대장과 JSON이 다르면 더 보수적인 상태를 적용하고 `FAIL`로 조사한다.
8. 민감정보 파일은 읽거나 커밋하지 않는다.
9. Gate 1 검증 전에는 Gate 2 파일을 생성·수정하지 않는다.

---

## 5. Prompt Engineering

### 지금 수행할 작업

두 캐릭터의 동일한 고정 증거를 5개 책임 역할에 제시하고, 역할별 체크리스트에 따라 실명 결정을 수집·검증·동기화한다.

### 승인자에게 제시할 공통 요청문

```text
당신은 수학착착 Gate 1의 [ROLE] 책임자입니다.
아래 SHA-256으로 고정된 [CHARACTER] 후보와 16개 방향 파일, 오버레이,
차이 주석, 자동 QA 결과를 직접 검토하십시오.

결정은 APPROVE, APPROVE_WITH_PATCH, REJECT 중 하나만 선택하십시오.
실명, 검토 시각, 승인 대상 SHA-256, 구체적 근거를 기록하십시오.
APPROVE_WITH_PATCH인 경우 patch_id, 수정 범위, 책임자, 완료 기준을 반드시 적으십시오.
후보 해시가 제시된 값과 다르면 검토를 중단하고 HASH_MISMATCH를 보고하십시오.
```

### 역할별 성공·실패 체크리스트

#### Character Art Lead

- 성공: 얼굴·체형·연령감·의상·고유 실루엣이 Stage 7 참조와 일치
- 성공: 8방향에서 해부·비율·표정·색상 드리프트가 허용 범위 내
- 실패: 다른 캐릭터처럼 보임, 신체 구조 불연속, 고유 요소 소실·변형

#### 3D Technical Art Lead

- 성공: 8방향이 하나의 모델로 재구성 가능한 구조를 가짐
- 성공: 좌우·앞뒤 깊이, 소품 결합, 바닥선, 정투영 가정이 모순되지 않음
- 실패: 뷰 간 부피·결합점·소품 위치가 하나의 3D 구조로 성립하지 않음

#### UX Brand System Lead

- 성공: 브랜드 색·형태·고유 소품이 일관되고 32/64/128px에서 구별 가능
- 성공: Chakchaki와 Gongsickyi가 작은 크기에서도 서로 혼동되지 않음
- 실패: 브랜드 정체성 훼손, 색상 편차, 축소 가독성 부족, 소품 의미 불명확

#### QA Lead

- 성공: 16개 방향 ID·파일·해시·보드 셀이 정확히 대응
- 성공: 자동 QA PASS, 방향 파일 32/32, 비교 시트 4/4, 승인 기록 무결성 확인
- 실패: 누락·중복·잘못된 매핑·해시 불일치·재현 불가

#### Product Owner

- 성공: 제품 목적과 학습자 경험에 적합하고 잔여 위험을 수용 가능
- 성공: 다른 네 역할의 결정과 패치 상태를 확인
- 실패: 제품 사용 부적합, 미해결 위험, 권리·브랜드 쟁점 미수용

---

## 6. Workflow Engineering

```text
1. Preflight
   ├─ 자동 QA PASS 확인
   ├─ 두 후보 SHA-256 확인
   ├─ 승인 대장 10행 PENDING 확인
   └─ 불일치 시 즉시 중단

2. Evidence Freeze
   ├─ 보드·방향 파일·오버레이·차이 시트 목록 고정
   ├─ SHA256SUMS 스냅샷 기록
   └─ 승인 중 파일 수정 금지

3. Role Review
   ├─ Character Art Lead × 2 characters
   ├─ 3D Technical Art Lead × 2 characters
   ├─ UX Brand System Lead × 2 characters
   ├─ QA Lead × 2 characters
   └─ Product Owner × 2 characters

4. Decision Branch
   ├─ APPROVE → 기록 검증
   ├─ APPROVE_WITH_PATCH → 패치 루프로 이동
   └─ REJECT → 해당 캐릭터 보정 루프로 이동

5. Patch Loop
   ├─ patch_id·범위·책임자·완료 기준 기록
   ├─ 새 버전으로만 수정
   ├─ 자동 QA 재실행
   ├─ SHA-256 갱신
   └─ 해당 캐릭터 기존 5개 승인 전부 무효화 후 재검토

6. Approval Sync
   ├─ Excel 10행과 candidate-review.json 대조
   ├─ reviewer·time·decision·hash·comment 검증
   └─ 불일치 시 FAIL

7. Promotion Transaction
   ├─ 10/10 승인
   ├─ reject 0
   ├─ unresolved patch 0
   ├─ hash drift 0
   ├─ automated QA PASS
   ├─ Gate 1 VERIFIED 기록
   └─ Gate 2 entry_allowed=true 기록

8. Final Validation
   ├─ audit_gate1.py
   ├─ validate_harness.py
   ├─ git diff --check
   └─ 최종 보고
```

---

## 7. Memory Engineering

### 반드시 남길 것

- 승인 대상 캐릭터와 SHA-256
- reviewer 실명과 역할
- decision과 reviewed_at
- 검토 근거와 의견
- patch_id, 수정 전·후 해시, 패치 책임자, 완료 기준
- 무효화된 승인과 무효화 사유
- 자동 QA 결과와 Harness 결과
- Gate 1·Gate 2 상태 전환 이력

### 남기지 않을 것

- AI가 추정한 승인자 정보
- 빈 셀을 승인으로 해석한 결과
- 승인되지 않은 `FINAL`, `APPROVED`, `VERIFIED` 명칭
- 임시 파일·중복 후보·근거 없는 구두 승인
- 민감정보와 복구 코드

### 다음 대화 인계문

```text
Gate 1 automated QA는 PASS다.
수동 승인은 [N]/10이며, 누락 역할은 [LIST]다.
승인 대상 해시는 [CHAK_HASH], [GONG_HASH]다.
미해결 패치는 [LIST]다.
Gate 1은 [STATUS], Gate 2는 [STATUS]다.
다음 허용 작업은 [NEXT_ACTION]뿐이다.
```

---

## 8. Loop Engineering

### 반복 단위

한 번의 반복은 `한 캐릭터 × 한 책임 역할 × 하나의 고정 해시`다.

### 검증 루프

1. 해시 확인
2. 역할 체크리스트 검토
3. 결정 기록
4. 기록 완전성 검사
5. 패치 여부 분기
6. 승인 집계 재계산
7. Gate 상태 재판정

### 종료 조건

- 성공 종료: 10/10 승인, 자동 QA PASS, 해시 드리프트 0, 미해결 패치 0
- 외부 차단 종료: 책임자 미응답 또는 승인 대기
- 실패 종료: 거절, 해시 불일치, 증거 손상, 자동 QA 실패

### 실패 원인 분류

```text
REVIEWER_MISSING
REVIEW_INCOMPLETE
HASH_MISMATCH
IDENTITY_DRIFT
ORTHOGRAPHIC_CONFLICT
ACCESSORY_CONFLICT
READABILITY_FAIL
EVIDENCE_MISSING
PATCH_UNRESOLVED
REJECTED
```

---

## 9. 승인 기록 스키마

`candidate-review.json`의 각 수동 승인 항목은 다음 필드를 사용한다.

```json
{
  "character": "Chakchaki or Gongsickyi",
  "role": "one of the five required roles",
  "reviewer": "real reviewer name",
  "decision": "APPROVE | APPROVE_WITH_PATCH | REJECT",
  "reviewed_at": "ISO-8601 timestamp with timezone",
  "evidence_hash": "approved candidate SHA-256",
  "comment": "specific review rationale",
  "patch_id": null,
  "unresolved_patch": false
}
```

필수 필드가 하나라도 없으면 해당 행은 `PENDING`이다.

---

## 10. 최종 실행 명령

승인 전 기준 확인:

```powershell
python scripts/harness/audit_gate1.py
python scripts/harness/validate_harness.py
```

현재는 `audit_gate1.py`가 `BLOCKED_EXTERNAL`로 종료 코드 1을 반환하는 것이 정상이다.

승인 기록 동기화 후:

```powershell
python scripts/harness/audit_gate1.py
python scripts/harness/validate_harness.py
git diff --check
```

두 검증기가 모두 통과하고 Gate 1 증거가 `VERIFIED`일 때만 Gate 2 메타프롬프트 실행을 허용한다.

---

## 11. 지금 실행할 지시

1. 자동 QA와 두 후보 SHA-256을 읽기 전용으로 확인한다.
2. 승인 대장의 10개 행이 모두 `PENDING`인지 확인한다.
3. 역할별 검토 패킷을 두 캐릭터 단위로 준비한다.
4. 실제 책임자의 결정을 기다린다. AI는 승인 결정을 채우지 않는다.
5. 받은 결정만 원문 그대로 기록하고 JSON과 Excel을 동기화한다.
6. 거절·패치·해시 변경 시 해당 캐릭터의 승인 전체를 무효화하고 보정 루프로 복귀한다.
7. 10개 유효 승인 전에는 Gate 1을 승격하거나 Gate 2를 시작하지 않는다.
