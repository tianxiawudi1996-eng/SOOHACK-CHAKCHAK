#!/usr/bin/env python3
"""Build deterministic Gate 1 delivery assets from reviewed image-generation candidates."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CELL_SIZE = 1024
BOARD_SIZE = CELL_SIZE * 4
ART_LIMIT = round(CELL_SIZE * 0.84)
LABEL_TOP = 880
TARGET_BASELINE = 800

DIRECTIONS = [
    "CV-FRONT", "CV-FRONT-3Q-L", "CV-SIDE-L", "CV-BACK-3Q-L",
    "CV-BACK", "CV-BACK-3Q-R", "CV-SIDE-R", "CV-FRONT-3Q-R",
    "CV-ACCESSORY-OFF-FRONT", "CV-ACCESSORY-OFF-BACK",
    "CV-SILHOUETTE-FRONT", "CV-SILHOUETTE-SIDE",
    "CV-SILHOUETTE-3Q", "CV-READABILITY-32",
    "CV-READABILITY-64", "CV-READABILITY-128",
]

CHARACTERS = {
    "Chakchaki": {
        "source": ROOT / "evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v2.png",
        "output": ROOT / "evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png",
    },
    "Gongsickyi": {
        "source": ROOT / "evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v3.png",
        "output": ROOT / "evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png",
    },
}


def split_cells(image: Image.Image) -> list[Image.Image]:
    width, height = image.size
    cells: list[Image.Image] = []
    for index in range(16):
        row, column = divmod(index, 4)
        box = (
            round(column * width / 4),
            round(row * height / 4),
            round((column + 1) * width / 4),
            round((row + 1) * height / 4),
        )
        cells.append(image.crop(box).resize((CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS))
    return cells


def audit_mask(cell: Image.Image) -> Image.Image:
    rgb = cell.convert("RGB")
    mask = Image.new("L", (CELL_SIZE, CELL_SIZE), 0)
    source = rgb.load()
    target = mask.load()
    for y in range(5, ART_LIMIT):
        row_points = []
        for x in range(5, CELL_SIZE - 5):
            red, green, blue = source[x, y]
            if min(red, green, blue) < 232 or max(red, green, blue) - min(red, green, blue) > 18:
                row_points.append(x)
        if len(row_points) < CELL_SIZE * 0.85:
            for x in row_points:
                target[x, y] = 255
    column_counts = [sum(1 for y in range(ART_LIMIT) if target[x, y]) for x in range(CELL_SIZE)]
    x = 0
    while x < CELL_SIZE:
        if column_counts[x] <= 150:
            x += 1
            continue
        start = x
        while x < CELL_SIZE and column_counts[x] > 150:
            x += 1
        if x - start <= 8:
            for narrow_x in range(start, x):
                for y in range(ART_LIMIT):
                    target[narrow_x, y] = 0
    for y in range(64):
        for x in range(CELL_SIZE):
            target[x, y] = 0
    return mask


def subject_mask(cell: Image.Image) -> Image.Image:
    return audit_mask(cell).filter(ImageFilter.GaussianBlur(0.65))


def mask_bbox(mask: Image.Image) -> tuple[int, int, int, int]:
    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError("No subject detected in a required cell")
    return bbox


def normalized_main_cell(cell: Image.Image, target_height: int) -> Image.Image:
    audit = audit_mask(cell)
    audit_left, audit_top, audit_right, audit_bottom = mask_bbox(audit)
    mask = subject_mask(cell)
    left, top, right, bottom = mask_bbox(mask)
    layer = cell.convert("RGBA").crop((left, top, right, bottom))
    alpha = mask.crop((left, top, right, bottom))
    layer.putalpha(alpha)
    width, height = layer.size
    audit_height = audit_bottom - audit_top
    scale = min(target_height / audit_height, 980 / width)
    resized = layer.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)

    output = Image.new("RGB", (CELL_SIZE, CELL_SIZE), "white")
    label_top = LABEL_TOP
    output.paste(cell.crop((0, label_top, CELL_SIZE, CELL_SIZE)), (0, label_top))
    x = (CELL_SIZE - resized.width) // 2
    audit_baseline_offset = round((audit_bottom - top) * scale)
    y = TARGET_BASELINE - audit_baseline_offset + 1
    output.paste(resized, (x, y), resized)
    return output


def compose_board(cells: list[Image.Image]) -> Image.Image:
    board = Image.new("RGB", (BOARD_SIZE, BOARD_SIZE), "white")
    for index, cell in enumerate(cells):
        row, column = divmod(index, 4)
        board.paste(cell, (column * CELL_SIZE, row * CELL_SIZE))
    draw = ImageDraw.Draw(board)
    for coordinate in range(0, BOARD_SIZE + 1, CELL_SIZE):
        draw.line((coordinate, 0, coordinate, BOARD_SIZE), fill=(188, 188, 188), width=2)
        draw.line((0, coordinate, BOARD_SIZE, coordinate), fill=(188, 188, 188), width=2)
    return board


def save_individual_views(character: str, cells: list[Image.Image]) -> None:
    destination = ROOT / "docs/stage8/evidence/gate1/views" / character
    destination.mkdir(parents=True, exist_ok=True)
    for direction, cell in zip(DIRECTIONS, cells, strict=True):
        cell.resize((2048, 2048), Image.Resampling.LANCZOS).save(destination / f"{direction}.png", optimize=True)


def save_overlay(character: str, cells: list[Image.Image]) -> None:
    destination = ROOT / "docs/stage8/evidence/gate1/overlays"
    destination.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (2048, 2048), "white")
    palette = [
        (47, 91, 255, 68), (32, 191, 169, 68), (255, 107, 107, 68), (255, 184, 77, 68),
        (120, 81, 169, 68), (0, 151, 167, 68), (233, 30, 99, 68), (96, 125, 139, 68),
    ]
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 40), f"{character} | eight-view silhouette overlay | common baseline", fill=(23, 32, 51, 255), font=ImageFont.load_default())
    for index, cell in enumerate(cells[:8]):
        mask = audit_mask(cell).resize((2048, 2048), Image.Resampling.BILINEAR)
        tint = Image.new("RGBA", (2048, 2048), palette[index])
        canvas.alpha_composite(Image.composite(tint, Image.new("RGBA", (2048, 2048), (0, 0, 0, 0)), mask))
    draw = ImageDraw.Draw(canvas)
    draw.line((0, TARGET_BASELINE * 2, 2048, TARGET_BASELINE * 2), fill=(255, 0, 0, 255), width=4)
    canvas.convert("RGB").save(destination / f"{character}_Main_Views_Overlay.png", optimize=True)


def save_difference_sheet(character: str, cells: list[Image.Image]) -> None:
    destination = ROOT / "docs/stage8/evidence/gate1/differences"
    destination.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (4096, 2048), "white")
    for index, (direction, cell) in enumerate(zip(DIRECTIONS[:8], cells[:8], strict=True)):
        row, column = divmod(index, 4)
        annotated = cell.copy()
        mask = audit_mask(cell)
        left, top, right, bottom = mask_bbox(mask)
        draw = ImageDraw.Draw(annotated)
        draw.rectangle((left, top, right - 1, bottom - 1), outline=(255, 107, 107), width=4)
        draw.line((0, TARGET_BASELINE, CELL_SIZE, TARGET_BASELINE), fill=(32, 191, 169), width=4)
        draw.text((24, 24), f"{direction} | h={bottom - top}px | base={bottom - 1}px", fill=(23, 32, 51), font=ImageFont.load_default())
        sheet.paste(annotated, (column * CELL_SIZE, row * CELL_SIZE))
    draw = ImageDraw.Draw(sheet)
    for coordinate in range(0, 4096 + 1, CELL_SIZE):
        draw.line((coordinate, 0, coordinate, 2048), fill=(188, 188, 188), width=2)
    draw.line((0, CELL_SIZE, 4096, CELL_SIZE), fill=(188, 188, 188), width=2)
    sheet.save(destination / f"{character}_Main_Views_Difference_Annotations.png", optimize=True)


def build_character(character: str, config: dict[str, Path]) -> None:
    with Image.open(config["source"]) as source:
        source.load()
        cells = split_cells(source.convert("RGB"))
    heights = []
    height_caps = []
    for cell in cells[:8]:
        left, top, right, bottom = mask_bbox(audit_mask(cell))
        heights.append(bottom - top)
        full_left, full_top, full_right, full_bottom = mask_bbox(subject_mask(cell))
        height_caps.append((bottom - top) * 980 / (full_right - full_left))
    target_height = round(min(sum(heights) / len(heights), min(height_caps)))
    normalized = [normalized_main_cell(cell, target_height) for cell in cells[:8]] + cells[8:]
    board = compose_board(normalized)
    config["output"].parent.mkdir(parents=True, exist_ok=True)
    board.save(config["output"], optimize=True)
    save_individual_views(character, normalized)
    save_overlay(character, normalized)
    save_difference_sheet(character, normalized)
    print(f"{character}: {config['output'].relative_to(ROOT).as_posix()} ({BOARD_SIZE}x{BOARD_SIZE})")


def main() -> int:
    for character, config in CHARACTERS.items():
        build_character(character, config)
    print("GATE1_EVIDENCE_BUILT")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
