#!/usr/bin/env python3
"""Audit the corrected Gate 3 prerequisite-blocked state."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/stage8/evidence/gate3"
QA = EVIDENCE / "GATE3_AUTOMATED_QA_v1.0.json"
AUDIT = ROOT / "docs/stage8/audits/GATE3_RIG_BLENDSHAPE_AUDIT.md"


def main() -> int:
    status_doc = json.loads((ROOT / "harness/status.json").read_text(encoding="utf-8"))
    active = [p.relative_to(ROOT).as_posix() for p in
              (ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate3").glob("*.glb")]
    failures = ["ACTIVE_REJECTED_GATE3_GLB_PRESENT"] if active else []
    status = "FAIL" if failures else "BLOCKED_PREREQUISITE"
    payload = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "gate": 3,
        "status": status,
        "automated_status": "NOT_RUN",
        "rig_pass_count": 0,
        "rigs": [],
        "manual_approval_required": 1,
        "manual_approval_count": 0,
        "failures": failures,
        "blockers": [
            "GATE2_NOT_VERIFIED",
            "REJECTED_DERIVED_RIG_CANDIDATES_QUARANTINED"
        ],
        "gate2_status": status_doc.get("gate2", {}).get("status"),
        "active_rejected_glbs": active,
        "ready_for_promotion": False,
        "gate3_status_change_applied": False,
        "next_gate_allowed": False
    }
    QA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    AUDIT.write_text(
        "# Gate 3 리그·블렌드셰이프 수정 감사\n\n"
        f"- 상태: `{status}`\n"
        "- Gate 2: `NOT_VERIFIED`\n"
        "- 기존 리그 GLB: 거부된 저품질 Gate 2 메시에서 파생되어 격리\n"
        "- 활성 Gate 3 GLB: 0개\n"
        "- 다음 단계 허용: `false`\n\n"
        "정체성과 품질이 확인된 Gate 2 캐릭터가 승인되기 전에는 리깅을 시작하지 않는다.\n",
        encoding="utf-8"
    )
    print(status)
    print(f"active_gate3_glbs={len(active)}")
    return 2 if failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
