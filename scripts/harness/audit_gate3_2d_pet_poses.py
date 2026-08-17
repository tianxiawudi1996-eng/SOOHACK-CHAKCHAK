#!/usr/bin/env python3
"""Audit Gate 3 2D pet pose extraction and runtime sprite fidelity."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[2]
PET_ROOT = ROOT / "docs/stage8/evidence/2d-pet/v1.0"
MANIFEST_PATH = PET_ROOT / "2D_PET_RUNTIME_MANIFEST_v1.0.json"
REVIEW_PATH = PET_ROOT / "GATE3_2D_PET_MANUAL_REVIEW_v1.0.json"
OUTPUT_JSON = PET_ROOT / "GATE3_2D_PET_AUTOMATED_QA_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE3_2D_PET_POSE_AUDIT.md"


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


def image_rgba(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return image.convert("RGBA")


def main() -> int:
    failures: list[str] = []
    records: list[dict] = []
    try:
        manifest = load_json(MANIFEST_PATH)
        review = load_json(REVIEW_PATH)
    except RuntimeError as exc:
        print(f"GATE3_2D_QA_FAIL: {exc}", file=sys.stderr)
        return 2

    poses = manifest.get("poses", [])
    expected_pairs = {(character, f"P{index:02d}") for character in ("Chakchaki", "Gongsickyi") for index in range(1, 9)}
    actual_pairs = {(item.get("character"), item.get("pose_id")) for item in poses}
    if len(poses) != 16 or actual_pairs != expected_pairs:
        failures.append("POSE_MATRIX_INCOMPLETE")
    if len({item.get("state") for item in poses if item.get("character") == "Chakchaki"}) != 8:
        failures.append("CHAKCHAKI_STATE_MATRIX_INVALID")
    if len({item.get("state") for item in poses if item.get("character") == "Gongsickyi"}) != 8:
        failures.append("GONGSICKYI_STATE_MATRIX_INVALID")

    source_images: dict[str, Image.Image] = {}
    for character, source_record in manifest.get("source_sheets", {}).items():
        path = ROOT / source_record.get("path", "")
        if not path.is_file() or sha256(path) != source_record.get("sha256", "").lower():
            failures.append(f"SOURCE_SHEET_HASH_MISMATCH:{character}")
            continue
        source = image_rgba(path)
        if source.size != (1536, 1024) or source.mode != "RGBA":
            failures.append(f"SOURCE_SHEET_METADATA_INVALID:{character}")
            continue
        source_images[character] = source

    for item in poses:
        character = item.get("character")
        pose_id = item.get("pose_id")
        record_failures: list[str] = []
        png_record = item.get("png", {})
        webp_record = item.get("webp", {})
        png_path = ROOT / png_record.get("path", "")
        webp_path = ROOT / webp_record.get("path", "")
        for path, expected, label in (
            (png_path, png_record.get("sha256", "").lower(), "PNG"),
            (webp_path, webp_record.get("sha256", "").lower(), "WEBP"),
        ):
            if not path.is_file():
                record_failures.append(f"{label}_MISSING")
            elif sha256(path) != expected:
                record_failures.append(f"{label}_HASH_MISMATCH")
        if record_failures:
            failures.extend(f"{character}:{pose_id}:{failure}" for failure in record_failures)
            continue

        png = image_rgba(png_path)
        webp = image_rgba(webp_path)
        if png.size != (512, 512) or webp.size != (512, 512):
            record_failures.append("CANVAS_SIZE_INVALID")
        if png.getpixel((0, 0))[3] != 0 or png.getpixel((511, 511))[3] != 0:
            record_failures.append("PNG_CORNERS_NOT_TRANSPARENT")
        if webp.getpixel((0, 0))[3] != 0 or webp.getpixel((511, 511))[3] != 0:
            record_failures.append("WEBP_CORNERS_NOT_TRANSPARENT")
        bbox = png.getchannel("A").getbbox()
        if bbox is None or list(bbox) != item.get("visible_bbox"):
            record_failures.append("VISIBLE_BBOX_MISMATCH")
        if item.get("pivot_normalized") != {"x": 0.5, "y": 1.0}:
            record_failures.append("PIVOT_INVALID")

        source = source_images.get(character)
        source_box = item.get("source_box", [])
        if source is None or len(source_box) != 4:
            record_failures.append("SOURCE_REFERENCE_INVALID")
        else:
            expected_canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
            expected_canvas.alpha_composite(source.crop(tuple(source_box)), (64, 0))
            if ImageChops.difference(png, expected_canvas).getbbox() is not None:
                record_failures.append("PNG_NOT_PIXEL_IDENTICAL_TO_SOURCE_CELL")

        visible_diff = ImageChops.difference(png, webp)
        if visible_diff.getbbox() is not None:
            record_failures.append("LOSSLESS_WEBP_PIXEL_MISMATCH")

        failures.extend(f"{character}:{pose_id}:{failure}" for failure in record_failures)
        records.append({
            "character": character,
            "pose_id": pose_id,
            "state": item.get("state"),
            "png_path": relative(png_path),
            "webp_path": relative(webp_path),
            "visible_bbox": list(bbox) if bbox else None,
            "status": "PASS" if not record_failures else "FAIL",
            "failures": record_failures,
        })

    automated_status = "PASS" if not failures and len(records) == 16 else "FAIL"
    review_pending = review.get("status") == "PENDING" and review.get("decision") is None
    if automated_status == "PASS" and review_pending:
        status = "BLOCKED_EXTERNAL"
        blockers = ["PROJECT_OWNER_GATE3_ALPHA_AND_SPRITE_REVIEW_REQUIRED"]
    elif automated_status == "PASS" and review.get("status") == "APPROVED":
        status = "VERIFIED"
        blockers = []
    else:
        status = "FAIL"
        blockers = []

    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 3,
        "status": status,
        "automated_status": automated_status,
        "runtime_manifest": relative(MANIFEST_PATH),
        "runtime_manifest_sha256": sha256(MANIFEST_PATH),
        "pose_pass_count": sum(item["status"] == "PASS" for item in records),
        "pose_expected_count": 16,
        "png_pass_count": sum(item["status"] == "PASS" for item in records),
        "webp_pass_count": sum(item["status"] == "PASS" for item in records),
        "source_cell_pixel_match_count": sum(item["status"] == "PASS" for item in records),
        "poses": records,
        "failures": failures,
        "manual_approval_required": 1,
        "manual_approval_count": 1 if review.get("status") == "APPROVED" else 0,
        "blockers": blockers,
        "gate3_status_change_applied": review.get("approval_applied") is True,
        "next_gate_allowed": review.get("next_gate_allowed") is True,
    }
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT_MD.write_text(
        f"""# Gate 3 음영 2D 포즈·알파 감사

- 상태: `{status}`
- 자동 QA: `{automated_status}`
- 포즈: `{result['pose_pass_count']}/16`
- PNG: `{result['png_pass_count']}/16`
- 무손실 WebP: `{result['webp_pass_count']}/16`
- 승인 알파 시트 셀 픽셀 일치: `{result['source_cell_pixel_match_count']}/16`
- 수동 승인: `{result['manual_approval_count']}/1`
- Gate 4 진입: `{str(result['next_gate_allowed']).lower()}`

자동 감사는 파일·해시·512×512 캔버스·투명 코너·피벗·원본 셀 픽셀 일치·PNG/WebP 픽셀 일치를 검사한다. 제품 책임자의 알파 경계와 작은 UI 가독성 검토 전에는 Gate 3를 승격하지 않는다.
""",
        encoding="utf-8",
    )
    print("GATE3_2D_PET_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"automated_status={automated_status}")
    print(f"poses={result['pose_pass_count']}/16")
    print(f"source_pixel_matches={result['source_cell_pixel_match_count']}/16")
    print(f"manual_approval={result['manual_approval_count']}/1")
    return 0 if status == "VERIFIED" else (2 if failures else 1)


if __name__ == "__main__":
    sys.exit(main())
