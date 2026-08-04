# Gate 1 Manual Review Package

## Current state

- Package: `gate1-manual-review-916636d0-9c8061af`
- Preparation result: `READY_FOR_HUMAN_REVIEW`
- Automated QA: `PASS`
- Actual approvals: `0/10`
- Valid Coordinator nominations: `5/5`
- Nomination state: `READY_FOR_ASSIGNMENT`
- Applied assignments: `0/5`
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
- `dispatch/`: five role-specific review-request drafts; all remain `NOT_SENT`.

## Workflow

1. Assign one accountable named reviewer to each required role.
2. Each role reviews both character packets against the frozen candidate hash.
3. Record decisions only from the real reviewer in `Gate1_Manual_Approval_Log_v5.2.0.xlsx` and the canonical JSON approval record.
4. On any candidate hash change, invalidate all five approvals for that character and rebuild/re-audit the package.
5. Do not promote Gate 1 until 10 valid approvals, zero rejects, zero unresolved patches, automated QA PASS, and zero hash drift are all proven.
6. Refresh `approval-workbook-current.json`, then run `python scripts/harness/audit_gate1_approval_intake.py` after every real reviewer submission.
7. Run `python scripts/harness/audit_gate1_reviewer_assignment.py` after assignment or acknowledgment changes.
8. Run `python scripts/harness/audit_gate1_external_unblock.py` after the Coordinator nomination response changes.

AI preparation does not count as approval and must never populate reviewer identity, decision, or time fields.
