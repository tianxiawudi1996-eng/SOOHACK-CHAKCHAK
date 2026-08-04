#!/usr/bin/env python3
"""Validate the evidence-gated Stage 8 harness without changing project files."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS = ROOT / "harness" / "status.json"
MANIFEST = ROOT / "harness" / "ssot-manifest.json"
ALLOWED = {"NOT_STARTED", "IN_PROGRESS", "BLOCKED", "NOT_VERIFIED", "VERIFIED"}
REQUIRED_PROMPTS = [f"GATE{i}_" for i in range(9)]
SENSITIVE_NAME_RE = re.compile(r"(?:recovery[-_ ]?codes|id_rsa|private[-_ ]?key)", re.I)


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


def main() -> int:
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
    for record in required_files:
        if record.get("status", "").startswith("FOUND_EXACT"):
            for match in record.get("exact_matches", []):
                path = ROOT / match["path"]
                if not path.exists():
                    fail(f"manifest path missing: {match['path']}")
                expected = match.get("sha256")
                if expected:
                    digest = hashlib.sha256(path.read_bytes()).hexdigest()
                    if digest.lower() != expected.lower():
                        fail(f"manifest SHA-256 mismatch: {match['path']}")

    for path in ROOT.rglob("*"):
        if path.is_file() and ".git" not in path.parts and SENSITIVE_NAME_RE.search(path.name):
            fail(f"sensitive-looking filename must be quarantined before commit: {path.relative_to(ROOT)}")

    prompts = list((ROOT / "docs" / "stage8" / "prompts").glob("GATE*.md"))
    if len(prompts) != 9:
        fail("docs/stage8/prompts must contain exactly nine Gate prompts")
    for prompt in prompts:
        text = prompt.read_text(encoding="utf-8")
        for required in ("역할", "선행 조건", "필수 산출물", "자동 검증", "수동 검증", "중단 조건", "다음 Gate"):
            if required not in text:
                fail(f"prompt missing required section {required!r}: {prompt.relative_to(ROOT)}")

    if not (ROOT / "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md").exists():
        fail("Gate 0 audit report is missing")
    if gates[0].get("status") == "VERIFIED":
        report = (ROOT / "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md").read_text(encoding="utf-8")
        if "Gate 0 상태: `VERIFIED`" not in report:
            fail("gate0 status and report disagree")

    print("HARNESS_FAIL_EXPECTED" if gates[0].get("status") == "BLOCKED" else "HARNESS_PASS")
    print(f"gate0={gates[0].get('status')}")
    print(f"gate1={gates[1].get('status')}")
    print(f"manifest_status={manifest.get('status')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
