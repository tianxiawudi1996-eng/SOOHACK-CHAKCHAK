#!/usr/bin/env python3
"""Validate the active one-person Gate 1 approval policy without promoting the gate."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "docs/stage8/evidence/gate1"
SINGLE_ROOT = BASE / "single-approval"
POLICY_PATH = SINGLE_ROOT / "SINGLE_APPROVER_POLICY_v1.0.json"
DECISION_PATH = SINGLE_ROOT / "SINGLE_APPROVER_DECISION_v1.0.json"
MANIFEST_PATH = BASE / "manual-review/FROZEN_EVIDENCE_MANIFEST_v1.0.json"
QA_PATH = BASE / "Gate1_Automated_QA_v5.2.0.json"
OUTPUT_JSON = SINGLE_ROOT / "GATE1_SINGLE_APPROVER_AUDIT_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE1_SINGLE_APPROVER_AUDIT.md"


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"SINGLE_APPROVAL_FAIL: cannot load {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
        raise SystemExit(2)
    if not isinstance(value, dict):
        print(f"SINGLE_APPROVAL_FAIL: invalid JSON root: {path.relative_to(ROOT)}", file=sys.stderr)
        raise SystemExit(2)
    return value


def clean(value: object) -> str:
    return str(value or "").strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


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
    failures = "\n".join(f"- {item}" for item in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- {item}" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 1 Single Approver Audit

## Outcome

- Active policy: `{result['approval_mode']}`
- Status: `{result['status']}`
- Valid approval: `{result['valid_approval_count']}/1`
- Automated QA: `{result['automated_status']}`
- Candidate hash drift: `{result['candidate_hash_drift_count']}`
- Immutable evidence drift: `{result['immutable_hash_drift_count']}`
- Rejects: `{result['reject_count']}`
- Unresolved patches: `{result['unresolved_patch_count']}`
- Ready for promotion: `{str(result['ready_for_promotion']).lower()}`
- Gate status change applied: `{str(result['gate1_status_change_applied']).lower()}`
- Gate 2 allowed: `{str(result['next_gate_allowed']).lower()}`

기존 5역할×2캐릭터 승인 정책은 `SUPERSEDED_NON_GATING`이며 이 감사의 Gate 판정에 사용하지 않는다.

## Failures

{failures}

## Blockers

{blockers}

## Next action

{result['next_action']}
""",
        encoding="utf-8",
    )


def main() -> int:
    policy = load_json(POLICY_PATH)
    decision = load_json(DECISION_PATH)
    manifest = load_json(MANIFEST_PATH)
    qa = load_json(QA_PATH)
    failures: list[str] = []
    blockers: list[str] = []

    if policy.get("policy_status") != "ACTIVE":
        failures.append("SINGLE_APPROVER_POLICY_NOT_ACTIVE")
    if policy.get("approval_mode") != "PROJECT_OWNER_SINGLE_APPROVAL":
        failures.append("APPROVAL_MODE_INVALID")
    if policy.get("approval_required") != 1:
        failures.append("APPROVAL_REQUIRED_MUST_BE_ONE")
    legacy = policy.get("legacy_policy", {})
    if legacy.get("status") != "SUPERSEDED_NON_GATING" or legacy.get("approval_required") != 10:
        failures.append("LEGACY_POLICY_STATUS_INVALID")
    if decision.get("approval_mode") != policy.get("approval_mode"):
        failures.append("DECISION_POLICY_MISMATCH")

    expected_hashes = policy.get("candidate_hashes", {})
    decision_hashes = decision.get("candidate_hashes", {})
    manifest_candidates = {
        item.get("character"): item for item in manifest.get("candidates", [])
    }
    candidate_hash_drift: list[str] = []
    for character, expected in expected_hashes.items():
        candidate = manifest_candidates.get(character, {})
        path = ROOT / clean(candidate.get("path"))
        actual = sha256(path) if path.is_file() else ""
        if (
            clean(candidate.get("sha256")).lower() != clean(expected).lower()
            or clean(decision_hashes.get(character)).lower() != clean(expected).lower()
            or actual.lower() != clean(expected).lower()
        ):
            candidate_hash_drift.append(character)
    if candidate_hash_drift:
        failures.append("CANDIDATE_HASH_DRIFT")

    immutable_hash_drift: list[str] = []
    for asset in manifest.get("evidence_assets", []):
        if asset.get("freeze_policy") != "IMMUTABLE_REVIEW_EVIDENCE":
            continue
        relative = clean(asset.get("path"))
        path = ROOT / relative
        if not path.is_file() or sha256(path).lower() != clean(asset.get("sha256")).lower():
            immutable_hash_drift.append(relative)
    if immutable_hash_drift:
        failures.append("IMMUTABLE_EVIDENCE_HASH_DRIFT")
    if qa.get("automated_status") != "PASS":
        failures.append("AUTOMATED_QA_NOT_PASS")

    approver_name = clean(decision.get("approver_name"))
    reviewed_at = clean(decision.get("reviewed_at"))
    decision_value = clean(decision.get("decision"))
    fields_present = all((approver_name, decision_value, reviewed_at))
    valid_approval_count = 0
    reject_count = 0
    unresolved_patch_count = 0
    approval_applied = decision.get("approval_applied") is True
    decision_allows_next = decision.get("next_gate_allowed") is True
    if approval_applied != decision_allows_next:
        failures.append("PROMOTION_FLAGS_INCONSISTENT")

    if not fields_present or decision.get("scope_acknowledged") is not True:
        blockers.append("SINGLE_PROJECT_OWNER_DECISION_MISSING")
    else:
        if not valid_timestamp(reviewed_at):
            failures.append("REVIEWED_AT_INVALID")
        if decision_value not in policy.get("allowed_decisions", []):
            failures.append("DECISION_INVALID")
        elif decision_value == "REJECT":
            reject_count = 1
            failures.append("SINGLE_APPROVER_REJECTED_GATE1")
        elif decision_value == "APPROVE_WITH_PATCH":
            if not clean(decision.get("patch_id")) or decision.get("unresolved_patch") is not False:
                unresolved_patch_count = 1
                blockers.append("SINGLE_APPROVER_PATCH_UNRESOLVED")
            elif not failures:
                valid_approval_count = 1
        elif decision_value == "APPROVE" and not failures:
            valid_approval_count = 1

    ready = (
        not failures
        and not blockers
        and valid_approval_count == 1
        and qa.get("automated_status") == "PASS"
        and not candidate_hash_drift
        and not immutable_hash_drift
    )
    promotion_recorded = ready and approval_applied and decision_allows_next
    if promotion_recorded:
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
        "gate": 1,
        "approval_mode": policy.get("approval_mode"),
        "status": status,
        "policy_sha256": sha256(POLICY_PATH),
        "decision_sha256": sha256(DECISION_PATH),
        "valid_approval_count": valid_approval_count,
        "approval_required": 1,
        "automated_status": qa.get("automated_status"),
        "candidate_hash_drift_count": len(candidate_hash_drift),
        "candidate_hash_drift": candidate_hash_drift,
        "immutable_hash_drift_count": len(immutable_hash_drift),
        "immutable_hash_drift": immutable_hash_drift,
        "reject_count": reject_count,
        "unresolved_patch_count": unresolved_patch_count,
        "failures": failures,
        "blockers": blockers,
        "ready_for_promotion": ready,
        "gate1_status_change_applied": promotion_recorded,
        "next_gate_allowed": promotion_recorded,
        "next_action": (
            "Gate 2 작업을 시작할 수 있다."
            if promotion_recorded
            else (
                "별도 Gate 1 승격 트랜잭션을 실행한다."
                if ready
                else "권한 있는 프로젝트 책임자의 단일 결정을 입력한다."
            )
        ),
    }
    write_outputs(result)

    print("GATE1_SINGLE_APPROVER_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"valid_approval={valid_approval_count}/1")
    print(f"automated_status={qa.get('automated_status')}")
    print(f"candidate_hash_drift={len(candidate_hash_drift)}")
    print(f"immutable_hash_drift={len(immutable_hash_drift)}")
    print(f"gate1_status_change_applied={str(promotion_recorded).lower()}")
    print(f"next_gate_allowed={str(promotion_recorded).lower()}")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
