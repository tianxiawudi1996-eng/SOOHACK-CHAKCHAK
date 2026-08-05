#!/usr/bin/env python3
"""Audit Gate 4 shaded 2D pet state transitions and reduced-motion controls."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PET_ROOT = ROOT / "docs/stage8/evidence/2d-pet/v1.0"
GATE3_MANIFEST_PATH = PET_ROOT / "2D_PET_RUNTIME_MANIFEST_v1.0.json"
MOTION_MANIFEST_PATH = PET_ROOT / "2D_PET_MOTION_MANIFEST_v1.0.json"
REVIEW_PATH = PET_ROOT / "GATE4_2D_PET_MOTION_MANUAL_REVIEW_v1.0.json"
OUTPUT_JSON = PET_ROOT / "GATE4_2D_PET_MOTION_AUTOMATED_QA_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE4_2D_PET_MOTION_AUDIT.md"

EXPECTED = {
    "IDLE_LISTEN": ("P01", 4000, 7000),
    "WELCOME": ("P02", 800, 1200),
    "GUIDE": ("P03", 800, 1400),
    "THINK": ("P04", 2000, 4000),
    "PRAISE_PROGRESS": ("P05", 800, 1500),
    "SEARCH": ("P06", 1500, 4000),
    "CELEBRATE": ("P07", 1000, 1500),
    "RETRY": ("P08", 800, 1600),
}
ALLOWED_PROPERTIES = {"transform", "opacity"}


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"invalid JSON {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> int:
    failures: list[str] = []
    state_results: list[dict] = []
    try:
        gate3 = load_json(GATE3_MANIFEST_PATH)
        motion = load_json(MOTION_MANIFEST_PATH)
        review = load_json(REVIEW_PATH)
    except RuntimeError as exc:
        print(f"GATE4_2D_MOTION_FAIL: {exc}", file=sys.stderr)
        return 2

    if gate3.get("status") != "APPROVED" or gate3.get("manual_approval_count") != 1 or gate3.get("next_gate_allowed") is not True:
        failures.append("GATE3_APPROVED_RUNTIME_PREREQUISITE_MISSING")
    source_record = motion.get("source_runtime_manifest", {})
    if source_record.get("sha256", "").lower() != sha256(GATE3_MANIFEST_PATH):
        failures.append("GATE3_RUNTIME_MANIFEST_HASH_MISMATCH")
    if source_record.get("pose_count") != 16:
        failures.append("GATE3_RUNTIME_POSE_COUNT_INVALID")

    implementation = motion.get("implementation", {})
    implementation_results: list[dict] = []
    for key in ("stylesheet", "runtime"):
        item = implementation.get(key, {})
        path = ROOT / item.get("path", "")
        item_failures: list[str] = []
        if not path.is_file():
            item_failures.append("FILE_MISSING")
        else:
            if sha256(path) != item.get("sha256", "").lower():
                item_failures.append("HASH_MISMATCH")
            if path.stat().st_size != item.get("bytes"):
                item_failures.append("BYTE_SIZE_MISMATCH")
        failures.extend(f"{key}:{failure}" for failure in item_failures)
        implementation_results.append({"kind": key, "path": item.get("path"), "status": "PASS" if not item_failures else "FAIL", "failures": item_failures})

    bridge = motion.get("transition_bridge", {})
    if bridge.get("mode") != "DUAL_LAYER_CROSSFADE" or bridge.get("duration_ms") != 320:
        failures.append("POSE_TO_POSE_BRIDGE_INVALID")
    if set(bridge.get("properties", [])) != ALLOWED_PROPERTIES:
        failures.append("POSE_TO_POSE_BRIDGE_PROPERTIES_INVALID")
    if bridge.get("reduced_motion") != "STATIC_POSE_SWAP":
        failures.append("POSE_TO_POSE_BRIDGE_REDUCED_MOTION_INVALID")
    if bridge.get("rapid_input_policy") != "LATEST_TRANSITION_WINS":
        failures.append("POSE_TO_POSE_RAPID_INPUT_POLICY_INVALID")

    choreography = motion.get("natural_choreography", {})
    if choreography.get("phase_order") != ["PREPARE", "BRIDGE", "SETTLE", "STEADY"]:
        failures.append("NATURAL_CHOREOGRAPHY_PHASE_ORDER_INVALID")
    expected_timings = {"prepare_ms": 120, "bridge_ms": 320, "settle_ms": 240, "total_transition_ms": 680}
    if any(choreography.get(key) != value for key, value in expected_timings.items()):
        failures.append("NATURAL_CHOREOGRAPHY_TIMING_INVALID")
    if choreography.get("direction_profile_count") != 8 or choreography.get("state_micro_motion_keyframes_min", 0) < 4:
        failures.append("NATURAL_CHOREOGRAPHY_PROFILE_MATRIX_INCOMPLETE")
    if choreography.get("character_rhythm_offset_ms") != 90 or choreography.get("ground_shadow_breathing") is not True:
        failures.append("NATURAL_CHOREOGRAPHY_AMBIENT_MOTION_INVALID")
    if choreography.get("latest_input_cancels_active_choreography") is not True:
        failures.append("NATURAL_CHOREOGRAPHY_CANCELLATION_INVALID")
    if set(choreography.get("properties", [])) != ALLOWED_PROPERTIES or choreography.get("reduced_motion") != "STATIC_POSE_SWAP":
        failures.append("NATURAL_CHOREOGRAPHY_ACCESSIBILITY_INVALID")

    states = motion.get("states", [])
    by_state = {item.get("state"): item for item in states}
    if len(states) != 8 or set(by_state) != set(EXPECTED):
        failures.append("STATE_MATRIX_INCOMPLETE")
    for state, (pose_id, minimum, maximum) in EXPECTED.items():
        item = by_state.get(state, {})
        item_failures: list[str] = []
        if item.get("pose_id") != pose_id:
            item_failures.append("POSE_MAPPING_INVALID")
        duration = item.get("duration_ms")
        if not isinstance(duration, int) or not minimum <= duration <= maximum:
            item_failures.append("DURATION_OUT_OF_RANGE")
        properties = set(item.get("normal_properties", []))
        if not properties or not properties.issubset(ALLOWED_PROPERTIES):
            item_failures.append("MOTION_PROPERTY_NOT_ALLOWED")
        if item.get("reduced_motion") != "STATIC_POSE_SWAP":
            item_failures.append("REDUCED_MOTION_FALLBACK_INVALID")
        if not item.get("animation") or not item.get("easing") or not item.get("triggers"):
            item_failures.append("MOTION_METADATA_INCOMPLETE")
        failures.extend(f"{state}:{failure}" for failure in item_failures)
        state_results.append({"state": state, "pose_id": item.get("pose_id"), "duration_ms": duration, "status": "PASS" if not item_failures else "FAIL", "failures": item_failures})

    css_path = ROOT / implementation.get("stylesheet", {}).get("path", "")
    js_path = ROOT / implementation.get("runtime", {}).get("path", "")
    css = css_path.read_text(encoding="utf-8") if css_path.is_file() else ""
    js = js_path.read_text(encoding="utf-8") if js_path.is_file() else ""
    landing = (ROOT / "mock.html").read_text(encoding="utf-8")
    review_page = (PET_ROOT / "gate4-review/index.html").read_text(encoding="utf-8")

    if "@media (prefers-reduced-motion: reduce)" not in css or "animation: none !important" not in css:
        failures.append("REDUCED_MOTION_CSS_MISSING")
    keyframe_region = css[css.find("@keyframes"):css.find(".pet-motion-paused")]
    if re.search(r"\b(?:top|left|right|bottom|width|height|margin|padding)\s*:", keyframe_region):
        failures.append("LAYOUT_AFFECTING_KEYFRAME_PROPERTY_FOUND")
    for state in EXPECTED:
        if f'data-pet-state="{state}"' not in css or state not in js:
            failures.append(f"STATE_IMPLEMENTATION_MISSING:{state}")
    for marker in ("matchMedia('(prefers-reduced-motion: reduce)')", "mathChakChakPets", "mathchakchak:pet-state", "visibilitychange", "NATURAL_CHOREOGRAPHY", "previousState", "transitionToken", "PREPARE_MS", "BRIDGE_MS", "SETTLE_MS", "resetTransition"):
        if marker not in js:
            failures.append(f"RUNTIME_CONTROL_MISSING:{marker}")
    for marker in ("pet-motion-image-stage", "pet-motion-preparing", "pet-motion-incoming", "pet-motion-outgoing", "pet-motion-settling", "pet-pose-prepare", "pet-pose-enter", "pet-pose-exit", "pet-pose-settle", "pet-ground-shadow"):
        if marker not in css:
            failures.append(f"POSE_TO_POSE_CSS_MISSING:{marker}")
    for page_name, page in (("landing", landing), ("review", review_page)):
        if page.count("data-pet-state-trigger=") != 8:
            failures.append(f"{page_name.upper()}_STATE_CONTROLS_NOT_8")
        if page.count("data-pet-character=") != 2:
            failures.append(f"{page_name.upper()}_PET_CONTROLLERS_NOT_2")
        if page.count("data-pet-image-stage") != 2:
            failures.append(f"{page_name.upper()}_TRANSITION_STAGES_NOT_2")
        if "2d-pet-motion-v1.0.css" not in page or "2d-pet-motion-v1.0.js" not in page:
            failures.append(f"{page_name.upper()}_MOTION_BUNDLE_NOT_LINKED")
    if "pointer-events: none" not in landing:
        failures.append("LANDING_POINTER_BLOCKING_CONTROL_MISSING")

    automated_status = "PASS" if not failures else "FAIL"
    review_pending = review.get("status") == "PENDING" and review.get("decision") is None
    if automated_status == "PASS" and review_pending:
        status = "BLOCKED_EXTERNAL"
        blockers = ["PROJECT_OWNER_GATE4_MOTION_AND_REDUCED_MOTION_REVIEW_REQUIRED"]
    elif automated_status == "PASS" and review.get("status") == "APPROVED":
        status = "VERIFIED"
        blockers = []
    else:
        status = "FAIL"
        blockers = []

    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 4,
        "status": status,
        "automated_status": automated_status,
        "motion_manifest": relative(MOTION_MANIFEST_PATH),
        "motion_manifest_sha256": sha256(MOTION_MANIFEST_PATH),
        "state_pass_count": sum(item["status"] == "PASS" for item in state_results),
        "state_expected_count": 8,
        "reduced_motion_pass_count": sum(item["status"] == "PASS" for item in state_results),
        "implementation_pass_count": sum(item["status"] == "PASS" for item in implementation_results),
        "implementation_expected_count": 2,
        "pose_bridge_pass": not any(failure.startswith("POSE_TO_POSE") for failure in failures),
        "natural_choreography_pass": not any(failure.startswith("NATURAL_CHOREOGRAPHY") for failure in failures),
        "states": state_results,
        "implementations": implementation_results,
        "failures": failures,
        "manual_approval_required": 1,
        "manual_approval_count": 1 if review.get("status") == "APPROVED" else 0,
        "blockers": blockers,
        "gate4_status_change_applied": review.get("approval_applied") is True,
        "next_gate_allowed": review.get("next_gate_allowed") is True,
    }
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT_MD.write_text(
        f"""# Gate 4 음영 2D 펫 모션 감사

- 상태: `{status}`
- 자동 QA: `{automated_status}`
- 상태 전환: `{result['state_pass_count']}/8`
- reduced-motion 대체: `{result['reduced_motion_pass_count']}/8`
- CSS/JS 구현: `{result['implementation_pass_count']}/2`
- 포즈 사이 이중 레이어 교차 모션: `{str(result['pose_bridge_pass']).lower()}`
- 준비·교차·착지·잔동작 자연 연동: `{str(result['natural_choreography_pass']).lower()}`
- 수동 승인: `{result['manual_approval_count']}/1`
- Gate 5 진입: `{str(result['next_gate_allowed']).lower()}`

자동 감사는 Gate 3 해시, 8개 상태·포즈·지속시간, 4단계 자연 연동 안무, 캐릭터 리듬 차이, 빠른 입력 취소, 허용 모션 속성, reduced-motion 정적 대체, 랜딩·검토 화면 연결, 클릭 차단 방지를 검사한다. 제품 책임자의 친근함·피로도·화면 잘림·학습 방해 검토 전에는 Gate 4를 승격하지 않는다.
""",
        encoding="utf-8",
    )
    print("GATE4_2D_PET_MOTION_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"automated_status={automated_status}")
    print(f"states={result['state_pass_count']}/8")
    print(f"reduced_motion={result['reduced_motion_pass_count']}/8")
    print(f"manual_approval={result['manual_approval_count']}/1")
    return 0 if status == "VERIFIED" else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
