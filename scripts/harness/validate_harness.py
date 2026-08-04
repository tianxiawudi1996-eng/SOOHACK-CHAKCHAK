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
    "docs/stage8/audits/TEST_EXECUTION_REPORT.md",
    "docs/stage8/audits/FINAL_EXECUTION_REPORT.md",
    "docs/stage8/evidence/gate0/gate0-decision.json",
    "docs/stage8/evidence/gate0/manual-review.json",
    "docs/stage8/evidence/gate1/candidate-review.json",
    "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json",
    "docs/stage8/evidence/gate1/Gate1_Character_Consistency_Report_v5.2.0.md",
    "docs/stage8/evidence/gate1/Gate1_Change_Log_v5.2.0.md",
    "docs/stage8/evidence/gate1/SHA256SUMS.txt",
    "docs/stage8/prompts/GATE1_QA_APPROVAL_PACKAGE_METAPROMPT_v1.0.md",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx",
    "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx",
]

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
        if any(result.get("status") != "PASS" for result in gate1_qa.get("results", [])):
            fail("one or more gate1 candidate boards fail automated checks")
        if any(delivery.get("pass") is not True for delivery in gate1_qa.get("deliveries", [])):
            fail("one or more gate1 direction delivery packages are incomplete")
        if gates[1].get("status") == "BLOCKED" and gate1_qa.get("status") != "BLOCKED_EXTERNAL":
            fail("gate1 is BLOCKED but automated QA does not identify the external approval blocker")
        if gates[1].get("status") == "VERIFIED":
            if gate1_review.get("status") != "VERIFIED" or len(gate1_review.get("manual_approvals", [])) < 10:
                fail("gate1 VERIFIED without ten accountable approvals")

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
