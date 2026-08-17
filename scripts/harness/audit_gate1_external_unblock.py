#!/usr/bin/env python3
"""Audit the Coordinator nomination response needed to unblock Gate 1 reviewer assignment."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANUAL_ROOT = ROOT / "docs/stage8/evidence/gate1/manual-review"
RESPONSE_PATH = MANUAL_ROOT / "COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json"
ACTION_REQUEST_PATH = MANUAL_ROOT / "COORDINATOR_ACTION_REQUEST.md"
ASSIGNMENT_AUDIT_PATH = MANUAL_ROOT / "GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json"
APPROVAL_AUDIT_PATH = MANUAL_ROOT / "GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json"
OUTPUT_JSON = MANUAL_ROOT / "GATE1_EXTERNAL_UNBLOCK_AUDIT_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE1_EXTERNAL_UNBLOCK_AUDIT.md"

ROLES = {
    "Character Art Lead",
    "3D Technical Art Lead",
    "UX Brand System Lead",
    "QA Lead",
    "Product Owner",
}
NOMINATION_FIELDS = (
    "reviewer_name",
    "reviewer_identity_reference",
    "contact_reference",
    "conflict_declaration",
)


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"EXTERNAL_UNBLOCK_FAIL: cannot load {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
        raise SystemExit(2)
    if not isinstance(value, dict):
        print(f"EXTERNAL_UNBLOCK_FAIL: invalid JSON root: {path.relative_to(ROOT)}", file=sys.stderr)
        raise SystemExit(2)
    return value


def clean(value: object) -> str:
    return str(value or "").strip()


def valid_timestamp(value: str) -> bool:
    if not value:
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None


def write_outputs(result: dict) -> None:
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    missing_roles = "\n".join(f"- `{role}`" for role in result["missing_roles"]) or "- 없음"
    missing_fields = "\n".join(f"- `{item}`" for item in result["missing_fields"]) or "- 없음"
    failures = "\n".join(f"- {item}" for item in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- {item}" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 1 External Review Unblock Audit

## Outcome

- Status: `{result['status']}`
- Valid nominations: `{result['valid_nomination_count']}/5`
- Authorization reference present: `{str(result['authorization_reference_present']).lower()}`
- Assignment applied: `{str(result['assignment_applied']).lower()}`
- Dispatch performed: `{str(result['dispatch_performed']).lower()}`
- Approvals created: `{result['approvals_created']}`
- Gate 2 allowed: `{str(result['next_gate_allowed']).lower()}`

이 감사는 외부 차단 해소에 필요한 Coordinator 입력만 검증한다. nomination을 assignment, acknowledgment, dispatch 또는 approval로 간주하지 않는다.

## Missing roles

{missing_roles}

## Missing fields

{missing_fields}

## Failures

{failures}

## External blockers

{blockers}

## Next action

Gate 1 Coordinator가 행동 요청서에 따라 실제 다섯 검토자의 내부 참조와 권한 근거를 제공해야 한다. 유효 nomination 5/5가 되면 사람이 배정 대장을 갱신하고 별도 배정 감사를 실행한다.
""",
        encoding="utf-8",
    )


def main() -> int:
    response = load_json(RESPONSE_PATH)
    assignment_audit = load_json(ASSIGNMENT_AUDIT_PATH)
    approval_audit = load_json(APPROVAL_AUDIT_PATH)
    failures: list[str] = []
    blockers: list[str] = []

    if not ACTION_REQUEST_PATH.is_file():
        failures.append("COORDINATOR_ACTION_REQUEST_MISSING")
        action_request = ""
    else:
        action_request = ACTION_REQUEST_PATH.read_text(encoding="utf-8")
    if any(role not in action_request for role in ROLES):
        failures.append("COORDINATOR_ACTION_REQUEST_ROLE_MATRIX_INVALID")
    for required in ("authorization_reference", "reviewer_identity_reference", "contact_reference"):
        if required not in action_request:
            failures.append(f"COORDINATOR_ACTION_REQUEST_FIELD_MISSING: {required}")

    if response.get("assignment_applied") is not False:
        failures.append("NOMINATION_RESPONSE_APPLIED_ASSIGNMENT")
    if response.get("dispatch_performed") is not False:
        failures.append("NOMINATION_RESPONSE_RECORDED_DISPATCH")
    if response.get("approvals_created") != 0:
        failures.append("NOMINATION_RESPONSE_CREATED_APPROVALS")
    if response.get("next_gate_allowed") is not False:
        failures.append("PREMATURE_NEXT_GATE_PERMISSION")

    nominations = response.get("nominations")
    if not isinstance(nominations, list) or len(nominations) != 5:
        failures.append("NOMINATION_COUNT_INVALID")
        nominations = []
    nomination_roles = [clean(item.get("role")) for item in nominations if isinstance(item, dict)]
    if set(nomination_roles) != ROLES or len(set(nomination_roles)) != 5:
        failures.append("NOMINATION_ROLE_MATRIX_INVALID")

    submitted_by = clean(response.get("submitted_by"))
    submitted_at = clean(response.get("submitted_at"))
    authorization_reference = clean(response.get("authorization_reference"))
    missing_fields: list[str] = []
    if not submitted_by:
        missing_fields.append("submitted_by")
    if not submitted_at:
        missing_fields.append("submitted_at")
    elif not valid_timestamp(submitted_at):
        failures.append("SUBMITTED_AT_INVALID")
    if not authorization_reference:
        missing_fields.append("authorization_reference")

    valid_nominations = 0
    missing_roles: list[str] = []
    identity_references: list[str] = []
    for item in nominations:
        if not isinstance(item, dict):
            failures.append("NOMINATION_ROW_INVALID")
            continue
        role = clean(item.get("role"))
        values = {field: clean(item.get(field)) for field in NOMINATION_FIELDS}
        missing = [field for field, value in values.items() if not value]
        if missing:
            missing_roles.append(role)
            missing_fields.extend(f"{role}.{field}" for field in missing)
            continue
        conflict = values["conflict_declaration"]
        if conflict not in {"NO_CONFLICT", "DISCLOSED_ACCEPTED"}:
            failures.append(f"CONFLICT_DECLARATION_INVALID: {role}")
            continue
        if conflict == "DISCLOSED_ACCEPTED" and not clean(item.get("conflict_record")):
            missing_fields.append(f"{role}.conflict_record")
            missing_roles.append(role)
            continue
        identity_references.append(values["reviewer_identity_reference"])
        valid_nominations += 1

    if len(identity_references) != len(set(identity_references)):
        failures.append("DUPLICATE_REVIEWER_IDENTITY_REFERENCE")
    if assignment_audit.get("packet_mapping_count") != 10 or assignment_audit.get("dispatch_draft_count") != 5:
        failures.append("REVIEW_PREPARATION_INCOMPLETE")
    if assignment_audit.get("failures"):
        failures.append("ASSIGNMENT_AUDIT_HAS_FAILURES")
    if approval_audit.get("immutable_hash_drift_count") != 0:
        failures.append("IMMUTABLE_EVIDENCE_HASH_DRIFT")

    if missing_fields and not failures:
        blockers.append(f"COORDINATOR_INPUT_MISSING: {len(missing_fields)} fields")

    ready = (
        not failures
        and not blockers
        and valid_nominations == 5
        and bool(submitted_by)
        and valid_timestamp(submitted_at)
        and bool(authorization_reference)
    )
    if ready:
        status = "READY_FOR_ASSIGNMENT"
    elif failures:
        status = "FAIL"
    else:
        status = "BLOCKED_EXTERNAL"

    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 1,
        "status": status,
        "nomination_response_sha256": hashlib.sha256(RESPONSE_PATH.read_bytes()).hexdigest(),
        "valid_nomination_count": valid_nominations,
        "nomination_required": 5,
        "authorization_reference_present": bool(authorization_reference),
        "missing_roles": sorted(set(missing_roles)),
        "missing_fields": sorted(set(missing_fields)),
        "failures": failures,
        "blockers": blockers,
        "assignment_audit_status": assignment_audit.get("status"),
        "approval_intake_status": approval_audit.get("status"),
        "assignment_applied": False,
        "dispatch_performed": False,
        "approvals_created": 0,
        "ready_for_assignment": ready,
        "next_gate_allowed": False,
        "next_action": (
            "A human Coordinator may transfer validated nominations into the assignment register."
            if ready
            else "Wait for the Gate 1 Coordinator to submit five real reviewer nominations and authority evidence."
        ),
    }
    write_outputs(result)

    print("GATE1_EXTERNAL_UNBLOCK_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"valid_nominations={valid_nominations}/5")
    print(f"authorization_reference_present={str(bool(authorization_reference)).lower()}")
    print(f"missing_roles={len(set(missing_roles))}")
    print("assignment_applied=false")
    print("dispatch_performed=false")
    print("approvals_created=0")
    print("next_gate_allowed=false")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
