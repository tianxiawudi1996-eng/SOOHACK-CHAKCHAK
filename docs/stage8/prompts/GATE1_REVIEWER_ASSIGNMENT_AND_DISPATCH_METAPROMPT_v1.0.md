# 수학착착 Stage 8 — Gate 1 책임자 배정·검토 요청 배포 실행 메타프롬프트 v1.0

> 상태: `SUPERSEDED_NON_GATING`. 역할별 배정·발송 기록은 이력으로 보존하지만 현재 Gate 판정은 프로젝트 책임자 1인 승인으로 수행한다.

## 0. 실행 선언

이 프롬프트는 Gate 1의 다섯 책임 역할에 실제 검토자를 배정하고, 두 캐릭터의 고정 검토 패킷을 동일한 조건으로 전달하기 위한 통제 절차다. AI는 reviewer 실명, 연락처, 배정 시각, 수신 확인 또는 승인 결정을 추정하지 않는다.

현재 상태:

```text
Automated QA: PASS
Review packets: 10/10 READY
Assigned reviewers: 0/5
Valid approvals: 0/10
Gate 1: BLOCKED
Gate 2: NOT_STARTED
```

## 1. Goal Framing

### 사용자

- Gate 1 Coordinator
- Character Art Lead
- 3D Technical Art Lead
- UX Brand System Lead
- QA Lead
- Product Owner

### 달라져야 하는 것

- 각 역할에 책임 있는 실명 검토자가 한 명씩 배정된다.
- 각 검토자는 두 캐릭터의 동일한 패키지 ID와 후보 해시를 받는다.
- 배정·수신 확인·이해상충 선언을 추적할 수 있다.
- 배정 완료 전에는 요청 발송이나 승인 수집을 완료로 간주하지 않는다.

## 2. Specification Engineering

### 완료 상태

1. 필수 역할 5개가 중복 없이 존재한다.
2. 각 역할에 실제 reviewer_name과 내부 identity_reference가 있다.
3. 실제 발송 경로를 가리키는 contact_reference가 있다.
4. assigned_at과 acknowledged_at은 시간대 포함 ISO-8601이다.
5. 이해상충 상태가 `NO_CONFLICT` 또는 승인된 `DISCLOSED_ACCEPTED`다.
6. 각 역할이 Chakchaki·Gongsickyi 패킷을 모두 참조한다.
7. 요청문에 패키지 ID, 두 후보 SHA-256, 결정 enum, 반환 필드가 있다.
8. 다섯 검토자 identity_reference가 서로 다르다.

### 성공 기준

```text
valid assignments = 5/5
acknowledged assignments = 5/5
packet mappings = 10/10
conflicts unresolved = 0
status = READY_FOR_DISPATCH
```

### 실패·차단 기준

- 실명·연락 경로·수신 확인 누락: `BLOCKED_EXTERNAL`
- 일부만 채운 배정 레코드: `FAIL`
- 역할 또는 패킷 매핑 누락: `FAIL`
- 중복 identity_reference: `FAIL`
- 미해결 이해상충: `BLOCKED_EXTERNAL`
- 후보 해시 또는 패키지 ID 불일치: `FAIL`

## 3. Context Engineering

### 고정 패키지

- Package: `gate1-manual-review-916636d0-9c8061af`
- Chakchaki: `916636d0cb1603ad0eed785cf9e827b693687fe437c1eb24014724a0f1b57480`
- Gongsickyi: `9c8061afab5bc381edc02780c0ee9265489d977f3cecfc1e8e52ab6467b01157`

### 입력

- `docs/stage8/evidence/gate1/manual-review/FROZEN_EVIDENCE_MANIFEST_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/packets/`
- `docs/stage8/evidence/gate1/manual-review/GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json`

### 출력

- `docs/stage8/evidence/gate1/manual-review/REVIEWER_ASSIGNMENT_REGISTER_v1.0.json`
- `docs/stage8/evidence/gate1/manual-review/dispatch/`
- `docs/stage8/evidence/gate1/manual-review/GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json`
- `docs/stage8/audits/GATE1_REVIEWER_ASSIGNMENT_AUDIT.md`

## 4. Harness Engineering

### 허용 도구

- JSON·Markdown 편집기
- SHA-256 계산기
- `scripts/harness/audit_gate1_reviewer_assignment.py`
- 기존 Gate 1·Stage 8 감사기
- Git diff/status/log

### 통제

1. AI는 reviewer_name, identity_reference, contact_reference를 만들지 않는다.
2. 연락 경로는 비밀값 대신 내부 참조 ID만 저장한다.
3. 외부 메시지는 실제 수신자와 발송 권한이 확인되기 전에는 전송하지 않는다.
4. 배정 완료는 승인이 아니며 승인 수에 포함하지 않는다.
5. 각 역할의 요청문은 두 캐릭터 모두를 포함한다.
6. 후보 해시 변경 시 모든 요청을 폐기하고 패키지를 재생성한다.
7. Gate 1 승인 10/10 전에는 Gate 2를 시작하지 않는다.
8. 민감정보 또는 복구 코드를 읽거나 기록하지 않는다.

## 5. Prompt Engineering

### 지금 할 작업

1. 다섯 역할의 공란 배정 레코드를 만든다.
2. 역할별 검토 요청 초안 5개를 만든다.
3. 두 캐릭터의 패킷과 후보 해시를 각 요청문에 고정한다.
4. 실제 배정 필드의 완전성·고유성·수신 확인을 감사한다.
5. 현재 미배정 상태를 `BLOCKED_EXTERNAL`로 보고한다.

### 역할 배정 체크리스트

- [ ] 실제 reviewer_name
- [ ] reviewer_identity_reference
- [ ] contact_reference
- [ ] assigned_at
- [ ] acknowledged_at
- [ ] conflict_declaration
- [ ] 두 캐릭터 packet 경로
- [ ] status = `ACKNOWLEDGED`

### 요청문 반환 필드

```text
Reviewer:
Role:
Character:
Decision: APPROVE | APPROVE_WITH_PATCH | REJECT
Reviewed at:
Evidence hash:
Comment:
Patch ID:
Unresolved patch:
```

## 6. Workflow Engineering

```text
1. Package identity check
2. Empty assignment register preparation
3. Five role-specific request drafts
4. Real reviewer assignment
5. Conflict declaration
6. Delivery through authorized channel
7. Reviewer acknowledgment
8. Assignment audit
9. Decision collection
10. Excel/JSON approval-intake audit
```

현재 실행은 1~3과 8을 수행한다. 4~7은 실제 검토자 정보와 발송 권한이 없으므로 수행하지 않는다.

## 7. Memory Engineering

### 남길 것

- 역할별 reviewer identity reference
- contact reference
- 배정·수신 확인 시각
- 이해상충 선언과 처리 근거
- 요청문 경로와 두 패킷 경로
- 미배정 역할 목록

### 없앨 것

- 추정 이름·연락처
- 비밀번호·토큰·개인 연락처 원문
- 전송하지 않은 요청을 `SENT`로 표시한 기록
- 배정을 승인으로 계산한 값

### 다음 인계문

```text
Reviewer assignment audit: [STATUS]
Assigned: [N]/5
Acknowledged: [N]/5
Missing roles: [LIST]
Dispatch performed: [true|false]
Approvals: [N]/10
Gate 1: [STATUS]
Gate 2: [STATUS]
```

## 8. Loop Engineering

### 반복 단위

한 역할의 배정 → 이해상충 확인 → 요청 전달 → 수신 확인이다.

### 종료 조건

- 성공: 5/5 유효 배정과 수신 확인
- 외부 차단: 실명 검토자 또는 발송 경로 미제공
- 실패: 중복 배정, 패킷·해시 오류, 허위 수신 확인

## 9. 실행 명령

```powershell
python scripts/harness/audit_gate1_reviewer_assignment.py
python scripts/harness/audit_gate1_approval_intake.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

현재 reviewer가 0/5이면 첫 감사기는 종료 코드 1과 `BLOCKED_EXTERNAL`을 반환해야 한다.

## 10. 지금 실행할 지시

1. 공란 배정 대장과 역할별 요청문 5개를 준비한다.
2. 패키지 ID·후보 해시·패킷 경로를 검증한다.
3. 실명이나 연락 경로를 추정하지 않는다.
4. 외부 발송을 수행했다고 기록하지 않는다.
5. 미배정 역할 5개를 보고하고 Gate 1·2 상태를 유지한다.
