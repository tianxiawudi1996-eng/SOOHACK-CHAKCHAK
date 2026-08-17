# 수학착착 Stage 8 — Gate 1 외부 검토 차단 해소 인계 실행 메타프롬프트 v1.0

> 상태: `SUPERSEDED_NON_GATING`. 다섯 검토자 nomination 흐름은 감사 이력이며 현재 Gate 차단 해소에는 단일 프로젝트 책임자 결정 1건만 필요하다.

## 0. 실행 선언

이 프롬프트는 자동화가 해결할 수 없는 Gate 1의 실제 책임자 배정 차단을 Gate 1 Coordinator에게 명확히 인계하고, 재개에 필요한 입력을 검증 가능한 형태로 수집하기 위한 절차다. AI는 실명, identity reference, contact reference, 권한 또는 이해상충 선언을 생성하지 않는다.

현재 상태:

```text
Review packets: 10/10
Dispatch drafts: 5/5
Reviewer assignments: 0/5
Acknowledgments: 0/5
Valid approvals: 0/10
Gate 1: BLOCKED
Gate 2: NOT_STARTED
```

## 1. Goal Framing

### 사용자

- Gate 1 Coordinator
- 검토자를 지명할 권한이 있는 프로젝트 책임자
- 배정 결과를 검증하는 QA 담당자

### 달라져야 하는 것

- “검토자가 없다”는 추상적 차단을 5개 역할별 입력 요구사항으로 전환한다.
- Coordinator가 반환해야 할 최소 정보와 권한 근거를 고정한다.
- 완전한 응답만 `READY_FOR_ASSIGNMENT`로 판정한다.
- 불완전하거나 추정된 응답은 배정 대장에 반영하지 않는다.

## 2. Specification Engineering

### 완료 상태

1. submitted_by와 시간대 포함 submitted_at이 있다.
2. 검토자 지명 권한을 가리키는 authorization_reference가 있다.
3. 필수 역할 5개가 중복 없이 존재한다.
4. 각 역할에 실제 reviewer_name, reviewer_identity_reference, contact_reference가 있다.
5. 다섯 reviewer_identity_reference가 서로 다르다.
6. conflict_declaration은 `NO_CONFLICT` 또는 `DISCLOSED_ACCEPTED`다.
7. `DISCLOSED_ACCEPTED`에는 conflict_record가 있다.
8. 승인·발송·수신 확인을 생성하지 않는다.

### 성공 기준

```text
valid nominations = 5/5
unique identity references = 5/5
authorization reference = present
unresolved nomination conflicts = 0
status = READY_FOR_ASSIGNMENT
```

### 실패·차단 기준

- 미제출 또는 필수값 누락: `BLOCKED_EXTERNAL`
- 역할 구조 오류·중복 역할: `FAIL`
- 중복 identity reference: `FAIL`
- 허용되지 않은 conflict 값: `FAIL`
- 권한 근거 누락: `BLOCKED_EXTERNAL`
- 후보·패킷 또는 요청 초안 손상: `FAIL`

## 3. Context Engineering

### 선행 증거

- `docs/stage8/evidence/gate1/manual-review/GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/REVIEWER_ASSIGNMENT_REGISTER_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/dispatch/`

### 입력

- `docs/stage8/evidence/gate1/manual-review/COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json`

### 출력

- `docs/stage8/evidence/gate1/manual-review/GATE1_EXTERNAL_UNBLOCK_AUDIT_v1.0.json`
- `docs/stage8/audits/GATE1_EXTERNAL_UNBLOCK_AUDIT.md`
- `docs/stage8/evidence/gate1/manual-review/COORDINATOR_ACTION_REQUEST.md`

## 4. Harness Engineering

### 허용 도구

- JSON·Markdown 편집기
- `scripts/harness/audit_gate1_external_unblock.py`
- 기존 reviewer-assignment, approval-intake, Stage 8 감사기
- Git diff/status/log

### 통제

1. Coordinator 응답은 원문 입력만 사용한다.
2. 비밀번호·토큰·개인 연락처 원문은 저장하지 않고 내부 참조만 받는다.
3. nomination은 assignment, acknowledgment 또는 approval이 아니다.
4. `READY_FOR_ASSIGNMENT`는 배정 대장 반영을 허용할 뿐 외부 발송을 허용하지 않는다.
5. 기존 요청 초안은 `NOT_SENT`를 유지한다.
6. 실제 응답 전에는 Gate 1·2 상태를 변경하지 않는다.
7. 민감정보 또는 복구 코드를 읽지 않는다.

## 5. Prompt Engineering

### 지금 할 작업

1. Coordinator 행동 요청서를 작성한다.
2. 5개 역할의 공란 nomination 응답 템플릿을 만든다.
3. 응답 구조·권한·고유성·이해상충을 감사한다.
4. 현재 0/5를 `BLOCKED_EXTERNAL`로 기록한다.
5. 실제 입력이 없으므로 배정·발송·승인을 수행하지 않는다.

### Coordinator 반환 체크리스트

- [ ] submitted_by
- [ ] submitted_at
- [ ] authorization_reference
- [ ] 5개 역할 reviewer_name
- [ ] 5개 reviewer_identity_reference
- [ ] 5개 contact_reference
- [ ] 5개 conflict_declaration
- [ ] 필요한 conflict_record

## 6. Workflow Engineering

```text
1. Confirm automated preparation complete
2. Issue Coordinator action request
3. Receive nomination response
4. Validate authority and five-role matrix
5. Validate unique identity references
6. Validate conflict declarations
7. READY_FOR_ASSIGNMENT or BLOCKED_EXTERNAL/FAIL
8. Human-controlled assignment register update
9. Reviewer acknowledgment and assignment audit
10. Authorized dispatch and approval collection
```

현재 실행은 1, 2, 4~7을 수행하며 빈 응답이므로 `BLOCKED_EXTERNAL`에서 종료한다.

## 7. Memory Engineering

### 남길 것

- 요청된 역할 5개
- 누락 필드와 누락 역할
- Coordinator 제출자·제출 시각·권한 참조
- nomination 유효성 판정
- 다음 허용 작업

### 없앨 것

- AI가 만든 실명 또는 연락 참조
- 실제 제출이 없는 권한 근거
- nomination을 assignment나 approval로 승격한 기록
- 비밀정보와 개인 연락처 원문

### 다음 인계문

```text
External unblock audit: [STATUS]
Valid nominations: [N]/5
Authorization reference: [present|missing]
Missing roles: [LIST]
Assignment audit: [STATUS]
Approval intake: [STATUS]
Gate 1: [STATUS]
Gate 2: [STATUS]
Next authorized action: [ACTION]
```

## 8. Loop Engineering

### 반복 단위

한 역할의 실제 nomination 입력과 이해상충 선언을 하나의 단위로 검사한다.

### 종료 조건

- 성공: 유효 nomination 5/5와 권한 근거 존재
- 외부 차단: 응답 없음 또는 필수값 누락
- 실패: 역할 구조·고유성·이해상충 enum 오류

## 9. 실행 명령

```powershell
python scripts/harness/audit_gate1_external_unblock.py
python scripts/harness/audit_gate1_reviewer_assignment.py
python scripts/harness/audit_gate1_approval_intake.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

현재 nomination이 0/5이면 첫 감사기는 종료 코드 1과 `BLOCKED_EXTERNAL`을 반환해야 한다.

## 10. 지금 실행할 지시

1. Coordinator 행동 요청서와 공란 응답 템플릿을 작성한다.
2. 실제 응답이 없음을 명시적으로 감사한다.
3. 누락 역할 5개와 권한 근거 누락을 보고한다.
4. 배정·발송·승인을 생성하지 않는다.
5. Gate 1 `BLOCKED`, Gate 2 `NOT_STARTED`를 유지한다.
