#!/usr/bin/env python3
"""Audit the corrected Gate 2 canonical-character block state."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/stage8/evidence/gate2"
REGISTER = ROOT / "docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json"
QA = EVIDENCE / "GATE2_AUTOMATED_QA_v1.0.json"
AUDIT = ROOT / "docs/stage8/audits/GATE2_BASE_MESH_MATERIAL_AUDIT.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().lower()


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    failures: list[str] = []
    for character, record in register.get("characters", {}).items():
        for key in ("approved_reference", "canonical_turnaround"):
            path = ROOT / record[f"{key}_path"]
            if not path.is_file() or sha256(path) != record[f"{key}_sha256"].lower():
                failures.append(f"{character}:{key}:MISSING_OR_HASH_MISMATCH")

    active_glbs = [p.relative_to(ROOT).as_posix() for p in
                   (ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2").glob("*.glb")]
    if active_glbs:
        failures.append("ACTIVE_REJECTED_GATE2_GLB_PRESENT")

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    status = "FAIL" if failures else "BLOCKED_EXTERNAL"
    payload = {
        "schema_version": "1.0.0",
        "generated_at": now,
        "gate": 2,
        "status": status,
        "automated_status": "NOT_RUN",
        "model_pass_count": 0,
        "models": [],
        "manual_approval_required": 1,
        "manual_approval_count": 0,
        "failures": failures,
        "blockers": [
            "APPROVED_HIGH_FIDELITY_3D_SOURCE_REQUIRED",
            "PROCEDURAL_CANDIDATES_REJECTED_IDENTITY_MISMATCH"
        ],
        "active_rejected_glbs": active_glbs,
        "ready_for_promotion": False,
        "gate2_status_change_applied": False,
        "next_gate_allowed": False
    }
    write_json(QA, payload)
    AUDIT.write_text(
        "# Gate 2 캐릭터 정체성 수정 감사\n\n"
        f"- 상태: `{status}`\n"
        "- 공식 입력: Stage 7 승인 이미지와 Gate 1 턴어라운드\n"
        "- 실제 고품질 3D 원본: 없음\n"
        "- 기존 절차형 GLB: 사용자 명시적 거부로 격리\n"
        "- 활성 Gate 2 GLB: 0개\n"
        "- 다음 단계 허용: `false`\n\n"
        "상단의 기존 캐릭터 이미지만 시각적 기준으로 사용한다. 해당 2D 이미지를 실제 3D 메시로 오인하지 않으며, 정체성과 품질을 충족하는 3D 원본 또는 전문 제작 결과가 제공되기 전까지 Gate 2는 차단된다.\n",
        encoding="utf-8"
    )
    print(status)
    print(f"active_gate2_glbs={len(active_glbs)}")
    return 2 if failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
