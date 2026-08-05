#!/usr/bin/env python3
"""Audit Stage 8 shaded-2D pet candidates without promoting a Gate."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs" / "stage8" / "evidence" / "2d-pet" / "v1.0"


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssertionError(f"invalid JSON {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise AssertionError(f"JSON root is not an object: {path.relative_to(ROOT)}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require_file(record: dict, key: str = "path") -> Path:
    path = ROOT / record.get(key, "")
    if not path.is_file():
        raise AssertionError(f"missing file: {record.get(key)!r}")
    return path


def main() -> int:
    failures: list[str] = []
    approved = False
    try:
        decision = load_json(EVIDENCE / "2D_STRATEGY_DECISION_v1.0.json")
        manifest = load_json(EVIDENCE / "2D_PET_ASSET_MANIFEST_v1.0.json")
        qa = load_json(EVIDENCE / "2D_PET_AUTOMATED_QA_v1.0.json")
        review = load_json(EVIDENCE / "2D_PET_MANUAL_REVIEW_v1.0.json")
        register = load_json(ROOT / "docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json")
        hf_qa = load_json(ROOT / "docs/stage8/evidence/gate2-high-fidelity/GATE2_HIGH_FIDELITY_AUTOMATED_QA_v2.0.json")
        hf_review = load_json(ROOT / "docs/stage8/evidence/gate2-high-fidelity/GATE2_HIGH_FIDELITY_MANUAL_REVIEW_v2.0.json")

        if decision.get("decision") != "ADOPT_SHADED_2D_PET_SYSTEM" or decision.get("status") != "ACTIVE":
            raise AssertionError("2D strategy decision is not active")
        if register.get("status") != "ACTIVE_SHADED_2D_PET_CANDIDATES":
            raise AssertionError("active character register does not select the shaded 2D strategy")
        if register.get("new_authored_3d_candidates", {}).get("status") != "SUPERSEDED_BY_2D_STRATEGY":
            raise AssertionError("authored 3D candidates are not superseded")
        if hf_qa.get("status") != "SUPERSEDED" or hf_qa.get("automated_status") != "PASS":
            raise AssertionError("3D QA history is not safely superseded")
        if hf_review.get("status") != "SUPERSEDED" or hf_review.get("decision") != "NOT_APPLICABLE":
            raise AssertionError("3D manual review is not safely superseded")

        sources = manifest.get("canonical_sources", {})
        if set(sources) != {"Chakchaki", "Gongsickyi"}:
            raise AssertionError("canonical source character matrix is incomplete")
        for character, record in sources.items():
            path = require_file(record)
            if sha256(path) != record.get("sha256", "").lower():
                raise AssertionError(f"canonical source hash mismatch: {character}")

        sheets = manifest.get("sheets", [])
        if len(sheets) != 2 or {item.get("character") for item in sheets} != {"Chakchaki", "Gongsickyi"}:
            raise AssertionError("pose-sheet character matrix is incomplete")
        for record in sheets:
            path = require_file(record)
            review_copy = require_file(record, "review_copy")
            actual_hash = sha256(path)
            if actual_hash != record.get("sha256", "").lower() or sha256(review_copy) != actual_hash:
                raise AssertionError(f"pose-sheet hash mismatch: {record.get('character')}")
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                if image.format != "PNG" or (image.width, image.height) != (
                    record.get("width"),
                    record.get("height"),
                ):
                    raise AssertionError(f"pose-sheet image metadata mismatch: {record.get('character')}")
            if record.get("expected_pose_count") != 8:
                raise AssertionError(f"pose count declaration mismatch: {record.get('character')}")

        pose_order = manifest.get("pose_order", [])
        if len(pose_order) != 8:
            raise AssertionError("pose-order count is not eight")
        if len({item.get("pose_id") for item in pose_order}) != 8:
            raise AssertionError("pose IDs are not unique")
        if len({item.get("state") for item in pose_order}) != 8:
            raise AssertionError("pose states are not unique")

        if qa.get("automated_status") != "PASS" or qa.get("files_passed") != 2 or qa.get("failures"):
            raise AssertionError("recorded 2D automated QA is not PASS")
        if review.get("status") == "PENDING":
            if review.get("decision") is not None:
                raise AssertionError("2D pending review contains a decision")
            if review.get("approval_applied") is not False or review.get("next_gate_allowed") is not False:
                raise AssertionError("2D pending review contains promotion flags")
        elif review.get("status") == "APPROVED":
            if review.get("decision") not in {"APPROVE", "APPROVE_WITH_PATCH"}:
                raise AssertionError("2D approved review has an invalid decision")
            if review.get("scope_acknowledged") is not True or not all(
                value is True for value in review.get("checks", {}).values()
            ):
                raise AssertionError("2D approved review has incomplete visual checks")
            if review.get("approval_applied") is not True or review.get("next_gate_allowed") is not True:
                raise AssertionError("2D approved review is missing promotion flags")
            approved = True
        else:
            raise AssertionError("2D manual review status is invalid")
    except AssertionError as exc:
        failures.append(str(exc))

    if failures:
        for failure in failures:
            print(f"2D_PET_AUDIT_FAIL: {failure}", file=sys.stderr)
        return 2

    print("2D_PET_AUTOMATED_QA_PASS")
    print("sheets=2/2")
    print("declared_poses=16/16")
    print(f"manual_approval={1 if approved else 0}/1")
    print(f"gate2={'VERIFIED' if approved else 'NOT_VERIFIED'}")
    if approved:
        print("2D_PET_AUDIT_VERIFIED")
        return 0
    print("2D_PET_AUDIT_BLOCKED_EXTERNAL: PROJECT_OWNER_2D_IDENTITY_AND_POSE_REVIEW_REQUIRED")
    return 1


if __name__ == "__main__":
    sys.exit(main())
