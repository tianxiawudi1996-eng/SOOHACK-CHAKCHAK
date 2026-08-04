#!/usr/bin/env python3
"""Audit real Gate 1 approval intake without fabricating decisions or promoting gates."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANUAL_ROOT = ROOT / "docs/stage8/evidence/gate1/manual-review"
SNAPSHOT_PATH = MANUAL_ROOT / "approval-workbook-current.json"
MANIFEST_PATH = MANUAL_ROOT / "FROZEN_EVIDENCE_MANIFEST_v1.0.json"
REVIEW_PATH = ROOT / "docs/stage8/evidence/gate1/candidate-review.json"
QA_PATH = ROOT / "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json"
OUTPUT_JSON = MANUAL_ROOT / "GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE1_APPROVAL_INTAKE_AUDIT.md"

ROLES = {
    "Character Art Lead",
    "3D Technical Art Lead",
    "UX Brand System Lead",
    "QA Lead",
    "Product Owner",
}
CHARACTERS = {"Chakchaki", "Gongsickyi"}
DECISIONS = {"APPROVE", "APPROVE_WITH_PATCH", "REJECT"}


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"APPROVAL_INTAKE_FAIL: cannot load {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
        raise SystemExit(2)
    if not isinstance(value, dict):
        print(f"APPROVAL_INTAKE_FAIL: JSON root is not an object: {path.relative_to(ROOT)}", file=sys.stderr)
        raise SystemExit(2)
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def text(value: object) -> str:
    return str(value or "").strip()


def key(record: dict) -> tuple[str, str]:
    return text(record.get("character")), text(record.get("role"))


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

    missing_lines = "\n".join(
        f"- `{item['character']} / {item['role']}`" for item in result["missing_approvals"]
    ) or "- 없음"
    failure_lines = "\n".join(f"- {item}" for item in result["failures"]) or "- 없음"
    blocker_lines = "\n".join(f"- {item}" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 1 Approval Intake Audit

## Outcome

- Status: `{result['status']}`
- Automated QA: `{result['automated_status']}`
- Workbook decisions received: `{result['workbook_decision_count']}/10`
- JSON approvals received: `{result['json_approval_count']}/10`
- Valid synchronized approvals: `{result['valid_approval_count']}/10`
- Rejects: `{result['reject_count']}`
- Unresolved patches: `{result['unresolved_patch_count']}`
- Immutable evidence drift: `{result['immutable_hash_drift_count']}`
- Ready for promotion: `{str(result['ready_for_promotion']).lower()}`
- Gate 2 allowed: `{str(result['next_gate_allowed']).lower()}`

이 감사는 승인 입력을 검증할 뿐 reviewer, decision, reviewed_at을 생성하거나 Gate를 자동 승격하지 않는다.

## Missing approvals

{missing_lines}

## Failures

{failure_lines}

## External blockers

{blocker_lines}

## Decision

`READY_FOR_PROMOTION`은 실제 승인 10개가 Excel과 JSON에 동일하게 존재하고, 자동 QA PASS, reject 0, unresolved patch 0, 불변 증거 해시 드리프트 0일 때만 가능하다. 현재 조건을 만족하지 않으면 Gate 1은 `BLOCKED` 상태를 유지하고 Gate 2를 시작하지 않는다.
""",
        encoding="utf-8",
    )


def main() -> int:
    snapshot = load_json(SNAPSHOT_PATH)
    manifest = load_json(MANIFEST_PATH)
    review = load_json(REVIEW_PATH)
    qa = load_json(QA_PATH)
    failures: list[str] = []
    blockers: list[str] = []

    if snapshot.get("mode") != "READ_ONLY_INSPECTION":
        failures.append("WORKBOOK_SNAPSHOT_NOT_READ_ONLY")
    if snapshot.get("formula_error_count") != 0:
        failures.append("WORKBOOK_FORMULA_ERROR")
    workbook_rows = snapshot.get("rows")
    if not isinstance(workbook_rows, list) or len(workbook_rows) != 10:
        failures.append("WORKBOOK_ROLE_MATRIX_ROW_COUNT_INVALID")
        workbook_rows = []

    expected_keys = {(character, role) for character in CHARACTERS for role in ROLES}
    workbook_keys = [key(row) for row in workbook_rows]
    if set(workbook_keys) != expected_keys or len(set(workbook_keys)) != 10:
        failures.append("WORKBOOK_ROLE_MATRIX_INVALID")

    candidates = {item.get("character"): item for item in manifest.get("candidates", [])}
    if set(candidates) != CHARACTERS:
        failures.append("FROZEN_CANDIDATE_SET_INVALID")

    immutable_hash_drift: list[str] = []
    for asset in manifest.get("evidence_assets", []):
        if asset.get("freeze_policy") != "IMMUTABLE_REVIEW_EVIDENCE":
            continue
        relative = text(asset.get("path"))
        path = ROOT / relative
        if not path.is_file() or sha256(path).lower() != text(asset.get("sha256")).lower():
            immutable_hash_drift.append(relative)
    if immutable_hash_drift:
        failures.append("IMMUTABLE_EVIDENCE_HASH_DRIFT")

    if qa.get("automated_status") != "PASS":
        failures.append("AUTOMATED_QA_NOT_PASS")
    if qa.get("next_gate_allowed") is not False:
        failures.append("PREMATURE_NEXT_GATE_PERMISSION")

    workbook_submitted = [row for row in workbook_rows if text(row.get("decision"))]
    workbook_by_key = {key(row): row for row in workbook_submitted}
    if len(workbook_by_key) != len(workbook_submitted):
        failures.append("DUPLICATE_WORKBOOK_APPROVAL")

    raw_json_approvals = review.get("manual_approvals", [])
    if not isinstance(raw_json_approvals, list):
        failures.append("JSON_APPROVALS_NOT_ARRAY")
        raw_json_approvals = []
    json_by_key = {key(row): row for row in raw_json_approvals if isinstance(row, dict)}
    if len(json_by_key) != len(raw_json_approvals):
        failures.append("DUPLICATE_OR_INVALID_JSON_APPROVAL")

    valid_keys: set[tuple[str, str]] = set()
    reject_count = 0
    unresolved_patch_count = 0
    for approval_key in sorted(set(workbook_by_key) | set(json_by_key)):
        workbook_row = workbook_by_key.get(approval_key)
        json_row = json_by_key.get(approval_key)
        label = f"{approval_key[0]} / {approval_key[1]}"
        if workbook_row is None or json_row is None:
            failures.append(f"APPROVAL_SYNC_MISMATCH: {label}")
            continue
        if approval_key not in expected_keys:
            failures.append(f"UNEXPECTED_APPROVAL_KEY: {label}")
            continue

        fields = ("character", "role", "reviewer", "decision", "reviewed_at", "evidence_hash", "comment")
        mismatched = [field for field in fields if text(workbook_row.get(field)) != text(json_row.get(field))]
        if mismatched:
            failures.append(f"APPROVAL_FIELD_MISMATCH: {label}: {', '.join(mismatched)}")
            continue

        decision = text(json_row.get("decision"))
        reviewer = text(json_row.get("reviewer"))
        reviewed_at = text(json_row.get("reviewed_at"))
        comment = text(json_row.get("comment"))
        evidence_hash = text(json_row.get("evidence_hash")).lower()
        if decision not in DECISIONS:
            failures.append(f"INVALID_DECISION: {label}")
            continue
        if not reviewer or not comment or not valid_timestamp(reviewed_at):
            failures.append(f"INCOMPLETE_ACCOUNTABLE_APPROVAL: {label}")
            continue
        expected_hash = text(candidates.get(approval_key[0], {}).get("sha256")).lower()
        if not expected_hash or evidence_hash != expected_hash:
            failures.append(f"APPROVAL_EVIDENCE_HASH_MISMATCH: {label}")
            continue
        if decision == "REJECT":
            reject_count += 1
            failures.append(f"REJECTED: {label}")
            continue
        if decision == "APPROVE_WITH_PATCH":
            if not text(json_row.get("patch_id")) or json_row.get("unresolved_patch") is not False:
                unresolved_patch_count += 1
                blockers.append(f"PATCH_UNRESOLVED: {label}")
                continue
        elif json_row.get("unresolved_patch") is True:
            unresolved_patch_count += 1
            blockers.append(f"PATCH_FLAG_UNRESOLVED: {label}")
            continue
        valid_keys.add(approval_key)

    missing_keys = sorted(expected_keys - valid_keys)
    missing_approvals = [
        {"character": character, "role": role} for character, role in missing_keys
    ]
    if not failures and missing_keys:
        blockers.append(f"ACCOUNTABLE_APPROVALS_MISSING: {len(missing_keys)}")

    ready = (
        not failures
        and not blockers
        and len(valid_keys) == 10
        and reject_count == 0
        and unresolved_patch_count == 0
        and not immutable_hash_drift
        and qa.get("automated_status") == "PASS"
    )
    if ready:
        status = "READY_FOR_PROMOTION"
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
        "automated_status": qa.get("automated_status"),
        "workbook_snapshot": str(SNAPSHOT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "workbook_sha256": snapshot.get("workbook_sha256"),
        "workbook_decision_count": len(workbook_submitted),
        "json_approval_count": len(raw_json_approvals),
        "valid_approval_count": len(valid_keys),
        "approval_required": 10,
        "reject_count": reject_count,
        "unresolved_patch_count": unresolved_patch_count,
        "immutable_hash_drift_count": len(immutable_hash_drift),
        "immutable_hash_drift": immutable_hash_drift,
        "missing_approvals": missing_approvals,
        "failures": failures,
        "blockers": blockers,
        "ready_for_promotion": ready,
        "gate1_status_change_applied": False,
        "next_gate_allowed": False,
        "next_action": (
            "Run a separately controlled Gate 1 promotion transaction."
            if ready
            else "Collect and synchronize only real accountable reviewer decisions."
        ),
    }
    write_outputs(result)

    print("GATE1_APPROVAL_INTAKE_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"workbook_decisions={len(workbook_submitted)}/10")
    print(f"json_approvals={len(raw_json_approvals)}/10")
    print(f"valid_approvals={len(valid_keys)}/10")
    print(f"immutable_hash_drift={len(immutable_hash_drift)}")
    print("gate1_status_change_applied=false")
    print("next_gate_allowed=false")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
