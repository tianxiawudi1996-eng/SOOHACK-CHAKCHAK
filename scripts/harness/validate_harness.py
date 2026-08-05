#!/usr/bin/env python3
"""Validate Math ChackChack Stage 8 harness ordering and evidence rules."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS_PATH = ROOT / "harness" / "status.json"
ALLOWED = {"DONE_SPEC", "DONE_IMPLEMENTED", "VERIFIED", "BLOCKED_EXTERNAL", "FAIL"}


def fail(message: str) -> None:
    print(f"HARNESS_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if not STATUS_PATH.exists():
        fail(f"missing {STATUS_PATH.relative_to(ROOT)}")

    data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    gates = data.get("gates", [])
    if [gate.get("id") for gate in gates] != list(range(9)):
        fail("gates must be ordered 0 through 8 with no gaps")

    current_gate = data.get("currentGate")
    if current_gate not in range(9):
        fail("currentGate must be an integer from 0 to 8")

    for gate in gates:
        status = gate.get("status")
        if status not in ALLOWED:
            fail(f"Gate {gate['id']} has unsupported status {status!r}")

        for evidence in gate.get("evidence", []):
            if not (ROOT / evidence).exists():
                fail(f"Gate {gate['id']} evidence does not exist: {evidence}")

    # Sequential entry rule: Gate N can only be entryAllowed when Gate N-1 is VERIFIED.
    for index in range(1, 9):
        gate = gates[index]
        previous = gates[index - 1]
        if gate.get("entryAllowed") and previous.get("status") != "VERIFIED":
            fail(
                f"Gate {index} entryAllowed=true while Gate {index-1} is "
                f"{previous.get('status')}, not VERIFIED"
            )

    # No gate beyond current may claim implementation or verification.
    for gate in gates[current_gate + 1 :]:
        if gate.get("status") in {"DONE_IMPLEMENTED", "VERIFIED"}:
            fail(f"future Gate {gate['id']} cannot be {gate['status']}")

    # VERIFIED requires at least one evidence path and no open items.
    for gate in gates:
        if gate.get("status") == "VERIFIED":
            if not gate.get("evidence"):
                fail(f"Gate {gate['id']} VERIFIED without evidence")
            if gate.get("openItems"):
                fail(f"Gate {gate['id']} VERIFIED with unresolved openItems")

    print("HARNESS_PASS")
    print(f"current_gate={current_gate}")
    print(f"overall_status={data.get('overallStatus')}")


if __name__ == "__main__":
    main()
