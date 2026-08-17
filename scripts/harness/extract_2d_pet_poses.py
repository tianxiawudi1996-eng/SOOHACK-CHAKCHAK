#!/usr/bin/env python3
"""Extract approved 4x2 alpha pose sheets into stable runtime sprites."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0"
ALPHA_ROOT = OUTPUT_ROOT / "alpha-sheets"
POSE_ROOT = OUTPUT_ROOT / "poses"
MANIFEST_PATH = ROOT / "docs/stage8/evidence/2d-pet/v1.0/2D_PET_RUNTIME_MANIFEST_v1.0.json"
BUILD_RECORD_PATH = OUTPUT_ROOT / "POSE_EXTRACTION_BUILD_RECORD_v1.0.json"

POSES = [
    ("P01", "IDLE_LISTEN", "idle-listen"),
    ("P02", "WELCOME", "welcome"),
    ("P03", "GUIDE", "guide"),
    ("P04", "THINK", "think"),
    ("P05", "PRAISE_PROGRESS", "praise-progress"),
    ("P06", "SEARCH", "search"),
    ("P07", "CELEBRATE", "celebrate"),
    ("P08", "RETRY", "retry"),
]

SHEETS = {
    "Chakchaki": ALPHA_ROOT / "Chakchaki_Shaded2D_PoseSheet_Alpha_v1.0.png",
    "Gongsickyi": ALPHA_ROOT / "Gongsickyi_Shaded2D_PoseSheet_Alpha_v1.0.png",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("sprite cell is fully transparent")
    return bbox


def alpha_counts(image: Image.Image) -> dict[str, int]:
    histogram = image.getchannel("A").histogram()
    return {
        "transparent_pixels": histogram[0],
        "partial_alpha_pixels": sum(histogram[1:255]),
        "opaque_pixels": histogram[255],
    }


def main() -> int:
    POSE_ROOT.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    sources: dict[str, dict] = {}
    cell_width, cell_height = 384, 512
    canvas_size = (512, 512)
    paste_x = (canvas_size[0] - cell_width) // 2

    for character, sheet_path in SHEETS.items():
        if not sheet_path.is_file():
            raise SystemExit(f"missing alpha sheet: {relative(sheet_path)}")
        with Image.open(sheet_path) as source_image:
            sheet = source_image.convert("RGBA")
        if sheet.size != (1536, 1024):
            raise SystemExit(f"unexpected alpha sheet size: {character} {sheet.size}")
        sources[character] = {
            "path": relative(sheet_path),
            "sha256": sha256(sheet_path),
            "width": sheet.width,
            "height": sheet.height,
            "mode": sheet.mode,
        }

        png_dir = POSE_ROOT / "png" / character
        webp_dir = POSE_ROOT / "webp" / character
        png_dir.mkdir(parents=True, exist_ok=True)
        webp_dir.mkdir(parents=True, exist_ok=True)
        character_slug = character.lower()

        for index, (pose_id, state, name_slug) in enumerate(POSES):
            row, column = divmod(index, 4)
            source_box = (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
            cell = sheet.crop(source_box)
            canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            canvas.alpha_composite(cell, (paste_x, 0))
            bbox = alpha_bbox(canvas)
            counts = alpha_counts(canvas)
            visible_pixels = counts["opaque_pixels"] + counts["partial_alpha_pixels"]
            if visible_pixels < 10000:
                raise SystemExit(f"insufficient visible pixels: {character} {pose_id}")
            corners = [canvas.getpixel((0, 0))[3], canvas.getpixel((511, 0))[3], canvas.getpixel((0, 511))[3], canvas.getpixel((511, 511))[3]]
            if any(corners):
                raise SystemExit(f"non-transparent corner: {character} {pose_id}")

            stem = f"{character_slug}_{pose_id.lower()}_{name_slug}_v1.0"
            png_path = png_dir / f"{stem}.png"
            webp_path = webp_dir / f"{stem}.webp"
            canvas.save(png_path, format="PNG", optimize=True)
            canvas.save(webp_path, format="WEBP", lossless=True, quality=100, method=6)
            records.append({
                "character": character,
                "pose_id": pose_id,
                "state": state,
                "source_index": index + 1,
                "source_box": list(source_box),
                "canvas": {"width": 512, "height": 512},
                "pivot_normalized": {"x": 0.5, "y": 1.0},
                "visible_bbox": list(bbox),
                "alpha": counts,
                "png": {
                    "path": relative(png_path),
                    "sha256": sha256(png_path),
                    "bytes": png_path.stat().st_size,
                },
                "webp": {
                    "path": relative(webp_path),
                    "sha256": sha256(webp_path),
                    "bytes": webp_path.stat().st_size,
                    "lossless": True,
                },
            })

    generated_at = datetime.now(timezone.utc).isoformat()
    manifest = {
        "schema_version": "1.0.0",
        "generated_at": generated_at,
        "gate": 3,
        "status": "CANDIDATE_BUILT",
        "strategy": "SHADED_2D_PET",
        "source_sheets": sources,
        "pose_count": len(records),
        "expected_pose_count": 16,
        "formats": ["PNG", "WEBP_LOSSLESS"],
        "canvas": {"width": 512, "height": 512},
        "pivot_policy": "BOTTOM_CENTER_NORMALIZED_0.5_1.0",
        "poses": records,
        "manual_approval_required": 1,
        "manual_approval_count": 0,
        "next_gate_allowed": False,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    build_record = {
        "schema_version": "1.0.0",
        "generated_at": generated_at,
        "status": "CANDIDATE_BUILT",
        "script": relative(Path(__file__).resolve()),
        "runtime_manifest": relative(MANIFEST_PATH),
        "runtime_manifest_sha256": sha256(MANIFEST_PATH),
        "alpha_sources": sources,
        "png_count": len(records),
        "webp_count": len(records),
        "failures": [],
        "next_gate_allowed": False,
    }
    BUILD_RECORD_PATH.write_text(json.dumps(build_record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("2D_PET_POSE_EXTRACTION_COMPLETE")
    print(f"poses={len(records)}/16")
    print(f"png={len(records)}")
    print(f"webp={len(records)}")
    print(f"manifest={relative(MANIFEST_PATH)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
