#!/usr/bin/env python3
"""Validate the evidence-gated Stage 8 harness without changing project files."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS = ROOT / "harness" / "status.json"
MANIFEST = ROOT / "harness" / "ssot-manifest.json"
ALLOWED = {"NOT_STARTED", "IN_PROGRESS", "BLOCKED", "NOT_VERIFIED", "VERIFIED"}
SENSITIVE_NAME_RE = re.compile(r"(?:recovery[-_ ]?codes|id_rsa|private[-_ ]?key)", re.I)
REQUIRED_STAGE7 = [
    "MathChakChak_Stage7_SSOT_v1.0.xlsx",
    "MathChakChak_Stage7_SSOT_v1.0.md",
    "Component_Inventory_v1.0.xlsx",
    "Gongsickyi_Character_Bible_v1.0.md",
    "Chakchaki_Character_Bible_v1.0.md",
    "Character_Module_Rig_Spec_v1.0.xlsx",
    "Expression_Motion_Bubble_Library_v1.0.xlsx",
    "Stage8_Handoff_Manifest_v1.0.md",
    "Chakchaki_Approved_Reference_v1.0.png",
    "Gongsickyi_Approved_Reference_v1.0.png",
]
REQUIRED_STRUCTURE = [
    ".github/workflows/stage8-harness.yml",
    "README.md",
    "harness/README.md",
    "harness/status.json",
    "harness/ssot-manifest.json",
    "scripts/harness/audit_stage8.py",
    "scripts/harness/audit_gate1.py",
    "scripts/harness/build_gate1_evidence.py",
    "scripts/harness/prepare_gate1_manual_review.py",
    "scripts/harness/audit_gate1_approval_intake.py",
    "scripts/harness/audit_gate1_reviewer_assignment.py",
    "scripts/harness/audit_gate1_external_unblock.py",
    "scripts/harness/audit_gate1_single_approval.py",
    "scripts/harness/inspect_stage7_rig_spec.mjs",
    "scripts/harness/build_gate2_base_mesh.py",
    "scripts/harness/audit_gate2.py",
    "scripts/harness/build_gate3_rig.py",
    "scripts/harness/audit_gate3.py",
    "scripts/harness/audit_gate2_high_fidelity.py",
    "scripts/harness/audit_2d_pet_assets.py",
    "scripts/blender/build_stage8_high_fidelity_characters.py",
    "scripts/harness/validate_harness.py",
    "docs/stage8/00_MASTER_PLAN.md",
    "docs/stage8/CHANGELOG.md",
    "docs/stage8/audits/WORKSPACE_BASELINE.md",
    "docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.md",
    "docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.json",
    "docs/stage8/audits/STAGE1_TO_STAGE7_TRACEABILITY_AUDIT.md",
    "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.md",
    "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.json",
    "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md",
    "docs/stage8/audits/GATE1_CANONICAL_VIEW_AUDIT.md",
    "docs/stage8/audits/GATE1_AUTOMATED_QA.md",
    "docs/stage8/audits/GATE1_MANUAL_REVIEW_PREFLIGHT.md",
    "docs/stage8/audits/GATE1_APPROVAL_INTAKE_AUDIT.md",
    "docs/stage8/audits/GATE1_REVIEWER_ASSIGNMENT_AUDIT.md",
    "docs/stage8/audits/GATE1_EXTERNAL_UNBLOCK_AUDIT.md",
    "docs/stage8/audits/GATE1_SINGLE_APPROVER_AUDIT.md",
    "docs/stage8/audits/GATE2_BASE_MESH_MATERIAL_AUDIT.md",
    "docs/stage8/audits/GATE3_RIG_BLENDSHAPE_AUDIT.md",
    "docs/stage8/audits/CHARACTER_IDENTITY_CORRECTION_AUDIT.md",
    "docs/stage8/audits/NEXT_PART_METAPROMPT_REPORT.md",
    "docs/stage8/audits/TEST_EXECUTION_REPORT.md",
    "docs/stage8/audits/FINAL_EXECUTION_REPORT.md",
    "docs/stage8/evidence/gate0/gate0-decision.json",
    "docs/stage8/evidence/gate0/manual-review.json",
    "docs/stage8/evidence/gate1/candidate-review.json",
    "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json",
    "docs/stage8/evidence/gate1/Gate1_Character_Consistency_Report_v5.2.0.md",
    "docs/stage8/evidence/gate1/Gate1_Change_Log_v5.2.0.md",
    "docs/stage8/evidence/gate1/SHA256SUMS.txt",
    "docs/stage8/evidence/gate1/manual-review/approval-workbook-preflight.json",
    "docs/stage8/evidence/gate1/manual-review/approval-workbook-current.json",
    "docs/stage8/evidence/gate1/manual-review/FROZEN_EVIDENCE_MANIFEST_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/APPROVAL_INTAKE_TEMPLATE.json",
    "docs/stage8/evidence/gate1/manual-review/GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/REVIEWER_ASSIGNMENT_REGISTER_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/COORDINATOR_ACTION_REQUEST.md",
    "docs/stage8/evidence/gate1/manual-review/COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/GATE1_EXTERNAL_UNBLOCK_AUDIT_v1.0.json",
    "docs/stage8/evidence/gate1/manual-review/README.md",
    "docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_POLICY_v1.0.json",
    "docs/stage8/evidence/gate1/single-approval/SINGLE_APPROVER_DECISION_v1.0.json",
    "docs/stage8/evidence/gate1/single-approval/GATE1_SINGLE_APPROVER_AUDIT_v1.0.json",
    "docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json",
    "docs/stage8/evidence/gate2/GATE2_BUILD_MANIFEST_v1.0.json",
    "docs/stage8/evidence/gate2/GATE2_AUTOMATED_QA_v1.0.json",
    "docs/stage8/evidence/gate2/GATE2_MANUAL_REVIEW_v1.0.json",
    "docs/stage8/evidence/gate2/GATE2_BASE_MESH_MATERIAL_REPORT_v1.0.md",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate2-previews/Chakchaki_Canonical_vs_LOD0.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate2-previews/Chakchaki_LOD_Comparison.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate2-previews/Gongsickyi_Canonical_vs_LOD0.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate2-previews/Gongsickyi_LOD_Comparison.png",
    "docs/stage8/evidence/gate3/GATE3_BUILD_MANIFEST_v1.0.json",
    "docs/stage8/evidence/gate3/GATE3_AUTOMATED_QA_v1.0.json",
    "docs/stage8/evidence/gate3/GATE3_MANUAL_REVIEW_v1.0.json",
    "docs/stage8/evidence/gate3/GATE3_RIG_BLENDSHAPE_REPORT_v1.0.md",
    "docs/stage8/evidence/gate2-high-fidelity/GATE2_HIGH_FIDELITY_AUTOMATED_QA_v2.0.json",
    "docs/stage8/evidence/gate2-high-fidelity/GATE2_HIGH_FIDELITY_MANUAL_REVIEW_v2.0.json",
    "docs/stage8/evidence/gate2-high-fidelity/GATE2_HIGH_FIDELITY_REPORT_v2.0.md",
    "docs/stage8/evidence/gate2-high-fidelity/review/Chakchaki_Canonical_vs_HighFidelity_v2.0.png",
    "docs/stage8/evidence/gate2-high-fidelity/review/Gongsickyi_Canonical_vs_HighFidelity_v2.0.png",
    "docs/stage8/evidence/2d-pet/v1.0/2D_STRATEGY_DECISION_v1.0.json",
    "docs/stage8/evidence/2d-pet/v1.0/2D_PET_ASSET_MANIFEST_v1.0.json",
    "docs/stage8/evidence/2d-pet/v1.0/2D_PET_AUTOMATED_QA_v1.0.json",
    "docs/stage8/evidence/2d-pet/v1.0/2D_PET_MANUAL_REVIEW_v1.0.json",
    "docs/stage8/evidence/2d-pet/v1.0/GENERATION_RECORD_v1.0.md",
    "docs/stage8/evidence/2d-pet/v1.0/review/index.html",
    "docs/stage8/evidence/2d-pet/v1.0/review/Chakchaki_Shaded2D_PoseSheet_Candidate_v1.0.png",
    "docs/stage8/evidence/2d-pet/v1.0/review/Gongsickyi_Shaded2D_PoseSheet_Candidate_v1.0.png",
    "docs/stage8/audits/2D_PET_TRANSITION_AUDIT.md",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Chakchaki_Rig_Skeleton.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Chakchaki_Deformation_Review.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Chakchaki_Pose_Socket_Review.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Gongsickyi_Rig_Skeleton.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Gongsickyi_Deformation_Review.png",
    "docs/stage8/evidence/rejected/procedural-low-fidelity/gate3-previews/Gongsickyi_Pose_Socket_Review.png",
    "docs/stage8/evidence/gate1/manual-review/dispatch/character_art_lead.md",
    "docs/stage8/evidence/gate1/manual-review/dispatch/3d_technical_art_lead.md",
    "docs/stage8/evidence/gate1/manual-review/dispatch/ux_brand_system_lead.md",
    "docs/stage8/evidence/gate1/manual-review/dispatch/qa_lead.md",
    "docs/stage8/evidence/gate1/manual-review/dispatch/product_owner.md",
    "docs/stage8/prompts/GATE1_QA_APPROVAL_PACKAGE_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE1_MANUAL_REVIEW_AND_APPROVAL_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE1_APPROVAL_INTAKE_VALIDATION_AND_PROMOTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE1_REVIEWER_ASSIGNMENT_AND_DISPATCH_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE1_EXTERNAL_REVIEW_UNBLOCK_HANDOFF_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE1_SINGLE_APPROVER_DECISION_AND_PROMOTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE2_BASE_MESH_MATERIAL_EXECUTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE2_SINGLE_APPROVER_DECISION_AND_PROMOTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE3_RIG_BLENDSHAPE_EXECUTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/CHARACTER_IDENTITY_CORRECTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE2_HIGH_FIDELITY_CHARACTER_PRODUCTION_METAPROMPT_v2.0.md",
    "docs/stage8/prompts/STAGE8_2D_SHADED_PET_SYSTEM_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE3_2D_POSE_LAYER_EXECUTION_METAPROMPT_v1.0.md",
    "docs/stage8/prompts/GATE4_2D_PET_MOTION_EXECUTION_METAPROMPT_v1.0.md",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/BUILD_RECORD_v2.0.json",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/source/Chakchaki_HighFidelity_v2.0.blend",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/source/Gongsickyi_HighFidelity_v2.0.blend",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_chakchaki_lod0_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_chakchaki_lod1_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_chakchaki_lod2_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_gongsickyi_lod0_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_gongsickyi_lod1_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/glb/char_gongsickyi_lod2_v200.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_chakchaki_lod0_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_chakchaki_lod1_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_chakchaki_lod2_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_gongsickyi_lod0_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_gongsickyi_lod1_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate2/char_gongsickyi_lod2_v100.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_chakchaki_lod0_v110.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_chakchaki_lod1_v110.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_chakchaki_lod2_v110.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_gongsickyi_lod0_v110.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_gongsickyi_lod1_v110.glb",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/rejected/procedural-low-fidelity/gate3/char_gongsickyi_lod2_v110.glb",
]

MANUAL_REVIEW_ROLES = {
    "character_art_lead": "Character Art Lead",
    "3d_technical_art_lead": "3D Technical Art Lead",
    "ux_brand_system_lead": "UX Brand System Lead",
    "qa_lead": "QA Lead",
    "product_owner": "Product Owner",
}
MANUAL_REVIEW_CHARACTERS = {"Chakchaki", "Gongsickyi"}

CANONICAL_GATE_PROMPTS = [
    "GATE0_SSOT_AUDIT.md",
    "GATE1_CANONICAL_VIEW.md",
    "GATE2_BASE_MESH_MATERIAL.md",
    "GATE3_RIG_BLENDSHAPE.md",
    "GATE4_MOTION.md",
    "GATE5_AI_BEHAVIOR.md",
    "GATE6_PRODUCT_INTEGRATION.md",
    "GATE7_QA.md",
    "GATE8_DEPLOYMENT.md",
]


def fail(message: str) -> None:
    print(f"HARNESS_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    if not path.exists():
        fail(f"missing {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
    if not isinstance(value, dict):
        fail(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return value


def markdown_broken_links(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    broken: list[str] = []
    for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
        target = target.strip().strip("<>")
        if not target or target.startswith("#") or re.match(r"^[a-z][a-z0-9+.-]*://", target, re.I):
            continue
        target_path = target.split("#", 1)[0]
        if not target_path:
            continue
        if not (path.parent / target_path).resolve().exists():
            broken.append(target)
    return broken


def main() -> int:
    missing_structure = [item for item in REQUIRED_STRUCTURE if not (ROOT / item).exists()]
    if missing_structure:
        fail("missing required harness files: " + ", ".join(missing_structure))

    data = load_json(STATUS)
    manifest = load_json(MANIFEST)
    if data.get("project") != "SOOHACK-CHAKCHAK":
        fail("unexpected project identifier")
    if data.get("stage") != 8:
        fail("stage must be 8")
    gates = [data.get(f"gate{i}") for i in range(9)]
    if any(not isinstance(gate, dict) for gate in gates):
        fail("status.json must contain gate0 through gate8 objects")
    for index, gate in enumerate(gates):
        status = gate.get("status")
        if status not in ALLOWED:
            fail(f"gate{index} has unsupported status {status!r}")
        if not isinstance(gate.get("evidence"), list) or not isinstance(gate.get("blockers"), list):
            fail(f"gate{index} evidence and blockers must be arrays")
        for evidence in gate["evidence"]:
            path = ROOT / evidence
            if not path.exists():
                fail(f"gate{index} evidence does not exist: {evidence}")
        if status == "VERIFIED" and gate["blockers"]:
            fail(f"gate{index} VERIFIED with blockers")
        if status == "VERIFIED" and not gate["evidence"]:
            fail(f"gate{index} VERIFIED without evidence")
        if index > 0 and status == "VERIFIED" and gates[index - 1].get("status") != "VERIFIED":
            fail(f"gate{index} VERIFIED while gate{index - 1} is not VERIFIED")
    for index in range(1, 9):
        if gates[index].get("entry_allowed") is True and gates[index - 1].get("status") != "VERIFIED":
            fail(f"gate{index} entry_allowed=true while gate{index - 1} is not VERIFIED")

    required_files = manifest.get("required_files")
    if not isinstance(required_files, list) or len(required_files) != 10:
        fail("ssot-manifest.json must contain the 10 required Stage 7 records")
    records_by_name = {record.get("file_name"): record for record in required_files}
    if set(records_by_name) != set(REQUIRED_STAGE7):
        fail("ssot-manifest.json Stage 7 file names do not match the required 10")
    missing_exact = [
        name for name in REQUIRED_STAGE7
        if records_by_name[name].get("status") == "MISSING_EXACT"
    ]
    conflicts = [
        name for name in REQUIRED_STAGE7
        if records_by_name[name].get("status") == "CONFLICT_MULTIPLE_EXACT"
    ]
    for record in required_files:
        record_status = record.get("status", "")
        if record_status in {"MISSING_EXACT", "CONFLICT_MULTIPLE_EXACT"}:
            continue
        if not record_status.startswith("FOUND_EXACT"):
            fail(f"unsupported Stage 7 manifest status for {record.get('file_name')}: {record.get('status')}")
        for match in record.get("exact_matches", []):
            path = ROOT / match["path"]
            if not path.exists():
                fail(f"manifest path missing: {match['path']}")
            expected = match.get("sha256")
            if expected:
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if digest.lower() != expected.lower():
                    fail(f"manifest SHA-256 mismatch: {match['path']}")
        canonical = ROOT / "ssot" / "stage7" / "v1.0" / record["file_name"]
        if not canonical.exists():
            fail(f"required Stage 7 original is not in canonical SSOT: {canonical.relative_to(ROOT)}")
        canonical_hash = hashlib.sha256(canonical.read_bytes()).hexdigest().lower()
        recorded_hashes = {
            match.get("sha256", "").lower()
            for match in record.get("exact_matches", [])
            if match.get("sha256")
        }
        if canonical_hash not in recorded_hashes:
            fail(f"canonical Stage 7 SHA-256 is not recorded: {canonical.relative_to(ROOT)}")

    tracked: set[str] = set()
    if (ROOT / ".git").exists():
        proc = subprocess.run(
            ["git", "ls-files", "-z"],
            cwd=ROOT,
            check=False,
            capture_output=True,
        )
        if proc.returncode != 0:
            fail("unable to inspect Git-tracked files for sensitive names")
        tracked = {
            item.decode("utf-8", errors="surrogateescape").replace("\\", "/")
            for item in proc.stdout.split(b"\0")
            if item
        }
    sensitive_warnings: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or not SENSITIVE_NAME_RE.search(path.name):
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative in tracked or relative.startswith("ssot/stage7/v1.0/"):
            fail(f"sensitive-looking file is tracked or stored in canonical SSOT: {relative}")
        sensitive_warnings.append(relative)

    prompts = [ROOT / "docs" / "stage8" / "prompts" / name for name in CANONICAL_GATE_PROMPTS]
    if any(not prompt.is_file() for prompt in prompts):
        fail("one or more canonical Gate 0-8 prompts are missing")
    for prompt in prompts:
        text = prompt.read_text(encoding="utf-8")
        for required in ("역할", "선행 조건", "필수 산출물", "자동 검증", "수동 검증", "중단 조건", "다음 Gate"):
            if required not in text:
                fail(f"prompt missing required section {required!r}: {prompt.relative_to(ROOT)}")

    for path in ROOT.rglob("*.json"):
        if ".git" not in path.parts:
            load_json(path)

    broken_links: list[str] = []
    for path in ROOT.rglob("*.md"):
        if ".git" in path.parts:
            continue
        broken_links.extend(f"{path.relative_to(ROOT)} -> {target}" for target in markdown_broken_links(path))
    if broken_links:
        fail("broken Markdown links: " + "; ".join(broken_links[:20]))

    canonical_images = list((ROOT / "ssot" / "stage7" / "v1.0").glob("*.png"))
    unexpected_images = [
        path.name for path in canonical_images
        if path.name not in {
            "Chakchaki_Approved_Reference_v1.0.png",
            "Gongsickyi_Approved_Reference_v1.0.png",
        }
    ]
    if unexpected_images:
        fail("exploratory images mixed into canonical SSOT: " + ", ".join(unexpected_images))

    id_audit = load_json(ROOT / "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.json")
    id_counts = id_audit.get("id_counts", {})
    missing_src = [f"SRC-0{index}" for index in range(1, 7) if f"SRC-0{index}" not in id_counts]
    if missing_src:
        fail("missing SRC identifiers in cross-reference audit: " + ", ".join(missing_src))
    semantics = id_audit.get("semantic_presence", {})
    if not semantics.get("progress_bubble_type_happy_state"):
        fail("Progress = Bubble Type / Happy State linkage is not evidenced")
    if not semantics.get("welcome_greet_connection"):
        fail("Welcome State = Greet Clip linkage is not evidenced")

    if not (ROOT / "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md").exists():
        fail("Gate 0 audit report is missing")
    if gates[0].get("status") == "VERIFIED":
        report = (ROOT / "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md").read_text(encoding="utf-8")
        if "Gate 0 상태: `VERIFIED`" not in report:
            fail("gate0 status and report disagree")
        if manifest.get("status") != "VERIFIED":
            fail("gate0 is VERIFIED but SSOT manifest is not VERIFIED")
        manual_review = load_json(ROOT / "docs/stage8/evidence/gate0/manual-review.json")
        if manual_review.get("status") != "VERIFIED" or manual_review.get("blockers"):
            fail("gate0 manual review is not VERIFIED or still has blockers")
        reviewed_hashes = manual_review.get("canonical_sha256", {})
        for name in REQUIRED_STAGE7:
            canonical = ROOT / "ssot" / "stage7" / "v1.0" / name
            actual = hashlib.sha256(canonical.read_bytes()).hexdigest().lower()
            if reviewed_hashes.get(name, "").lower() != actual:
                fail(f"gate0 manual review SHA-256 mismatch: {name}")
        checks = manual_review.get("checks", {})
        if not checks or not all(value is True for value in checks.values()):
            fail("gate0 manual review checks are incomplete")

    if gates[1].get("status") != "NOT_STARTED":
        gate1_review = load_json(ROOT / "docs/stage8/evidence/gate1/candidate-review.json")
        gate1_qa = load_json(ROOT / "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json")
        single_root = ROOT / "docs/stage8/evidence/gate1/single-approval"
        single_policy = load_json(single_root / "SINGLE_APPROVER_POLICY_v1.0.json")
        single_decision = load_json(single_root / "SINGLE_APPROVER_DECISION_v1.0.json")
        single_audit = load_json(single_root / "GATE1_SINGLE_APPROVER_AUDIT_v1.0.json")
        manual_root = ROOT / "docs/stage8/evidence/gate1/manual-review"
        workbook_preflight = load_json(manual_root / "approval-workbook-preflight.json")
        workbook_current = load_json(manual_root / "approval-workbook-current.json")
        frozen_manifest = load_json(manual_root / "FROZEN_EVIDENCE_MANIFEST_v1.0.json")
        intake_template = load_json(manual_root / "APPROVAL_INTAKE_TEMPLATE.json")
        approval_intake_audit = load_json(manual_root / "GATE1_APPROVAL_INTAKE_AUDIT_v1.0.json")
        assignment_register = load_json(manual_root / "REVIEWER_ASSIGNMENT_REGISTER_v1.0.json")
        assignment_audit = load_json(manual_root / "GATE1_REVIEWER_ASSIGNMENT_AUDIT_v1.0.json")
        nomination_response = load_json(manual_root / "COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json")
        external_unblock_audit = load_json(manual_root / "GATE1_EXTERNAL_UNBLOCK_AUDIT_v1.0.json")
        for candidate in gate1_review.get("candidates", []):
            candidate_path = ROOT / candidate.get("path", "")
            if not candidate_path.exists():
                fail(f"gate1 candidate is missing: {candidate.get('path')}")
            actual = hashlib.sha256(candidate_path.read_bytes()).hexdigest().lower()
            if actual != candidate.get("sha256", "").lower():
                fail(f"gate1 candidate SHA-256 mismatch: {candidate.get('path')}")
        if gate1_review.get("next_gate_allowed") is True and gates[1].get("status") != "VERIFIED":
            fail("gate1 review allows next gate while gate1 is not VERIFIED")
        if gate1_qa.get("next_gate_allowed") is True and gates[1].get("status") != "VERIFIED":
            fail("gate1 automated QA allows next gate while gate1 is not VERIFIED")
        if gate1_qa.get("automated_status") != "PASS":
            fail("gate1 delivery package does not pass automated QA")
        if gate1_qa.get("approval_mode") != "PROJECT_OWNER_SINGLE_APPROVAL":
            fail("gate1 automated QA does not use the active single-approver policy")
        if gate1_qa.get("manual_approval_required") != 1:
            fail("gate1 automated QA must require exactly one package approval")
        if gate1_qa.get("manual_approval_count") != single_audit.get("valid_approval_count"):
            fail("gate1 automated QA and single-approver audit counts disagree")
        if any(result.get("status") != "PASS" for result in gate1_qa.get("results", [])):
            fail("one or more gate1 candidate boards fail automated checks")
        if any(delivery.get("pass") is not True for delivery in gate1_qa.get("deliveries", [])):
            fail("one or more gate1 direction delivery packages are incomplete")
        if gates[1].get("status") == "BLOCKED" and gate1_qa.get("status") != "BLOCKED_EXTERNAL":
            fail("gate1 is BLOCKED but automated QA does not identify the external approval blocker")
        if gates[1].get("status") == "VERIFIED":
            if single_audit.get("status") != "PROMOTED":
                fail("gate1 VERIFIED without a valid single Project Owner approval")
            if single_audit.get("valid_approval_count") != 1:
                fail("gate1 VERIFIED without exactly one package approval")

        if single_policy.get("policy_status") != "ACTIVE":
            fail("gate1 single-approver policy is not active")
        if single_policy.get("approval_mode") != "PROJECT_OWNER_SINGLE_APPROVAL":
            fail("gate1 single-approver policy mode is invalid")
        if single_policy.get("approval_required") != 1:
            fail("gate1 single-approver policy must require one approval")
        if single_policy.get("required_decision_fields") != [
            "approver_name",
            "decision",
            "reviewed_at",
            "scope_acknowledged",
            "candidate_hashes",
        ]:
            fail("gate1 single-approver policy contains unexpected decision fields")
        legacy_policy = single_policy.get("legacy_policy", {})
        if legacy_policy.get("status") != "SUPERSEDED_NON_GATING":
            fail("gate1 legacy ten-approval policy is still gating")
        if legacy_policy.get("approval_required") != 10:
            fail("gate1 legacy approval count history is invalid")
        if single_decision.get("approval_mode") != single_policy.get("approval_mode"):
            fail("gate1 single decision and policy modes disagree")
        promotion_expected = gates[1].get("status") == "VERIFIED"
        if single_decision.get("next_gate_allowed") is not promotion_expected:
            fail("gate1 single decision next-gate flag disagrees with gate status")
        if single_decision.get("approval_applied") is not promotion_expected:
            fail("gate1 single decision promotion flag disagrees with gate status")
        if single_audit.get("policy_sha256", "").lower() != hashlib.sha256(
            (single_root / "SINGLE_APPROVER_POLICY_v1.0.json").read_bytes()
        ).hexdigest().lower():
            fail("gate1 single-approver audit policy hash is stale")
        if single_audit.get("decision_sha256", "").lower() != hashlib.sha256(
            (single_root / "SINGLE_APPROVER_DECISION_v1.0.json").read_bytes()
        ).hexdigest().lower():
            fail("gate1 single-approver audit decision hash is stale")
        single_status = single_audit.get("status")
        if single_status not in {"BLOCKED_EXTERNAL", "FAIL", "READY_FOR_PROMOTION", "PROMOTED"}:
            fail(f"unsupported gate1 single-approver status: {single_status!r}")
        if single_audit.get("approval_required") != 1:
            fail("gate1 single-approver audit must require one approval")
        if single_audit.get("approval_mode") != single_policy.get("approval_mode"):
            fail("gate1 single-approver audit mode is invalid")
        if single_audit.get("next_gate_allowed") is not promotion_expected:
            fail("gate1 single-approver audit next-gate flag disagrees with gate status")
        if single_audit.get("gate1_status_change_applied") is not promotion_expected:
            fail("gate1 single-approver audit promotion flag disagrees with gate status")
        if single_status in {"READY_FOR_PROMOTION", "PROMOTED"}:
            if single_audit.get("valid_approval_count") != 1 or single_audit.get("ready_for_promotion") is not True:
                fail("gate1 single-approver audit is ready without one valid approval")
        elif single_audit.get("ready_for_promotion") is not False:
            fail("gate1 single-approver audit claims readiness while blocked or failed")

        if workbook_preflight.get("status") != "PASS":
            fail("gate1 approval workbook preflight did not pass")
        if workbook_preflight.get("pending_rows") != 10:
            fail("gate1 approval workbook must have ten pending rows before review")
        for field in ("decisions_blank", "reviewers_blank", "reviewed_at_blank", "role_character_matrix_complete"):
            if workbook_preflight.get(field) is not True:
                fail(f"gate1 approval workbook preflight field is not true: {field}")
        workbook_path = ROOT / workbook_preflight.get("workbook", "")
        if not workbook_path.is_file():
            fail("gate1 approval workbook recorded by preflight is missing")
        workbook_hash = hashlib.sha256(workbook_path.read_bytes()).hexdigest().lower()
        if workbook_current.get("mode") != "READ_ONLY_INSPECTION":
            fail("gate1 current approval workbook snapshot is not read-only")
        if workbook_current.get("workbook") != workbook_preflight.get("workbook"):
            fail("gate1 workbook snapshots refer to different workbooks")
        if workbook_hash != workbook_current.get("workbook_sha256", "").lower():
            fail("gate1 approval workbook changed after the current snapshot")
        if workbook_current.get("row_count") != 10 or workbook_current.get("formula_error_count") != 0:
            fail("gate1 current approval workbook snapshot is structurally invalid")
        if workbook_current.get("populated_decision_count") == 0:
            if workbook_hash != workbook_preflight.get("workbook_sha256", "").lower():
                fail("blank gate1 approval workbook changed from its preflight baseline")

        if frozen_manifest.get("status") != "FROZEN_PENDING_REVIEW":
            fail("gate1 manual-review evidence is not frozen pending review")
        if frozen_manifest.get("automated_status") != "PASS":
            fail("gate1 frozen package does not record automated QA PASS")
        if frozen_manifest.get("approval_required") != 10 or frozen_manifest.get("approval_recorded") != 0:
            fail("gate1 frozen package approval counts must be 0/10")
        if frozen_manifest.get("next_gate_allowed") is not False:
            fail("gate1 frozen package allows the next gate")
        assets = frozen_manifest.get("evidence_assets")
        if not isinstance(assets, list) or len(assets) != 40:
            fail("gate1 frozen package must contain exactly 40 checksum records")
        immutable_count = 0
        ledger_count = 0
        for asset in assets:
            relative = asset.get("path", "")
            asset_path = ROOT / relative
            if not asset_path.is_file():
                fail(f"gate1 frozen evidence is missing: {relative}")
            actual = hashlib.sha256(asset_path.read_bytes()).hexdigest().lower()
            policy = asset.get("freeze_policy")
            if policy == "IMMUTABLE_REVIEW_EVIDENCE":
                if actual != asset.get("sha256", "").lower():
                    fail(f"gate1 frozen evidence SHA-256 mismatch: {relative}")
                immutable_count += 1
            elif policy == "CONTROLLED_MUTABLE_APPROVAL_LEDGER":
                if actual != workbook_current.get("workbook_sha256", "").lower():
                    fail("gate1 controlled approval ledger does not match the current workbook snapshot")
                ledger_count += 1
            else:
                fail(f"unsupported gate1 freeze policy: {policy!r}")
        if immutable_count != 39 or ledger_count != 1:
            fail("gate1 package must contain 39 immutable inputs and one controlled approval ledger")
        if frozen_manifest.get("immutable_evidence_count") != 39:
            fail("gate1 frozen package immutable evidence count is not 39")
        if frozen_manifest.get("controlled_mutable_ledger_count") != 1:
            fail("gate1 frozen package controlled ledger count is not 1")

        candidates_by_character = {
            item.get("character"): item for item in frozen_manifest.get("candidates", [])
        }
        if set(candidates_by_character) != MANUAL_REVIEW_CHARACTERS:
            fail("gate1 frozen package candidate set is incomplete")

        if intake_template.get("status") != "TEMPLATE_ONLY_NOT_AN_APPROVAL_RECORD":
            fail("gate1 approval intake template has an unsafe status")
        if intake_template.get("approval_required") != 10 or intake_template.get("approval_recorded") != 0:
            fail("gate1 intake template approval counts must be 0/10")
        if intake_template.get("next_gate_allowed") is not False:
            fail("gate1 intake template allows the next gate")
        rows = intake_template.get("rows")
        if not isinstance(rows, list) or len(rows) != 10:
            fail("gate1 approval intake template must have exactly ten rows")
        for character in MANUAL_REVIEW_CHARACTERS:
            character_rows = [row for row in rows if row.get("character") == character]
            if len(character_rows) != 5:
                fail(f"gate1 intake template must have five rows for {character}")
            if {row.get("role") for row in character_rows} != set(MANUAL_REVIEW_ROLES.values()):
                fail(f"gate1 intake template role set is incomplete for {character}")
            if {row.get("role_slug") for row in character_rows} != set(MANUAL_REVIEW_ROLES):
                fail(f"gate1 intake template role slugs are incomplete for {character}")
            expected_hash = candidates_by_character[character].get("sha256", "").lower()
            for row in character_rows:
                if any(row.get(field) not in ("", None) for field in ("reviewer", "decision", "reviewed_at", "comment", "patch_id")):
                    fail(f"gate1 intake template contains a fabricated approval field for {character}")
                if row.get("unresolved_patch") is not False or row.get("status") != "PENDING":
                    fail(f"gate1 intake template row is not safely pending for {character}")
                if row.get("evidence_hash", "").lower() != expected_hash:
                    fail(f"gate1 intake template candidate hash mismatch for {character}")

        packet_paths = list((manual_root / "packets").glob("*/*.md"))
        if len(packet_paths) != 10:
            fail("gate1 manual review package must contain exactly ten role packets")
        for character in MANUAL_REVIEW_CHARACTERS:
            for slug, role_name in MANUAL_REVIEW_ROLES.items():
                packet = manual_root / "packets" / character / f"{slug}.md"
                if not packet.is_file():
                    fail(f"gate1 manual review packet is missing: {packet.relative_to(ROOT)}")
                text = packet.read_text(encoding="utf-8")
                expected_hash = candidates_by_character[character].get("sha256", "")
                for required in (character, role_name, expected_hash, "Decision: PENDING"):
                    if required not in text:
                        fail(f"gate1 manual review packet missing required content: {packet.relative_to(ROOT)}")

        intake_status = approval_intake_audit.get("status")
        if intake_status not in {"BLOCKED_EXTERNAL", "FAIL", "READY_FOR_PROMOTION"}:
            fail(f"unsupported gate1 approval intake status: {intake_status!r}")
        if approval_intake_audit.get("approval_required") != 10:
            fail("gate1 approval intake audit does not require ten approvals")
        if approval_intake_audit.get("workbook_sha256", "").lower() != workbook_hash:
            fail("gate1 approval intake audit workbook hash is stale")
        if approval_intake_audit.get("next_gate_allowed") is not False:
            fail("gate1 approval intake audit prematurely allows Gate 2")
        if approval_intake_audit.get("gate1_status_change_applied") is not False:
            fail("gate1 approval intake audit applied an unauthorized status change")
        valid_approval_count = approval_intake_audit.get("valid_approval_count")
        if not isinstance(valid_approval_count, int) or not 0 <= valid_approval_count <= 10:
            fail("gate1 approval intake valid approval count is invalid")
        if intake_status == "READY_FOR_PROMOTION":
            if valid_approval_count != 10 or approval_intake_audit.get("ready_for_promotion") is not True:
                fail("gate1 approval intake is ready without ten valid approvals")
        elif approval_intake_audit.get("ready_for_promotion") is not False:
            fail("gate1 approval intake claims readiness while blocked or failed")

        assignments = assignment_register.get("assignments")
        if not isinstance(assignments, list) or len(assignments) != 5:
            fail("gate1 reviewer assignment register must contain five roles")
        if {item.get("role") for item in assignments} != set(MANUAL_REVIEW_ROLES.values()):
            fail("gate1 reviewer assignment role matrix is incomplete")
        if {item.get("role_slug") for item in assignments} != set(MANUAL_REVIEW_ROLES):
            fail("gate1 reviewer assignment role slugs are incomplete")
        if assignment_register.get("package_id") != frozen_manifest.get("package_id"):
            fail("gate1 reviewer assignment package identifier mismatch")
        if assignment_register.get("approvals_created") != 0:
            fail("gate1 reviewer assignment register created approval records")
        if assignment_register.get("next_gate_allowed") is not False:
            fail("gate1 reviewer assignment register prematurely allows Gate 2")
        for item in assignments:
            packets = item.get("packets")
            if not isinstance(packets, dict) or set(packets) != MANUAL_REVIEW_CHARACTERS:
                fail(f"gate1 reviewer assignment packet mapping is invalid: {item.get('role')}")
            for packet_path in packets.values():
                if not (ROOT / packet_path).is_file():
                    fail(f"gate1 reviewer assignment packet is missing: {packet_path}")
            dispatch_request = item.get("dispatch_request", "")
            if not (ROOT / dispatch_request).is_file():
                fail(f"gate1 reviewer dispatch request is missing: {dispatch_request}")

        register_hash = hashlib.sha256(
            (manual_root / "REVIEWER_ASSIGNMENT_REGISTER_v1.0.json").read_bytes()
        ).hexdigest().lower()
        if assignment_audit.get("assignment_register_sha256", "").lower() != register_hash:
            fail("gate1 reviewer assignment audit is stale")
        assignment_status = assignment_audit.get("status")
        if assignment_status not in {"BLOCKED_EXTERNAL", "FAIL", "READY_FOR_DISPATCH", "DISPATCH_CONFIRMED"}:
            fail(f"unsupported gate1 reviewer assignment status: {assignment_status!r}")
        if assignment_audit.get("assignment_required") != 5:
            fail("gate1 reviewer assignment audit does not require five roles")
        if assignment_audit.get("packet_mapping_count") != 10:
            fail("gate1 reviewer assignment audit does not validate ten packet mappings")
        if assignment_audit.get("dispatch_draft_count") != 5:
            fail("gate1 reviewer assignment audit does not validate five dispatch drafts")
        if assignment_audit.get("approvals_created") != 0:
            fail("gate1 reviewer assignment audit created approvals")
        if assignment_audit.get("next_gate_allowed") is not False:
            fail("gate1 reviewer assignment audit prematurely allows Gate 2")
        if assignment_audit.get("dispatch_performed") is not assignment_register.get("dispatch_performed"):
            fail("gate1 reviewer assignment dispatch state is inconsistent")
        if assignment_status in {"READY_FOR_DISPATCH", "DISPATCH_CONFIRMED"}:
            if assignment_audit.get("valid_assignment_count") != 5:
                fail("gate1 reviewer assignment is ready without five valid assignments")
            if assignment_audit.get("acknowledged_assignment_count") != 5:
                fail("gate1 reviewer assignment is ready without five acknowledgments")
            if assignment_audit.get("ready_for_dispatch") is not True:
                fail("gate1 reviewer assignment readiness flag is false")
            if assignment_status == "READY_FOR_DISPATCH" and assignment_audit.get("dispatch_performed") is not False:
                fail("gate1 reviewer assignment is marked ready while dispatch is already recorded")
            if assignment_status == "DISPATCH_CONFIRMED" and assignment_audit.get("dispatch_performed") is not True:
                fail("gate1 reviewer assignment confirms dispatch without a dispatch record")
        elif assignment_audit.get("ready_for_dispatch") is not False:
            fail("gate1 reviewer assignment claims readiness while blocked or failed")

        nominations = nomination_response.get("nominations")
        if not isinstance(nominations, list) or len(nominations) != 5:
            fail("gate1 Coordinator nomination response must contain five roles")
        if {item.get("role") for item in nominations} != set(MANUAL_REVIEW_ROLES.values()):
            fail("gate1 Coordinator nomination role matrix is incomplete")
        if nomination_response.get("assignment_applied") is not False:
            fail("gate1 nomination response applied assignments")
        if nomination_response.get("dispatch_performed") is not False:
            fail("gate1 nomination response recorded dispatch")
        if nomination_response.get("approvals_created") != 0:
            fail("gate1 nomination response created approvals")
        if nomination_response.get("next_gate_allowed") is not False:
            fail("gate1 nomination response prematurely allows Gate 2")
        nomination_hash = hashlib.sha256(
            (manual_root / "COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json").read_bytes()
        ).hexdigest().lower()
        if external_unblock_audit.get("nomination_response_sha256", "").lower() != nomination_hash:
            fail("gate1 external unblock audit is stale")
        unblock_status = external_unblock_audit.get("status")
        if unblock_status not in {"BLOCKED_EXTERNAL", "FAIL", "READY_FOR_ASSIGNMENT"}:
            fail(f"unsupported gate1 external unblock status: {unblock_status!r}")
        if external_unblock_audit.get("nomination_required") != 5:
            fail("gate1 external unblock audit does not require five nominations")
        nomination_count = external_unblock_audit.get("valid_nomination_count")
        if not isinstance(nomination_count, int) or not 0 <= nomination_count <= 5:
            fail("gate1 external unblock nomination count is invalid")
        for field in ("assignment_applied", "dispatch_performed", "next_gate_allowed"):
            if external_unblock_audit.get(field) is not False:
                fail(f"gate1 external unblock audit has unsafe flag: {field}")
        if external_unblock_audit.get("approvals_created") != 0:
            fail("gate1 external unblock audit created approvals")
        if unblock_status == "READY_FOR_ASSIGNMENT":
            if nomination_count != 5 or external_unblock_audit.get("ready_for_assignment") is not True:
                fail("gate1 external unblock audit is ready without five valid nominations")
            if external_unblock_audit.get("authorization_reference_present") is not True:
                fail("gate1 external unblock audit is ready without authority evidence")
        elif external_unblock_audit.get("ready_for_assignment") is not False:
            fail("gate1 external unblock audit claims readiness while blocked or failed")

    if gates[2].get("status") == "NOT_VERIFIED":
        if gates[1].get("status") != "VERIFIED":
            fail("gate2 correction state requires gate1 VERIFIED")
        register = load_json(ROOT / "docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json")
        gate2_root = ROOT / "docs/stage8/evidence/gate2"
        gate2_build = load_json(gate2_root / "GATE2_BUILD_MANIFEST_v1.0.json")
        gate2_audit = load_json(gate2_root / "GATE2_AUTOMATED_QA_v1.0.json")
        gate2_review = load_json(gate2_root / "GATE2_MANUAL_REVIEW_v1.0.json")
        if register.get("status") != "ACTIVE_SHADED_2D_PET_CANDIDATES":
            fail("active character reference register status is invalid")
        if register.get("actual_3d_source", {}).get("status") != "ABANDONED_BY_USER_STRATEGY":
            fail("character register does not record the abandoned 3D strategy")
        if register.get("new_authored_3d_candidates", {}).get("status") != "SUPERSEDED_BY_2D_STRATEGY":
            fail("new authored 3D candidates are not safely superseded")
        for character, record in register.get("characters", {}).items():
            for key in ("approved_reference", "canonical_turnaround"):
                path = ROOT / record.get(f"{key}_path", "")
                expected = record.get(f"{key}_sha256", "").lower()
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != expected:
                    fail(f"canonical reference missing or stale: {character} {key}")
        if gate2_build.get("status") != "REJECTED_SUPERSEDED":
            fail("gate2 rejected build manifest status is invalid")
        for item in gate2_build.get("files", []) + gate2_build.get("previews", []):
            path = ROOT / item.get("path", "")
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                fail(f"rejected gate2 artifact missing or stale: {item.get('path')}")
        if gate2_audit.get("status") != "BLOCKED_EXTERNAL" or gate2_audit.get("automated_status") != "NOT_RUN":
            fail("gate2 correction audit is not safely blocked")
        if gate2_audit.get("model_pass_count") != 0 or gate2_audit.get("models") != []:
            fail("gate2 correction audit still counts rejected models")
        required_blockers = {
            "APPROVED_HIGH_FIDELITY_3D_SOURCE_REQUIRED",
            "PROCEDURAL_CANDIDATES_REJECTED_IDENTITY_MISMATCH",
        }
        if not required_blockers.issubset(set(gate2_audit.get("blockers", []))):
            fail("gate2 correction blockers are incomplete")
        if gate2_review.get("status") != "REJECTED" or gate2_review.get("decision") != "REJECT":
            fail("gate2 superseded manual approval was not rejected")
        if gate2_review.get("approval_applied") is not False or gate2_review.get("next_gate_allowed") is not False:
            fail("gate2 rejected review contains promotion flags")
        if list((ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2").glob("*.glb")):
            fail("active gate2 output contains rejected GLBs")
        if gates[3].get("status") != "NOT_STARTED" or gates[3].get("entry_allowed") is not False:
            fail("gate3 was not reset after gate2 rejection")
        hf_root = ROOT / "docs/stage8/evidence/gate2-high-fidelity"
        hf_qa = load_json(hf_root / "GATE2_HIGH_FIDELITY_AUTOMATED_QA_v2.0.json")
        hf_review = load_json(hf_root / "GATE2_HIGH_FIDELITY_MANUAL_REVIEW_v2.0.json")
        if hf_qa.get("status") != "SUPERSEDED" or hf_qa.get("automated_status") != "PASS":
            fail("high-fidelity Gate 2 candidate audit is not safely superseded")
        if (hf_qa.get("blend_sources_passed"), hf_qa.get("glb_models_passed"), hf_qa.get("renders_passed")) != (2, 6, 6):
            fail("high-fidelity Gate 2 artifact matrix is incomplete")
        if hf_qa.get("failures"):
            fail("high-fidelity Gate 2 audit contains failures")
        for character in hf_qa.get("characters", []):
            source = ROOT / character.get("source_path", "")
            if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest().lower() != character.get("source_sha256", "").lower():
                fail(f"high-fidelity Blender source is missing or stale: {character.get('character')}")
            board = ROOT / character.get("review_board", "")
            if not board.is_file() or hashlib.sha256(board.read_bytes()).hexdigest().lower() != character.get("review_board_sha256", "").lower():
                fail(f"high-fidelity review board is missing or stale: {character.get('character')}")
            for item in character.get("renders", []) + character.get("lods", []):
                path = ROOT / item.get("path", "")
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                    fail(f"high-fidelity artifact is missing or stale: {item.get('path')}")
        if hf_review.get("status") != "SUPERSEDED" or hf_review.get("decision") != "NOT_APPLICABLE":
            fail("high-fidelity manual review is not superseded")
        if hf_review.get("approval_applied") is not False or hf_review.get("next_gate_allowed") is not False:
            fail("high-fidelity superseded review contains promotion flags")

        pet_root = ROOT / "docs/stage8/evidence/2d-pet/v1.0"
        pet_decision = load_json(pet_root / "2D_STRATEGY_DECISION_v1.0.json")
        pet_manifest = load_json(pet_root / "2D_PET_ASSET_MANIFEST_v1.0.json")
        pet_qa = load_json(pet_root / "2D_PET_AUTOMATED_QA_v1.0.json")
        pet_review = load_json(pet_root / "2D_PET_MANUAL_REVIEW_v1.0.json")
        if pet_decision.get("decision") != "ADOPT_SHADED_2D_PET_SYSTEM" or pet_decision.get("status") != "ACTIVE":
            fail("shaded 2D strategy decision is not active")
        if pet_manifest.get("status") != "CANDIDATE_READY_FOR_MANUAL_REVIEW":
            fail("shaded 2D asset manifest is not review-ready")
        if len(pet_manifest.get("sheets", [])) != 2 or len(pet_manifest.get("pose_order", [])) != 8:
            fail("shaded 2D sheet or pose matrix is incomplete")
        if len({item.get("state") for item in pet_manifest.get("pose_order", [])}) != 8:
            fail("shaded 2D pose states are not unique")
        for character, source_record in pet_manifest.get("canonical_sources", {}).items():
            source = ROOT / source_record.get("path", "")
            if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest().lower() != source_record.get("sha256", "").lower():
                fail(f"shaded 2D canonical source is missing or stale: {character}")
        for sheet in pet_manifest.get("sheets", []):
            path = ROOT / sheet.get("path", "")
            review_copy = ROOT / sheet.get("review_copy", "")
            expected = sheet.get("sha256", "").lower()
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != expected:
                fail(f"shaded 2D pose sheet is missing or stale: {sheet.get('character')}")
            if not review_copy.is_file() or hashlib.sha256(review_copy.read_bytes()).hexdigest().lower() != expected:
                fail(f"shaded 2D review copy is missing or stale: {sheet.get('character')}")
            if (sheet.get("width"), sheet.get("height"), sheet.get("expected_pose_count")) != (1536, 1024, 8):
                fail(f"shaded 2D pose-sheet metadata is invalid: {sheet.get('character')}")
        if pet_qa.get("status") != "BLOCKED_EXTERNAL" or pet_qa.get("automated_status") != "PASS":
            fail("shaded 2D automated QA is not safely review-blocked")
        if pet_qa.get("files_passed") != 2 or pet_qa.get("failures"):
            fail("shaded 2D automated QA file matrix is incomplete")
        if pet_review.get("status") != "PENDING" or pet_review.get("decision") is not None:
            fail("shaded 2D manual review is not safely pending")
        if pet_review.get("approval_applied") is not False or pet_review.get("next_gate_allowed") is not False:
            fail("shaded 2D pending review contains promotion flags")
    elif gates[2].get("status") != "NOT_STARTED":
        if gates[1].get("status") != "VERIFIED":
            fail("gate2 started before gate1 VERIFIED")
        gate2_root = ROOT / "docs/stage8/evidence/gate2"
        gate2_build = load_json(gate2_root / "GATE2_BUILD_MANIFEST_v1.0.json")
        gate2_audit = load_json(gate2_root / "GATE2_AUTOMATED_QA_v1.0.json")
        gate2_review = load_json(gate2_root / "GATE2_MANUAL_REVIEW_v1.0.json")
        if gate2_build.get("status") != "CANDIDATE_BUILT":
            fail("gate2 build manifest status is invalid")
        if gate2_build.get("unit") != "meter" or gate2_build.get("up_axis") != "Y" or gate2_build.get("root_scale") != 1.0:
            fail("gate2 build unit, axis, or root scale is invalid")
        build_files = gate2_build.get("files", [])
        if len(build_files) != 6:
            fail("gate2 build manifest must contain six GLB files")
        expected_pairs = {(character, lod) for character in ("Chakchaki", "Gongsickyi") for lod in (0, 1, 2)}
        actual_pairs = {(item.get("character"), item.get("lod")) for item in build_files}
        if actual_pairs != expected_pairs:
            fail("gate2 build manifest character/LOD matrix is incomplete")
        for item in build_files:
            path = ROOT / item.get("path", "")
            if not path.is_file():
                fail(f"gate2 GLB is missing: {item.get('path')}")
            actual = hashlib.sha256(path.read_bytes()).hexdigest().lower()
            if actual != item.get("sha256", "").lower():
                fail(f"gate2 GLB SHA-256 mismatch: {item.get('path')}")
        for character, ratios in gate2_build.get("lod_ratios", {}).items():
            if character not in {"Chakchaki", "Gongsickyi"}:
                fail(f"unexpected gate2 LOD ratio character: {character}")
            if not 0.45 <= ratios.get("lod1_to_lod0", -1) <= 0.60:
                fail(f"gate2 LOD1 ratio is invalid: {character}")
            if not 0.15 <= ratios.get("lod2_to_lod0", -1) <= 0.25:
                fail(f"gate2 LOD2 ratio is invalid: {character}")
        previews = gate2_build.get("previews", [])
        if len(previews) != 4:
            fail("gate2 build manifest must contain four comparison previews")
        for item in previews:
            path = ROOT / item.get("path", "")
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                fail(f"gate2 preview is missing or stale: {item.get('path')}")
        if gate2_build.get("next_gate_allowed") is not False:
            fail("gate2 build manifest prematurely allows Gate 3")
        if gate2_audit.get("automated_status") != "PASS" or gate2_audit.get("model_pass_count") != 6:
            fail("gate2 automated model audit did not pass 6/6")
        if gate2_audit.get("failures"):
            fail("gate2 automated audit contains failures")
        audited_files = {(item.get("character"), item.get("lod")): item for item in gate2_audit.get("models", [])}
        if set(audited_files) != expected_pairs:
            fail("gate2 automated audit model matrix is incomplete")
        for item in build_files:
            audited = audited_files[(item["character"], item["lod"])]
            if audited.get("status") != "PASS":
                fail(f"gate2 audited model is not PASS: {item['character']} LOD{item['lod']}")
            if audited.get("sha256", "").lower() != item.get("sha256", "").lower():
                fail(f"gate2 audit/build hash mismatch: {item['character']} LOD{item['lod']}")
            if audited.get("degenerate_triangles") != 0 or audited.get("non_manifold_edges_welded") != 0:
                fail(f"gate2 topology defect: {item['character']} LOD{item['lod']}")
        if gate2_audit.get("manual_approval_required") != 1:
            fail("gate2 must require one Project Owner approval")
        if gates[2].get("status") == "BLOCKED":
            if gate2_audit.get("status") != "BLOCKED_EXTERNAL" or gate2_audit.get("manual_approval_count") != 0:
                fail("gate2 BLOCKED status disagrees with pending manual review")
            if "PROJECT_OWNER_VISUAL_REVIEW_REQUIRED" not in gate2_audit.get("blockers", []):
                fail("gate2 manual-review blocker is missing")
            if gate2_review.get("approval_applied") is not False or gate2_review.get("next_gate_allowed") is not False:
                fail("gate2 pending review contains premature promotion flags")
        if gates[2].get("status") == "VERIFIED":
            if gate2_audit.get("status") != "VERIFIED" or gate2_audit.get("manual_approval_count") != 1:
                fail("gate2 VERIFIED without one valid manual approval")
            if gate2_audit.get("gate2_status_change_applied") is not True or gate2_audit.get("next_gate_allowed") is not True:
                fail("gate2 VERIFIED without applied promotion flags")
            if gate2_review.get("status") != "APPROVED" or gate2_review.get("decision") != "APPROVE":
                fail("gate2 VERIFIED without an approved manual-review record")
            if gate2_review.get("approval_applied") is not True or gate2_review.get("next_gate_allowed") is not True:
                fail("gate2 VERIFIED while manual approval is not applied")
            if not gate2_review.get("scope_acknowledged") or not all(value is True for value in gate2_review.get("checks", {}).values()):
                fail("gate2 VERIFIED with incomplete visual-review checks")
            if gates[3].get("entry_allowed") is not True:
                fail("gate2 VERIFIED without enabling Gate 3 entry")
        if gates[3].get("entry_allowed") is True and gates[2].get("status") != "VERIFIED":
            fail("gate3 entry allowed before gate2 VERIFIED")

    if gates[3].get("status") == "NOT_STARTED" and gates[2].get("status") != "VERIFIED":
        gate3_root = ROOT / "docs/stage8/evidence/gate3"
        gate3_build = load_json(gate3_root / "GATE3_BUILD_MANIFEST_v1.0.json")
        gate3_audit = load_json(gate3_root / "GATE3_AUTOMATED_QA_v1.0.json")
        gate3_review = load_json(gate3_root / "GATE3_MANUAL_REVIEW_v1.0.json")
        if gate3_build.get("status") != "REJECTED_SUPERSEDED":
            fail("gate3 rejected build manifest status is invalid")
        for item in gate3_build.get("files", []) + gate3_build.get("previews", []):
            path = ROOT / item.get("path", "")
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                fail(f"rejected gate3 artifact missing or stale: {item.get('path')}")
        if gate3_audit.get("status") != "BLOCKED_PREREQUISITE" or gate3_audit.get("automated_status") != "NOT_RUN":
            fail("gate3 correction audit is not prerequisite-blocked")
        if gate3_audit.get("rig_pass_count") != 0 or gate3_audit.get("rigs") != []:
            fail("gate3 correction audit still counts rejected rigs")
        if gate3_review.get("status") != "REJECTED" or gate3_review.get("decision") != "REJECT":
            fail("gate3 superseded manual review was not rejected")
        if gate3_review.get("approval_applied") is not False or gate3_review.get("next_gate_allowed") is not False:
            fail("gate3 rejected review contains promotion flags")
        if list((ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate3").glob("*.glb")):
            fail("active gate3 output contains rejected GLBs")
        if gates[4].get("entry_allowed") is not False:
            fail("gate4 entry allowed while gate3 is not started")
    elif gates[3].get("status") != "NOT_STARTED":
        if gates[2].get("status") != "VERIFIED":
            fail("gate3 started before gate2 VERIFIED")
        gate3_root = ROOT / "docs/stage8/evidence/gate3"
        gate3_build = load_json(gate3_root / "GATE3_BUILD_MANIFEST_v1.0.json")
        gate3_audit = load_json(gate3_root / "GATE3_AUTOMATED_QA_v1.0.json")
        gate3_review = load_json(gate3_root / "GATE3_MANUAL_REVIEW_v1.0.json")
        if gate3_build.get("status") != "RIG_CANDIDATE_BUILT":
            fail("gate3 build manifest status is invalid")
        if gate3_build.get("unit") != "meter" or gate3_build.get("up_axis") != "Y" or gate3_build.get("root_scale") != 1.0:
            fail("gate3 build unit, axis, or root scale is invalid")
        rig_files = gate3_build.get("files", [])
        expected_pairs = {(character, lod) for character in ("Chakchaki", "Gongsickyi") for lod in (0, 1, 2)}
        actual_pairs = {(item.get("character"), item.get("lod")) for item in rig_files}
        if len(rig_files) != 6 or actual_pairs != expected_pairs:
            fail("gate3 rig character/LOD matrix is incomplete")
        for item in rig_files:
            source = ROOT / item.get("source_path", "")
            path = ROOT / item.get("path", "")
            if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest().lower() != item.get("source_sha256", "").lower():
                fail(f"gate3 source GLB hash mismatch: {item.get('character')} LOD{item.get('lod')}")
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                fail(f"gate3 rig GLB hash mismatch: {item.get('character')} LOD{item.get('lod')}")
            expected_joints = 32 if item.get("character") == "Chakchaki" else 20
            expected_morphs = 15 if item.get("character") == "Chakchaki" else 19
            if item.get("joint_count") != expected_joints or item.get("skin_count") != 1:
                fail(f"gate3 joint/skin count mismatch: {item.get('character')} LOD{item.get('lod')}")
            if item.get("morph_count", 0) < expected_morphs or len(item.get("pose_names", [])) != 4:
                fail(f"gate3 morph/pose count mismatch: {item.get('character')} LOD{item.get('lod')}")
        previews = gate3_build.get("previews", [])
        if len(previews) != 6:
            fail("gate3 must contain six skeleton/deformation/pose previews")
        for item in previews:
            path = ROOT / item.get("path", "")
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().lower() != item.get("sha256", "").lower():
                fail(f"gate3 preview is missing or stale: {item.get('path')}")
        if gate3_build.get("next_gate_allowed") is not False:
            fail("gate3 build manifest prematurely allows Gate 4")
        if gate3_audit.get("automated_status") != "PASS" or gate3_audit.get("rig_pass_count") != 6:
            fail("gate3 automated rig audit did not pass 6/6")
        if gate3_audit.get("failures"):
            fail("gate3 automated audit contains failures")
        audited = {(item.get("character"), item.get("lod")): item for item in gate3_audit.get("rigs", [])}
        if set(audited) != expected_pairs:
            fail("gate3 automated audit rig matrix is incomplete")
        for item in rig_files:
            result = audited[(item["character"], item["lod"])]
            if result.get("status") != "PASS" or result.get("sha256", "").lower() != item.get("sha256", "").lower():
                fail(f"gate3 audit/build mismatch: {item['character']} LOD{item['lod']}")
            if result.get("bad_weight_count") != 0 or result.get("invalid_joint_index_count") != 0:
                fail(f"gate3 skin-weight defect: {item['character']} LOD{item['lod']}")
            if result.get("missing_morphs") or result.get("zero_morphs") or result.get("missing_poses"):
                fail(f"gate3 morph/pose defect: {item['character']} LOD{item['lod']}")
        if gate3_audit.get("manual_approval_required") != 1:
            fail("gate3 must require one Project Owner approval")
        if gates[3].get("status") == "BLOCKED":
            if gate3_audit.get("status") != "BLOCKED_EXTERNAL" or gate3_audit.get("manual_approval_count") != 0:
                fail("gate3 BLOCKED status disagrees with pending manual review")
            if "PROJECT_OWNER_DEFORMATION_REVIEW_REQUIRED" not in gate3_audit.get("blockers", []):
                fail("gate3 manual-review blocker is missing")
            if gate3_review.get("approval_applied") is not False or gate3_review.get("next_gate_allowed") is not False:
                fail("gate3 pending review contains premature promotion flags")
        if gates[3].get("status") == "VERIFIED":
            if gate3_audit.get("status") != "VERIFIED" or gate3_audit.get("manual_approval_count") != 1:
                fail("gate3 VERIFIED without one valid manual approval")
            if gate3_audit.get("gate3_status_change_applied") is not True or gate3_audit.get("next_gate_allowed") is not True:
                fail("gate3 VERIFIED without applied promotion flags")
            if gate3_review.get("status") != "APPROVED" or gate3_review.get("decision") != "APPROVE":
                fail("gate3 VERIFIED without an approved manual-review record")
            if gate3_review.get("approval_applied") is not True or gate3_review.get("next_gate_allowed") is not True:
                fail("gate3 VERIFIED while manual approval is not applied")
            if not gate3_review.get("scope_acknowledged") or not all(value is True for value in gate3_review.get("checks", {}).values()):
                fail("gate3 VERIFIED with incomplete deformation-review checks")
            if gates[4].get("entry_allowed") is not True:
                fail("gate3 VERIFIED without enabling Gate 4 entry")
        if gates[4].get("entry_allowed") is True and gates[3].get("status") != "VERIFIED":
            fail("gate4 entry allowed before gate3 VERIFIED")

    if missing_exact:
        fail("missing exact Stage 7 originals: " + ", ".join(missing_exact))
    if conflicts:
        fail("conflicting exact Stage 7 originals: " + ", ".join(conflicts))

    print("HARNESS_PASS")
    print(f"gate0={gates[0].get('status')}")
    print(f"gate1={gates[1].get('status')}")
    print(f"gate2={gates[2].get('status')}")
    print(f"gate3={gates[3].get('status')}")
    print(f"manifest_status={manifest.get('status')}")
    for warning in sensitive_warnings:
        print(f"HARNESS_WARNING: ignored untracked sensitive-looking file not read: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
