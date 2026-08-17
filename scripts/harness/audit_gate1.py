#!/usr/bin/env python3
"""Measure Gate 1 candidates and combine automated QA with the active approval policy."""

from __future__ import annotations

import hashlib
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2]
REVIEW_PATH = ROOT / "docs/stage8/evidence/gate1/candidate-review.json"
SINGLE_APPROVAL_AUDIT = ROOT / "docs/stage8/evidence/gate1/single-approval/GATE1_SINGLE_APPROVER_AUDIT_v1.0.json"
OUTPUT_JSON = ROOT / "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE1_AUTOMATED_QA.md"
CHECKSUMS = ROOT / "docs/stage8/evidence/gate1/SHA256SUMS.txt"
VIEWS_ROOT = ROOT / "docs/stage8/evidence/gate1/views"
OVERLAYS_ROOT = ROOT / "docs/stage8/evidence/gate1/overlays"
DIFFERENCES_ROOT = ROOT / "docs/stage8/evidence/gate1/differences"
WORKBOOKS = [
    ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx",
    ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx",
]

DIRECTIONS = [
    "CV-FRONT", "CV-FRONT-3Q-L", "CV-SIDE-L", "CV-BACK-3Q-L",
    "CV-BACK", "CV-BACK-3Q-R", "CV-SIDE-R", "CV-FRONT-3Q-R",
    "CV-ACCESSORY-OFF-FRONT", "CV-ACCESSORY-OFF-BACK",
    "CV-SILHOUETTE-FRONT", "CV-SILHOUETTE-SIDE",
    "CV-SILHOUETTE-3Q", "CV-READABILITY-32",
    "CV-READABILITY-64", "CV-READABILITY-128",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def subject_metrics(cell: Image.Image) -> dict:
    width, height = cell.size
    art = cell.crop((5, 5, width - 5, max(6, round(height * 0.84))))
    rgb = art.convert("RGB")
    pixels = rgb.load()
    points: list[tuple[int, int]] = []
    nonwhite = 0
    for y in range(rgb.height):
        row_count = 0
        row_points: list[tuple[int, int]] = []
        for x in range(rgb.width):
            red, green, blue = pixels[x, y]
            is_subject = min(red, green, blue) < 232 or max(red, green, blue) - min(red, green, blue) > 18
            if is_subject:
                row_count += 1
                row_points.append((x, y))
        if row_count < rgb.width * 0.85:
            points.extend(row_points)
            nonwhite += row_count
    if not points:
        return {"detected": False}
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)
    return {
        "detected": True,
        "bbox": [left, top, right + 1, bottom + 1],
        "subject_width_px": right - left + 1,
        "subject_height_px": bottom - top + 1,
        "baseline_px": bottom,
        "foreground_ratio": round(nonwhite / (rgb.width * rgb.height), 6),
        "background_white_ratio": round(1 - nonwhite / (rgb.width * rgb.height), 6),
    }


def mirror_difference(left: Image.Image, right: Image.Image) -> float:
    left_gray = left.convert("L").resize((64, 64))
    right_gray = right.convert("L").transpose(Image.Transpose.FLIP_LEFT_RIGHT).resize((64, 64))
    return round(ImageStat.Stat(ImageChops.difference(left_gray, right_gray)).mean[0], 4)


def analyze_candidate(candidate: dict) -> dict:
    path = ROOT / candidate["path"]
    actual_hash = sha256(path)
    with Image.open(path) as image:
        image.load()
        width, height = image.size
        rgb = image.convert("RGB")
        cells: list[dict] = []
        cell_images: list[Image.Image] = []
        for index, direction in enumerate(DIRECTIONS):
            row, column = divmod(index, 4)
            box = (
                round(column * width / 4),
                round(row * height / 4),
                round((column + 1) * width / 4),
                round((row + 1) * height / 4),
            )
            cell = rgb.crop(box)
            cell_images.append(cell)
            cells.append({"direction": direction, "cell_box": list(box), **subject_metrics(cell)})

        main_cells = [cell for cell in cells[:8] if cell.get("detected")]
        heights = [cell["subject_height_px"] for cell in main_cells]
        baselines = [cell["baseline_px"] for cell in main_cells]
        median_height = statistics.median(heights) if heights else 0
        max_height_deviation = max(
            (abs(value - median_height) / median_height * 100 for value in heights), default=100
        )
        baseline_spread = max(baselines, default=0) - min(baselines, default=0)
        cell_height = height / 4
        checks = {
            "hash_matches_review": actual_hash.lower() == candidate["sha256"].lower(),
            "png_decodable": True,
            "square_4x4_board": width == height and len(cells) == 16,
            "board_minimum_2048px": width >= 2048 and height >= 2048,
            "all_cells_have_detected_subject": len(main_cells) == 8,
            "main_view_height_within_3_percent": max_height_deviation <= 3,
            "main_view_baseline_within_3_percent": baseline_spread <= cell_height * 0.03,
            "side_views_not_simple_mirrors": mirror_difference(cell_images[2], cell_images[6]) >= 3,
            "front_3q_views_not_simple_mirrors": mirror_difference(cell_images[1], cell_images[7]) >= 3,
        }
        return {
            "character": candidate["character"],
            "path": candidate["path"],
            "sha256": actual_hash,
            "width": width,
            "height": height,
            "mode": image.mode,
            "cell_width_px": round(width / 4, 2),
            "cell_height_px": round(height / 4, 2),
            "median_main_subject_height_px": median_height,
            "max_main_height_deviation_percent": round(max_height_deviation, 4),
            "main_baseline_spread_px": baseline_spread,
            "mirror_difference_side": mirror_difference(cell_images[2], cell_images[6]),
            "mirror_difference_front_3q": mirror_difference(cell_images[1], cell_images[7]),
            "checks": checks,
            "cells": cells,
            "status": "PASS" if all(checks.values()) else "FAIL",
        }


def image_delivery_check(path: Path, minimum_width: int, minimum_height: int) -> dict:
    result = {
        "path": path.relative_to(ROOT).as_posix(),
        "exists": path.is_file(),
        "decodable": False,
        "width": 0,
        "height": 0,
        "minimum_width": minimum_width,
        "minimum_height": minimum_height,
        "pass": False,
    }
    if not path.is_file():
        return result
    try:
        with Image.open(path) as image:
            image.load()
            result["decodable"] = True
            result["width"], result["height"] = image.size
    except OSError:
        return result
    result["pass"] = result["width"] >= minimum_width and result["height"] >= minimum_height
    return result


def validate_delivery(character: str) -> dict:
    views = [
        image_delivery_check(VIEWS_ROOT / character / f"{direction}.png", 2048, 2048)
        for direction in DIRECTIONS
    ]
    overlay = image_delivery_check(OVERLAYS_ROOT / f"{character}_Main_Views_Overlay.png", 2048, 2048)
    difference = image_delivery_check(
        DIFFERENCES_ROOT / f"{character}_Main_Views_Difference_Annotations.png", 4096, 2048
    )
    return {
        "character": character,
        "individual_view_count": len(views),
        "individual_views_pass": all(item["pass"] for item in views),
        "overlay": overlay,
        "difference_annotation": difference,
        "pass": all(item["pass"] for item in views) and overlay["pass"] and difference["pass"],
        "views": views,
    }


def main() -> int:
    review = json.loads(REVIEW_PATH.read_text(encoding="utf-8"))
    single_approval = json.loads(SINGLE_APPROVAL_AUDIT.read_text(encoding="utf-8"))
    results = [analyze_candidate(candidate) for candidate in review.get("candidates", [])]
    deliveries = [validate_delivery(result["character"]) for result in results]
    generated_at = datetime.now(timezone.utc).isoformat()
    automated_failures = [
        f"{result['character']}: {name}"
        for result in results
        for name, passed in result["checks"].items()
        if not passed
    ]
    automated_failures.extend(
        f"{delivery['character']}: delivery package incomplete"
        for delivery in deliveries
        if not delivery["pass"]
    )
    manual_approval_count = single_approval.get("valid_approval_count", 0)
    manual_complete = (
        single_approval.get("approval_mode") == "PROJECT_OWNER_SINGLE_APPROVAL"
        and single_approval.get("status") in {"READY_FOR_PROMOTION", "PROMOTED"}
        and single_approval.get("ready_for_promotion") is True
        and manual_approval_count == 1
        and single_approval.get("reject_count") == 0
        and single_approval.get("unresolved_patch_count") == 0
        and single_approval.get("candidate_hash_drift_count") == 0
        and single_approval.get("immutable_hash_drift_count") == 0
    )
    automated_status = "PASS" if not automated_failures else "FAIL"
    if automated_status == "PASS" and manual_complete:
        status = "VERIFIED"
    elif automated_status == "PASS":
        status = "BLOCKED_EXTERNAL"
    else:
        status = "FAIL"
    failures = list(automated_failures)
    if not manual_complete:
        failures.append("single Project Owner approval is incomplete (1 accountable package approval required)")

    payload = {
        "schema_version": "1.0.0",
        "generated_at": generated_at,
        "gate": 1,
        "status": status,
        "automated_status": automated_status,
        "next_gate_allowed": status == "VERIFIED",
        "tolerance_percent": 3,
        "results": results,
        "deliveries": deliveries,
        "failures": failures,
        "approval_mode": "PROJECT_OWNER_SINGLE_APPROVAL",
        "manual_approval_count": manual_approval_count,
        "manual_approval_required": 1,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Gate 1 Automated QA",
        "",
        f"- Generated (UTC): `{generated_at}`",
        f"- Automated status: `{automated_status}`",
        f"- Gate status: `{status}`",
        "- Scale and floor-line tolerance: `+/-3%`",
        f"- Gate 2: `{'ALLOWED' if payload['next_gate_allowed'] else 'BLOCKED'}`",
        "",
        "## Candidate results",
        "",
        "| Character | Board | Max height deviation | Baseline spread | Resolution | Automated checks |",
        "|---|---|---:|---:|---|---|",
    ]
    for result in results:
        lines.append(
            f"| {result['character']} | `{result['path']}` | "
            f"{result['max_main_height_deviation_percent']}% | {result['main_baseline_spread_px']}px | "
            f"{result['width']}x{result['height']} | `{result['status']}` |"
        )
    lines += [
        "",
        "## Delivery package",
        "",
        "| Character | 2048px views | Overlay | Difference annotations | Result |",
        "|---|---:|---|---|---|",
    ]
    for delivery in deliveries:
        lines.append(
            f"| {delivery['character']} | {delivery['individual_view_count']}/16 | "
            f"{'PASS' if delivery['overlay']['pass'] else 'FAIL'} | "
            f"{'PASS' if delivery['difference_annotation']['pass'] else 'FAIL'} | "
            f"`{'PASS' if delivery['pass'] else 'FAIL'}` |"
        )
    lines += ["", "## Remaining blockers", ""]
    lines += [f"- {failure}" for failure in failures] or ["- 없음"]
    OUTPUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    checksum_paths = [ROOT / result["path"] for result in results]
    checksum_paths.extend(
        path
        for delivery in deliveries
        for path in (
            [ROOT / view["path"] for view in delivery["views"]]
            + [ROOT / delivery["overlay"]["path"], ROOT / delivery["difference_annotation"]["path"]]
        )
    )
    checksum_paths.extend(path for path in WORKBOOKS if path.is_file())
    CHECKSUMS.write_text(
        "\n".join(f"{sha256(path)}  {path.relative_to(ROOT).as_posix()}" for path in checksum_paths) + "\n",
        encoding="utf-8",
    )
    print("GATE1_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"automated_status={automated_status}")
    print(f"candidates={len(results)}")
    print(f"failures={len(failures)}")
    return 0 if status == "VERIFIED" else 1


if __name__ == "__main__":
    sys.exit(main())
