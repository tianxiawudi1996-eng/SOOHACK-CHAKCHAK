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
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx",
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

    if missing_exact:
        fail("missing exact Stage 7 originals: " + ", ".join(missing_exact))
    if conflicts:
        fail("conflicting exact Stage 7 originals: " + ", ".join(conflicts))

    print("HARNESS_PASS")
    print(f"gate0={gates[0].get('status')}")
    print(f"gate1={gates[1].get('status')}")
    print(f"manifest_status={manifest.get('status')}")
    for warning in sensitive_warnings:
        print(f"HARNESS_WARNING: ignored untracked sensitive-looking file not read: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
