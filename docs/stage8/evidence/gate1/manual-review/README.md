# Gate 1 Manual Review Package

> Policy status: `SUPERSEDED_NON_GATING`. 이 디렉터리의 10건 승인·배정·발송 자료는 감사 이력이다. 활성 정책은 `../single-approval/SINGLE_APPROVER_POLICY_v1.0.json`이며 프로젝트 책임자 승인 1건만 Gate 판정에 사용한다.

## Current state

- Package: `gate1-manual-review-916636d0-9c8061af`
- Preparation result: `READY_FOR_HUMAN_REVIEW`
- Automated QA: `PASS`
- Legacy approvals: `0/10` — non-gating
- Active single approval: `0/1`
- Valid Coordinator nominations: `5/5`
- Nomination state: `READY_FOR_ASSIGNMENT`
- Applied assignments: `5/5`
- Acknowledged assignments: `5/5`
- Assignment state: `DISPATCH_CONFIRMED`
- Dispatch performed: `true` — confirmed by the user; not sent by AI
- Gate 1: `BLOCKED`
- Gate 2: `NOT_STARTED`

## Package contents

- `FROZEN_EVIDENCE_MANIFEST_v1.0.json`: 40 checksum records. Of these, 39 inputs are immutable; the blank approval ledger is a controlled mutable record whose pre-review baseline hash is retained.
- `approval-workbook-preflight.json`: read-only verification of the 10 blank `PENDING` rows.
- `approval-workbook-current.json`: latest read-only workbook snapshot used for Excel/JSON synchronization checks.
- `APPROVAL_INTAKE_TEMPLATE.json`: blank 5-role × 2-character intake template; it is not an approval record.
- `GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json`: current approval completeness, synchronization, patch, rejection, and hash-drift decision.
- `REVIEWER_ASSIGNMENT_REGISTER_v1.0.json`: five-role assignment register; identity and routing fields remain blank until provided by the coordinator.
- `GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json`: assignment completeness, acknowledgment, conflict, packet-mapping, and dispatch-readiness decision.
- `COORDINATOR_ACTION_REQUEST.md`: exact external action required to nominate five accountable reviewers.
- `COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json`: blank, privacy-safe nomination response schema.
- `GATE1_EXTERNAL_UNBLOCK_AUDIT_v1.0.json`: authority, role-matrix, identity-uniqueness, conflict, and resume-readiness decision.
- `packets/`: ten role-specific human review packets.
- `dispatch/`: five role-specific review-request records, all `SENT_CONFIRMED` from user confirmation.

## Workflow

1. Preserve this package as non-gating audit history.
2. Record one authorized Project Owner decision in `../single-approval/SINGLE_APPROVER_DECISION_v1.0.json`.
3. Run `python scripts/harness/audit_gate1_single_approval.py`.
4. Proceed to a controlled promotion only at `READY_FOR_PROMOTION` with automated QA PASS and zero hash drift.

AI preparation does not count as approval and must never populate the Project Owner identity, decision, or review time.
