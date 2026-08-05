#!/usr/bin/env python3
"""Validate the one-person Gate 2 shaded-2D approval without creating it."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PET_ROOT = ROOT / "docs/stage8/evidence/2d-pet/v1.0"
POLICY_PATH = PET_ROOT / "2D_PET_SINGLE_APPROVER_POLICY_v1.0.json"
REVIEW_PATH = PET_ROOT / "2D_PET_MANUAL_REVIEW_v1.0.json"
MANIFEST_PATH = PET_ROOT / "2D_PET_ASSET_MANIFEST_v1.0.json"
QA_PATH = PET_ROOT / "2D_PET_AUTOMATED_QA_v1.0.json"
AUTHORITY_PATH = ROOT / "docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_DECISION_v1.0.json"
STATUS_PATH = ROOT / "harness/status.json"
OUTPUT_JSON = PET_ROOT / "2D_PET_SINGLE_APPROVER_AUDIT_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/2D_PET_SINGLE_APPROVER_AUDIT.md"


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"2D_SINGLE_APPROVAL_FAIL: cannot load {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
        raise SystemExit(2)
    if not isinstance(value, dict):
        print(f"2D_SINGLE_APPROVAL_FAIL: JSON root must be an object: {path.relative_to(ROOT)}", file=sys.stderr)
        raise SystemExit(2)
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


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
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failures = "\n".join(f"- `{item}`" for item in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- `{item}`" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 2 음영 2D 1인 승인 감사

## 결과

- 상태: `{result['status']}`
- 승인 방식: `{result['approval_mode']}`
- 유효 승인: `{result['valid_approval_count']}/1`
- 자동 QA: `{result['automated_status']}`
- 후보 해시 변동: `{result['candidate_hash_drift_count']}`
- 필수 체크 통과: `{result['required_checks_true_count']}/{result['required_checks_count']}`
- 승격 준비: `{str(result['ready_for_promotion']).lower()}`
- Gate 2 승격 적용: `{str(result['gate2_status_change_applied']).lower()}`
- Gate 3 진입 허용: `{str(result['next_gate_allowed']).lower()}`

## 실패

{failures}

## 차단

{blockers}

## 다음 작업

{result['next_action']}
""",
        encoding="utf-8",
    )


def main() -> int:
    policy = load_json(POLICY_PATH)
    review = load_json(REVIEW_PATH)
    manifest = load_json(MANIFEST_PATH)
    qa = load_json(QA_PATH)
    authority = load_json(AUTHORITY_PATH)
    harness = load_json(STATUS_PATH)
    failures: list[str] = []
    blockers: list[str] = []

    if policy.get("policy_status") != "ACTIVE":
        failures.append("SINGLE_APPROVER_POLICY_NOT_ACTIVE")
    if policy.get("approval_mode") != "PROJECT_OWNER_SINGLE_APPROVAL" or policy.get("approval_required") != 1:
        failures.append("SINGLE_APPROVER_POLICY_INVALID")
    if review.get("review_mode") != policy.get("approval_mode"):
        failures.append("REVIEW_POLICY_MISMATCH")
    if authority.get("status") != "APPROVED" or authority.get("decision") != "APPROVE":
        failures.append("APPROVER_AUTHORITY_NOT_APPROVED")
    if clean(authority.get("approver_name")) != clean(policy.get("approver_name")):
        failures.append("APPROVER_AUTHORITY_NAME_MISMATCH")
    if policy.get("approver_authority_source") != AUTHORITY_PATH.relative_to(ROOT).as_posix():
        failures.append("APPROVER_AUTHORITY_SOURCE_MISMATCH")
    if qa.get("automated_status") != "PASS" or qa.get("failures"):
        failures.append("AUTOMATED_QA_NOT_PASS")

    expected_hashes = policy.get("candidate_sheet_hashes", {})
    review_hashes = review.get("candidate_sheet_hashes", {})
    manifest_sheets = {item.get("character"): item for item in manifest.get("sheets", [])}
    candidate_hash_drift: list[str] = []
    for character in ("Chakchaki", "Gongsickyi"):
        expected = clean(expected_hashes.get(character)).lower()
        recorded = clean(review_hashes.get(character)).lower()
        item = manifest_sheets.get(character, {})
        manifest_hash = clean(item.get("sha256")).lower()
        path = ROOT / clean(item.get("path"))
        actual_hash = sha256(path).lower() if path.is_file() else ""
        if not expected or len({expected, recorded, manifest_hash, actual_hash}) != 1:
            candidate_hash_drift.append(character)
    if candidate_hash_drift:
        failures.append("CANDIDATE_SHEET_HASH_DRIFT")

    required_checks = policy.get("required_checks", [])
    review_checks = review.get("checks", {})
    true_checks = [name for name in required_checks if review_checks.get(name) is True]
    invalid_check_names = sorted(set(review_checks) ^ set(required_checks))
    if invalid_check_names:
        failures.append("REQUIRED_CHECK_MATRIX_MISMATCH")

    reviewer = clean(review.get("reviewer"))
    decision = clean(review.get("decision"))
    reviewed_at = clean(review.get("reviewed_at"))
    scope_acknowledged = review.get("scope_acknowledged") is True
    fields_present = bool(reviewer and decision and reviewed_at and scope_acknowledged)
    valid_approval_count = 0
    reject_count = 0
    unresolved_patch_count = 0

    if not fields_present:
        blockers.append("PROJECT_OWNER_2D_DECISION_MISSING")
    else:
        if reviewer != clean(policy.get("approver_name")):
            failures.append("REVIEWER_NOT_AUTHORIZED")
        if not valid_timestamp(reviewed_at):
            failures.append("REVIEWED_AT_INVALID")
        if decision not in policy.get("allowed_decisions", []):
            failures.append("DECISION_INVALID")
        elif decision == "REJECT":
            reject_count = 1
            failures.append("PROJECT_OWNER_REJECTED_GATE2_2D_CANDIDATES")
        elif decision == "APPROVE_WITH_PATCH":
            if not clean(review.get("patch_id")) or review.get("unresolved_patch") is not False:
                unresolved_patch_count = 1
                blockers.append("APPROVAL_PATCH_UNRESOLVED")
            elif len(true_checks) != len(required_checks):
                blockers.append("REQUIRED_VISUAL_CHECKS_INCOMPLETE")
            elif not failures:
                valid_approval_count = 1
        elif decision == "APPROVE":
            if len(true_checks) != len(required_checks):
                blockers.append("REQUIRED_VISUAL_CHECKS_INCOMPLETE")
            elif not failures:
                valid_approval_count = 1

    ready = (
        not failures
        and not blockers
        and valid_approval_count == 1
        and qa.get("automated_status") == "PASS"
        and not candidate_hash_drift
        and len(true_checks) == len(required_checks)
    )
    gate2 = harness.get("gate2", {})
    gate3 = harness.get("gate3", {})
    promotion_flags = (
        review.get("status") == "APPROVED"
        and review.get("approval_applied") is True
        and review.get("next_gate_allowed") is True
        and gate2.get("status") == "VERIFIED"
        and gate2.get("blockers") == []
        and gate3.get("entry_allowed") is True
    )
    if promotion_flags and not ready:
        failures.append("PROMOTION_RECORDED_WITHOUT_VALID_APPROVAL")
        ready = False
    if ready and promotion_flags:
        status = "PROMOTED"
    elif ready:
        status = "READY_FOR_PROMOTION"
    elif failures:
        status = "FAIL"
    else:
        status = "BLOCKED_EXTERNAL"

    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 2,
        "approval_mode": policy.get("approval_mode"),
        "status": status,
        "policy_sha256": sha256(POLICY_PATH),
        "review_sha256": sha256(REVIEW_PATH),
        "manifest_sha256": sha256(MANIFEST_PATH),
        "valid_approval_count": valid_approval_count,
        "approval_required": 1,
        "automated_status": qa.get("automated_status"),
        "candidate_hash_drift_count": len(candidate_hash_drift),
        "candidate_hash_drift": candidate_hash_drift,
        "required_checks_true_count": len(true_checks),
        "required_checks_count": len(required_checks),
        "reject_count": reject_count,
        "unresolved_patch_count": unresolved_patch_count,
        "failures": failures,
        "blockers": blockers,
        "ready_for_promotion": ready,
        "gate2_status_change_applied": ready and promotion_flags,
        "next_gate_allowed": ready and promotion_flags,
        "next_action": (
            "Gate 3 개별 포즈 추출 작업을 시작할 수 있습니다."
            if ready and promotion_flags
            else (
                "Gate 2 상태와 Gate 3 진입 플래그를 승격한 뒤 감사를 다시 실행합니다."
                if ready
                else "제품 책임자가 비교 페이지의 두 시트를 검토하고 명시적 결정을 입력해야 합니다."
            )
        ),
    }
    write_outputs(result)

    print("GATE2_2D_SINGLE_APPROVER_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"valid_approval={valid_approval_count}/1")
    print(f"required_checks={len(true_checks)}/{len(required_checks)}")
    print(f"candidate_hash_drift={len(candidate_hash_drift)}")
    print(f"gate2_status_change_applied={str(ready and promotion_flags).lower()}")
    print(f"next_gate_allowed={str(ready and promotion_flags).lower()}")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
