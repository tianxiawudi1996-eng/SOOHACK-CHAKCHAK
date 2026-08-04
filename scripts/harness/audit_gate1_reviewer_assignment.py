#!/usr/bin/env python3
"""Audit Gate 1 reviewer assignments and dispatch readiness without sending messages."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANUAL_ROOT = ROOT / "docs/stage8/evidence/gate1/manual-review"
REGISTER_PATH = MANUAL_ROOT / "REVIEWER_ASSIGNMENT_REGISTER_v1.0.json"
MANIFEST_PATH = MANUAL_ROOT / "FROZEN_EVIDENCE_MANIFEST_v1.0.json"
INTAKE_AUDIT_PATH = MANUAL_ROOT / "GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json"
OUTPUT_JSON = MANUAL_ROOT / "GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE1_REVIEWER_ASSIGNMENT_AUDIT.md"

ROLE_MAP = {
    "character_art_lead": "Character Art Lead",
    "3d_technical_art_lead": "3D Technical Art Lead",
    "ux_brand_system_lead": "UX Brand System Lead",
    "qa_lead": "QA Lead",
    "product_owner": "Product Owner",
}
CHARACTERS = {"Chakchaki", "Gongsickyi"}
ESSENTIAL_FIELDS = (
    "reviewer_name",
    "reviewer_identity_reference",
    "contact_reference",
    "assigned_at",
    "acknowledged_at",
    "conflict_declaration",
)


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"REVIEWER_ASSIGNMENT_FAIL: cannot load {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
        raise SystemExit(2)
    if not isinstance(value, dict):
        print(f"REVIEWER_ASSIGNMENT_FAIL: invalid JSON root: {path.relative_to(ROOT)}", file=sys.stderr)
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
    missing = "\n".join(f"- `{role}`" for role in result["missing_roles"]) or "- 없음"
    failures = "\n".join(f"- {item}" for item in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- {item}" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 1 Reviewer Assignment Audit

## Outcome

- Status: `{result['status']}`
- Valid assignments: `{result['valid_assignment_count']}/5`
- Acknowledged assignments: `{result['acknowledged_assignment_count']}/5`
- Packet mappings: `{result['packet_mapping_count']}/10`
- Dispatch drafts: `{result['dispatch_draft_count']}/5`
- Dispatch performed: `{str(result['dispatch_performed']).lower()}`
- Approvals created: `{result['approvals_created']}`
- Gate 2 allowed: `{str(result['next_gate_allowed']).lower()}`

배정 준비는 승인이나 외부 발송이 아니다. 실제 reviewer 정보와 수신 확인 없이 `READY_FOR_DISPATCH`로 판정하지 않는다.

## Missing roles

{missing}

## Failures

{failures}

## External blockers

{blockers}

## Next action

{result['next_action']}
""",
        encoding="utf-8",
    )


def main() -> int:
    register = load_json(REGISTER_PATH)
    manifest = load_json(MANIFEST_PATH)
    intake_audit = load_json(INTAKE_AUDIT_PATH)
    failures: list[str] = []
    blockers: list[str] = []

    if register.get("package_id") != manifest.get("package_id"):
        failures.append("PACKAGE_ID_MISMATCH")
    if register.get("approvals_created") != 0:
        failures.append("ASSIGNMENT_REGISTER_MUST_NOT_CREATE_APPROVALS")
    if register.get("next_gate_allowed") is not False:
        failures.append("PREMATURE_NEXT_GATE_PERMISSION")

    candidates = {item.get("character"): clean(item.get("sha256")) for item in manifest.get("candidates", [])}
    if set(candidates) != CHARACTERS:
        failures.append("FROZEN_CANDIDATE_SET_INVALID")

    assignments = register.get("assignments")
    if not isinstance(assignments, list) or len(assignments) != 5:
        failures.append("ASSIGNMENT_COUNT_INVALID")
        assignments = []
    slugs = [clean(item.get("role_slug")) for item in assignments]
    roles = [clean(item.get("role")) for item in assignments]
    if set(slugs) != set(ROLE_MAP) or len(set(slugs)) != 5:
        failures.append("ROLE_SLUG_MATRIX_INVALID")
    if set(roles) != set(ROLE_MAP.values()) or len(set(roles)) != 5:
        failures.append("ROLE_MATRIX_INVALID")

    valid_assignments = 0
    acknowledged_assignments = 0
    packet_mapping_count = 0
    dispatch_draft_count = 0
    missing_roles: list[str] = []
    identity_references: list[str] = []

    for item in assignments:
        role = clean(item.get("role"))
        slug = clean(item.get("role_slug"))
        label = role or slug or "UNKNOWN_ROLE"
        if ROLE_MAP.get(slug) != role:
            failures.append(f"ROLE_NAME_SLUG_MISMATCH: {label}")

        values = {field: clean(item.get(field)) for field in ESSENTIAL_FIELDS}
        populated = [field for field, value in values.items() if value]
        if not populated:
            missing_roles.append(role)
            if item.get("status") != "UNASSIGNED":
                failures.append(f"EMPTY_ASSIGNMENT_STATUS_INVALID: {label}")
        elif len(populated) != len(ESSENTIAL_FIELDS):
            failures.append(f"PARTIAL_ASSIGNMENT: {label}: {', '.join(sorted(set(ESSENTIAL_FIELDS) - set(populated)))}")
        else:
            valid_assignments += 1
            identity_references.append(values["reviewer_identity_reference"])
            if not valid_timestamp(values["assigned_at"]) or not valid_timestamp(values["acknowledged_at"]):
                failures.append(f"ASSIGNMENT_TIMESTAMP_INVALID: {label}")
            conflict = values["conflict_declaration"]
            if conflict not in {"NO_CONFLICT", "DISCLOSED_ACCEPTED"}:
                blockers.append(f"CONFLICT_DECLARATION_UNRESOLVED: {label}")
            if conflict == "DISCLOSED_ACCEPTED" and not clean(item.get("conflict_record")):
                blockers.append(f"CONFLICT_RECORD_MISSING: {label}")
            if item.get("status") == "ACKNOWLEDGED":
                acknowledged_assignments += 1
            else:
                blockers.append(f"REVIEWER_NOT_ACKNOWLEDGED: {label}")

        packets = item.get("packets")
        if not isinstance(packets, dict) or set(packets) != CHARACTERS:
            failures.append(f"PACKET_MAPPING_INVALID: {label}")
        else:
            for character in sorted(CHARACTERS):
                packet_path = ROOT / clean(packets.get(character))
                if not packet_path.is_file():
                    failures.append(f"PACKET_MISSING: {label} / {character}")
                    continue
                packet_text = packet_path.read_text(encoding="utf-8")
                if role not in packet_text or candidates.get(character, "") not in packet_text:
                    failures.append(f"PACKET_IDENTITY_MISMATCH: {label} / {character}")
                    continue
                packet_mapping_count += 1

        request_path = ROOT / clean(item.get("dispatch_request"))
        if not request_path.is_file():
            failures.append(f"DISPATCH_DRAFT_MISSING: {label}")
        else:
            request = request_path.read_text(encoding="utf-8")
            dispatch_performed = register.get("dispatch_performed") is True
            required_dispatch_status = (
                "Dispatch status: `SENT_CONFIRMED`"
                if dispatch_performed
                else "Dispatch status: `NOT_SENT`"
            )
            required = [
                role,
                clean(manifest.get("package_id")),
                candidates.get("Chakchaki", ""),
                candidates.get("Gongsickyi", ""),
                required_dispatch_status,
                "APPROVE_WITH_PATCH",
            ]
            if dispatch_performed:
                required.extend(
                    [
                        clean(item.get("reviewer_name")),
                        clean(item.get("reviewer_identity_reference")),
                        clean(item.get("contact_reference")),
                        "Confirmation recorded at:",
                        "Confirmation source:",
                    ]
                )
            if any(value not in request for value in required):
                failures.append(f"DISPATCH_DRAFT_CONTENT_INVALID: {label}")
            else:
                dispatch_draft_count += 1

    if len(identity_references) != len(set(identity_references)):
        failures.append("DUPLICATE_REVIEWER_IDENTITY_REFERENCE")
    if missing_roles and not failures:
        blockers.append(f"REVIEWERS_UNASSIGNED: {len(missing_roles)}")

    ready = (
        not failures
        and not blockers
        and valid_assignments == 5
        and acknowledged_assignments == 5
        and packet_mapping_count == 10
        and dispatch_draft_count == 5
    )
    dispatch_performed = register.get("dispatch_performed") is True
    if dispatch_performed and not ready:
        failures.append("DISPATCH_RECORDED_BEFORE_READINESS")
        status = "FAIL"
        ready = False
    elif ready and dispatch_performed:
        status = "DISPATCH_CONFIRMED"
    elif ready:
        status = "READY_FOR_DISPATCH"
    elif failures:
        status = "FAIL"
    else:
        status = "BLOCKED_EXTERNAL"

    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 1,
        "status": status,
        "package_id": manifest.get("package_id"),
        "assignment_register_sha256": hashlib.sha256(REGISTER_PATH.read_bytes()).hexdigest(),
        "valid_assignment_count": valid_assignments,
        "acknowledged_assignment_count": acknowledged_assignments,
        "assignment_required": 5,
        "packet_mapping_count": packet_mapping_count,
        "packet_mapping_required": 10,
        "dispatch_draft_count": dispatch_draft_count,
        "dispatch_draft_required": 5,
        "missing_roles": sorted(missing_roles),
        "failures": failures,
        "blockers": blockers,
        "dispatch_performed": dispatch_performed,
        "approvals_created": register.get("approvals_created", 0),
        "approval_intake_status": intake_audit.get("status"),
        "approval_count": intake_audit.get("valid_approval_count", 0),
        "ready_for_dispatch": ready,
        "next_gate_allowed": False,
        "next_action": (
            "각 검토자로부터 두 캐릭터의 실제 결정을 수집하고 Excel·JSON 승인 기록을 동기화한다."
            if status == "DISPATCH_CONFIRMED"
            else (
                "승인된 채널로 요청을 전달한 뒤 각 검토자로부터 두 캐릭터 결정을 수집한다."
                if ready
                else "다섯 실제 검토자를 배정하고 이해상충 선언과 수신 확인을 기록한다."
            )
        ),
    }
    write_outputs(result)

    print("GATE1_REVIEWER_ASSIGNMENT_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"valid_assignments={valid_assignments}/5")
    print(f"acknowledged={acknowledged_assignments}/5")
    print(f"packet_mappings={packet_mapping_count}/10")
    print(f"dispatch_drafts={dispatch_draft_count}/5")
    print(f"dispatch_performed={str(dispatch_performed).lower()}")
    print("approvals_created=0")
    print("next_gate_allowed=false")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
