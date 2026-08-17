#!/usr/bin/env python3
"""Refuse procedural Gate 2 regeneration when no canonical-quality 3D source exists."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTER = ROOT / "docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().lower()


def main() -> int:
    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    failures: list[str] = []
    for character, record in register.get("characters", {}).items():
        for key in ("approved_reference", "canonical_turnaround"):
            path = ROOT / record[f"{key}_path"]
            expected = record[f"{key}_sha256"].lower()
            if not path.is_file() or sha256(path) != expected:
                failures.append(f"{character}:{key}:MISSING_OR_HASH_MISMATCH")

    active = list((ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2").glob("*.glb"))
    if active:
        failures.append("ACTIVE_REJECTED_GATE2_GLB_PRESENT")

    if failures:
        print("GATE2_FAIL")
        for failure in failures:
            print(failure)
        return 2

    print("GATE2_BLOCKED_EXTERNAL")
    print("Canonical 2D references are valid and new Blender candidates exist, but they are not visually approved.")
    print("Procedural primitive generation is disabled because it failed character-identity review.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
