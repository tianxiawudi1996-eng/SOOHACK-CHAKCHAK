#!/usr/bin/env python3
"""Audit Gate 5 deterministic AI behavior, canonical copy, and browser controls."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PET_ROOT = ROOT / "docs/stage8/evidence/2d-pet/v1.0"
MANIFEST_PATH = PET_ROOT / "AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json"
REVIEW_PATH = PET_ROOT / "GATE5_AI_BEHAVIOR_MANUAL_REVIEW_v1.0.json"
BROWSER_QA_PATH = PET_ROOT / "GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json"
GATE4_MANIFEST_PATH = PET_ROOT / "2D_PET_MOTION_MANIFEST_v1.0.json"
GATE3_MANIFEST_PATH = PET_ROOT / "2D_PET_RUNTIME_MANIFEST_v1.0.json"
OUTPUT_JSON = PET_ROOT / "GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE5_AI_BEHAVIOR_AUDIT.md"

STATES = ["Neutral", "Welcome", "Happy", "Listen", "Think", "Curious", "Guide", "Search", "Praise", "Retry", "Concern", "Celebrate", "Wait", "Rest", "Error"]
MOTION_STATES = {"IDLE_LISTEN", "WELCOME", "GUIDE", "THINK", "PRAISE_PROGRESS", "SEARCH", "CELEBRATE", "RETRY"}
EVENTS = {
    "EVT-001": ("page.enter.home", "Welcome", "Chakchaki", 2, "BUB-WEL-01"),
    "EVT-002": ("learning.start", "Welcome", "Chakchaki", 1, "BUB-CHO-01"),
    "EVT-003": ("concept.open", "Guide", "Gongsickyi", 1, "BUB-GUI-01"),
    "EVT-004": ("input.started", "Listen", "Both", 1, None),
    "EVT-005": ("idle.4s", "Think", "Gongsickyi", 4, None),
    "EVT-006": ("hint.request", "Curious", "Gongsickyi", 1, "BUB-HIN-01"),
    "EVT-007": ("answer.correct", "Praise", "Gongsickyi", 1, "BUB-PRA-01"),
    "EVT-008": ("answer.wrong.first", "Retry", "Gongsickyi", 1, "BUB-RET-01"),
    "EVT-009": ("answer.wrong.repeated", "Concern", "Gongsickyi", 1, "BUB-RET-02"),
    "EVT-010": ("search.loading.5s", "Search", "Gongsickyi", 3, "BUB-SRC-01"),
    "EVT-011": ("search.empty", "Search", "Gongsickyi", 2, "BUB-EMP-01"),
    "EVT-012": ("diagnosis.complete", "Celebrate", "Both", 1, "BUB-CMP-01"),
    "EVT-013": ("learning.complete", "Celebrate", "Both", 1, "BUB-CMP-01"),
    "EVT-014": ("network.error", "Error", "Gongsickyi", 0, "BUB-ERR-01"),
    "EVT-015": ("idle.3m", "Rest", "Chakchaki", 5, "BUB-RST-01"),
}
BUBBLES = {
    "BUB-GUI-01": "공식의 뜻부터 같이 볼까?",
    "BUB-HIN-01": "여기부터 떠올려보자.",
    "BUB-PRA-01": "착! 정확하게 기억했어.",
    "BUB-RET-01": "괜찮아, 한 단계만 다시 해보자.",
    "BUB-RET-02": "식의 첫 부분만 확인해볼까?",
    "BUB-SRC-01": "관련 내용을 찾고 있어.",
    "BUB-EMP-01": "조건을 바꾸면 찾을 수 있어.",
    "BUB-CMP-01": "오늘 학습을 끝냈어!",
    "BUB-ERR-01": "연결을 확인하고 다시 시도해보자.",
    "BUB-WEL-01": "오늘도 한 단계씩 해볼까?",
    "BUB-CHO-01": "어떤 학습부터 시작할까?",
    "BUB-PRG-01": "이제 한 단계만 더 하면 돼.",
    "BUB-RST-01": "잠깐 쉬었다 이어가도 좋아.",
}
EXPECTED_BROWSER_TESTS = {"api_contract", "event_matrix", "priority_preemption", "single_queue", "input_protection", "privacy_log", "mascot_hidden_mode", "viewport_and_pointer", "reduced_motion"}


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"invalid JSON {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON root must be object: {path.relative_to(ROOT)}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> int:
    failures: list[str] = []
    try:
        manifest = load_json(MANIFEST_PATH)
        review = load_json(REVIEW_PATH)
        browser = load_json(BROWSER_QA_PATH)
        gate4 = load_json(GATE4_MANIFEST_PATH)
        gate3 = load_json(GATE3_MANIFEST_PATH)
    except RuntimeError as exc:
        print(f"GATE5_AI_BEHAVIOR_FAIL: {exc}", file=sys.stderr)
        return 2

    if gate4.get("status") != "APPROVED" or gate4.get("manual_approval_count") != 1 or gate4.get("next_gate_allowed") is not True:
        failures.append("GATE4_APPROVAL_PREREQUISITE_MISSING")
    source_motion = manifest.get("source_motion_manifest", {})
    if source_motion.get("sha256", "").lower() != sha256(GATE4_MANIFEST_PATH):
        failures.append("GATE4_MOTION_MANIFEST_HASH_MISMATCH")
    if source_motion.get("approved_pose_count") != 16 or gate3.get("pose_count") != 16:
        failures.append("APPROVED_POSE_COUNT_INVALID")

    workbook_record = manifest.get("source_stage7_workbook", {})
    workbook_path = ROOT / workbook_record.get("path", "")
    if not workbook_path.is_file():
        failures.append("STAGE7_WORKBOOK_MISSING")
    elif workbook_record.get("sha256", "").lower() != sha256(workbook_path) or workbook_record.get("bytes") != workbook_path.stat().st_size:
        failures.append("STAGE7_WORKBOOK_IDENTITY_MISMATCH")
    if (workbook_record.get("state_count"), workbook_record.get("event_count"), workbook_record.get("bubble_count"), workbook_record.get("rule_count")) != (15, 15, 13, 10):
        failures.append("STAGE7_CANONICAL_COUNTS_INVALID")

    implementations = manifest.get("implementation", {})
    implementation_results = []
    for kind in ("stylesheet", "runtime"):
        item = implementations.get(kind, {})
        path = ROOT / item.get("path", "")
        item_failures = []
        if not path.is_file():
            item_failures.append("FILE_MISSING")
        else:
            if item.get("sha256", "").lower() != sha256(path):
                item_failures.append("HASH_MISMATCH")
            if item.get("bytes") != path.stat().st_size:
                item_failures.append("BYTE_SIZE_MISMATCH")
        failures.extend(f"{kind}:{failure}" for failure in item_failures)
        implementation_results.append({"kind": kind, "path": item.get("path"), "status": "PASS" if not item_failures else "FAIL", "failures": item_failures})

    if manifest.get("canonical_states") != STATES or set(manifest.get("motion_mapping", {}).values()) != MOTION_STATES:
        failures.append("STATE_TO_APPROVED_MOTION_MAPPING_INVALID")
    if set(manifest.get("motion_mapping", {})) != set(STATES):
        failures.append("CANONICAL_STATE_MATRIX_INCOMPLETE")

    event_rows = manifest.get("events", [])
    by_id = {item.get("id"): item for item in event_rows}
    if len(event_rows) != 15 or set(by_id) != set(EVENTS):
        failures.append("EVENT_MATRIX_INCOMPLETE")
    event_results = []
    for event_id, expected in EVENTS.items():
        item = by_id.get(event_id, {})
        observed = (item.get("trigger"), item.get("state"), item.get("character"), item.get("priority"), item.get("bubble_id"))
        passed = observed == expected
        if not passed:
            failures.append(f"EVENT_MAPPING_INVALID:{event_id}")
        event_results.append({"event_id": event_id, "trigger": item.get("trigger"), "status": "PASS" if passed else "FAIL"})
    if set(manifest.get("bubble_ids", [])) != set(BUBBLES) or len(manifest.get("bubble_ids", [])) != 13:
        failures.append("BUBBLE_LIBRARY_INCOMPLETE")

    controls = manifest.get("runtime_controls", {})
    required_true = ["input_protection", "higher_priority_preempts", "identical_bubble_repeat_suppression", "single_primary_speaker", "page_exit_queue_clear", "mascot_visibility_toggle", "answer_reveal_prohibited"]
    if any(controls.get(key) is not True for key in required_true) or controls.get("queue_capacity") != 1 or controls.get("log_limit") != 50 or controls.get("log_context_values") is not False:
        failures.append("RUNTIME_CONTROL_CONTRACT_INVALID")

    css_path = ROOT / implementations.get("stylesheet", {}).get("path", "")
    js_path = ROOT / implementations.get("runtime", {}).get("path", "")
    css = css_path.read_text(encoding="utf-8") if css_path.is_file() else ""
    js = js_path.read_text(encoding="utf-8") if js_path.is_file() else ""
    landing = (ROOT / "mock.html").read_text(encoding="utf-8")
    review_page = (PET_ROOT / "gate5-review/index.html").read_text(encoding="utf-8")
    for event_id, (trigger, *_rest) in EVENTS.items():
        if event_id not in js or trigger not in js or f'data-ai-event-trigger="{trigger}"' not in review_page:
            failures.append(f"EVENT_RUNTIME_OR_REVIEW_CONTROL_MISSING:{event_id}")
    for bubble_id, copy in BUBBLES.items():
        if bubble_id not in js or copy not in js:
            failures.append(f"CANONICAL_BUBBLE_COPY_MISSING:{bubble_id}")
    for marker in ("mathChakChakBehavior", "SUPPRESSED_INPUT_PROTECTION", "APPLIED_PREEMPTED_LOWER_PRIORITY", "BUBBLE_REPEAT_SUPPRESSED", "pagehide", "setMascotsHidden", "MAX_LOGS", "cooldownPass"):
        if marker not in js:
            failures.append(f"RUNTIME_CONTROL_MISSING:{marker}")
    if "@media (prefers-reduced-motion: reduce)" not in css or ".ai-mascots-hidden" not in css:
        failures.append("BEHAVIOR_ACCESSIBILITY_CSS_MISSING")
    if re.search(r"transition\s*:[^;]*(?:filter|width|height|margin|padding|top|left|right|bottom)", css):
        failures.append("BEHAVIOR_LAYOUT_OR_FILTER_TRANSITION_FOUND")
    for page_name, page in (("LANDING", landing), ("REVIEW", review_page)):
        if "ai-behavior-v1.0.css" not in page or "ai-behavior-v1.0.js" not in page or "data-ai-bubble" not in page:
            failures.append(f"{page_name}_BEHAVIOR_BUNDLE_NOT_LINKED")
    if review_page.count("data-ai-event-trigger=") != 15 or review_page.count("data-pet-character=") != 2:
        failures.append("REVIEW_PAGE_CONTROL_MATRIX_INVALID")

    approved_assets = {pose[fmt]["path"] for pose in gate3.get("poses", []) for fmt in ("png", "webp")}
    review_assets = {path.lstrip("/") for path in re.findall(r'<img[^>]+src="([^"]+)"', review_page)}
    if not review_assets or not review_assets.issubset(approved_assets):
        failures.append("UNAPPROVED_REVIEW_IMAGE_FOUND")

    browser_tests = browser.get("tests", {})
    browser_pass = browser.get("status") == "PASS" and not browser.get("failures") and set(browser_tests) == EXPECTED_BROWSER_TESTS and all(item.get("status") == "PASS" for item in browser_tests.values())
    if not browser_pass:
        failures.append("BROWSER_RUNTIME_QA_FAILED")

    automated_status = "PASS" if not failures else "FAIL"
    review_pending = review.get("status") == "PENDING" and review.get("decision") is None
    review_approved = review.get("status") == "APPROVED" and review.get("decision") == "APPROVE" and review.get("approval_applied") is True
    if automated_status == "PASS" and review_pending:
        status, blockers = "BLOCKED_EXTERNAL", ["PROJECT_OWNER_GATE5_AI_BEHAVIOR_REVIEW_REQUIRED"]
    elif automated_status == "PASS" and review_approved:
        status, blockers = "VERIFIED", []
    else:
        status, blockers = "FAIL", []

    result = {
        "schema_version": "1.0.0", "generated_at": datetime.now(timezone.utc).isoformat(), "gate": 5,
        "status": status, "automated_status": automated_status,
        "manifest": rel(MANIFEST_PATH), "manifest_sha256": sha256(MANIFEST_PATH),
        "state_pass_count": 15 if "CANONICAL_STATE_MATRIX_INCOMPLETE" not in failures and "STATE_TO_APPROVED_MOTION_MAPPING_INVALID" not in failures else 0,
        "state_expected_count": 15, "event_pass_count": sum(item["status"] == "PASS" for item in event_results), "event_expected_count": 15,
        "bubble_pass_count": sum(bubble_id in js and copy in js for bubble_id, copy in BUBBLES.items()), "bubble_expected_count": 13,
        "implementation_pass_count": sum(item["status"] == "PASS" for item in implementation_results), "implementation_expected_count": 2,
        "browser_runtime_pass": browser_pass, "browser_runtime_qa": rel(BROWSER_QA_PATH), "events": event_results, "implementations": implementation_results,
        "failures": failures, "manual_approval_required": 1, "manual_approval_count": 1 if review_approved else 0,
        "blockers": blockers, "gate5_status_change_applied": review.get("approval_applied") is True, "next_gate_allowed": review.get("next_gate_allowed") is True,
    }
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT_MD.write_text(
        f"""# Gate 5 AI 행동 연동 감사\n\n- 상태: `{status}`\n- 자동 QA: `{automated_status}`\n- 정본 상태 매핑: `{result['state_pass_count']}/15`\n- 이벤트 매핑: `{result['event_pass_count']}/15`\n- 말풍선 정본 문구: `{result['bubble_pass_count']}/13`\n- CSS/JS 구현: `{result['implementation_pass_count']}/2`\n- 실제 Edge 런타임 검사: `{str(browser_pass).lower()}`\n- 제품 책임자 수동 승인: `{result['manual_approval_count']}/1`\n- Gate 6 진입: `{str(result['next_gate_allowed']).lower()}`\n\n자동 감사는 Stage 7 정본 해시, 15개 상태·이벤트, 13개 말풍선, 우선순위·입력 보호·대기열·반복 억제·개인정보 최소화·캐릭터 숨김·모션 축소와 승인 자산만 사용했는지를 검증한다. 자동 QA 통과와 제품 책임자 수동 승인을 분리하며, 승인 전에는 Gate 6를 열지 않는다.\n""",
        encoding="utf-8",
    )
    print("GATE5_AI_BEHAVIOR_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"automated_status={automated_status}")
    print(f"states={result['state_pass_count']}/15 events={result['event_pass_count']}/15 bubbles={result['bubble_pass_count']}/13")
    print(f"manual_approval={result['manual_approval_count']}/1")
    return 0 if status == "VERIFIED" else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
