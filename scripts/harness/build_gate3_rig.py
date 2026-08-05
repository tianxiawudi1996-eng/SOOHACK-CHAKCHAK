#!/usr/bin/env python3
"""Refuse Gate 3 rig generation until canonical-quality Gate 2 is VERIFIED."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    status = json.loads((ROOT / "harness/status.json").read_text(encoding="utf-8"))
    active = list((ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate3").glob("*.glb"))
    if active:
        print("GATE3_FAIL")
        print("ACTIVE_REJECTED_GATE3_GLB_PRESENT")
        return 2
    if status.get("gate2", {}).get("status") != "VERIFIED":
        print("GATE3_BLOCKED_PREREQUISITE")
        print("Gate 2 must be VERIFIED with a canonical-quality 3D character before rigging.")
        return 1
    print("GATE3_BLOCKED_EXTERNAL")
    print("A verified Gate 2 source exists, but rig authoring has not been performed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
