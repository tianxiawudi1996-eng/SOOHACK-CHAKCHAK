#!/usr/bin/env python3
"""Build review boards and audit Blender-produced high-fidelity Gate 2 candidates."""

from __future__ import annotations

import hashlib
import json
import struct
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity"
BUILD = OUT / "BUILD_RECORD_v2.0.json"
EVIDENCE = ROOT / "docs/stage8/evidence/gate2-high-fidelity"
BOARDS = EVIDENCE / "review"
QA = EVIDENCE / "GATE2_HIGH_FIDELITY_AUTOMATED_QA_v2.0.json"
REPORT = EVIDENCE / "GATE2_HIGH_FIDELITY_REPORT_v2.0.md"
EVIDENCE.mkdir(parents=True, exist_ok=True)
BOARDS.mkdir(parents=True, exist_ok=True)

REFERENCES = {
    "Chakchaki": ROOT / "evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png",
    "Gongsickyi": ROOT / "evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().lower()


def parse_glb(path: Path) -> dict:
    raw = path.read_bytes()
    if len(raw) < 20 or raw[:4] != b"glTF":
        raise ValueError("invalid GLB header")
    version, total = struct.unpack_from("<II", raw, 4)
    if version != 2 or total != len(raw):
        raise ValueError("invalid GLB version or length")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise ValueError("missing GLB JSON chunk")
    return json.loads(raw[20:20 + json_length].decode("utf-8").rstrip(" \x00"))


def font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def review_board(character: str, render_paths: list[Path]) -> Path:
    canvas = Image.new("RGB", (1800, 1500), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((50, 28), f"{character} — CANONICAL REFERENCE vs BLENDER 5.2 CANDIDATE v2.0",
              fill="#172033", font=font(34, True))
    reference = Image.open(REFERENCES[character]).convert("RGB")
    reference = ImageOps.contain(reference, (1700, 650), Image.Resampling.LANCZOS)
    canvas.paste(reference, ((1800 - reference.width) // 2, 85))
    draw.line((50, 760, 1750, 760), fill="#D8DEE9", width=3)
    labels = ["BLENDER FRONT", "BLENDER SIDE-L", "BLENDER FRONT-3Q-L"]
    for index, (path, label) in enumerate(zip(render_paths, labels)):
        image = Image.open(path).convert("RGB")
        image = ImageOps.contain(image, (540, 620), Image.Resampling.LANCZOS)
        x = 45 + index * 580 + (540 - image.width) // 2
        canvas.paste(image, (x, 815))
        draw.text((55 + index * 580, 1440), label, fill="#172033", font=font(24, True))
    destination = BOARDS / f"{character}_Canonical_vs_HighFidelity_v2.0.png"
    canvas.save(destination, optimize=True)
    return destination


def main() -> int:
    build = json.loads(BUILD.read_text(encoding="utf-8"))
    failures: list[str] = []
    character_results = []
    for character in build.get("characters", []):
        name = character.get("character")
        source = ROOT / character.get("source", "")
        if not source.is_file() or source.stat().st_size < 100_000:
            failures.append(f"{name}:BLEND_SOURCE_MISSING_OR_TOO_SMALL")
        renders = [ROOT / item for item in character.get("renders", [])]
        if len(renders) != 3 or any(not path.is_file() for path in renders):
            failures.append(f"{name}:RENDER_MATRIX_INCOMPLETE")
            board = None
        else:
            board = review_board(name, renders)
        lod_results = []
        triangles = []
        for item in character.get("lods", []):
            path = ROOT / item.get("path", "")
            try:
                document = parse_glb(path)
                result = {
                    **item,
                    "sha256": sha256(path),
                    "bytes": path.stat().st_size,
                    "gltf_version": document.get("asset", {}).get("version"),
                    "mesh_count": len(document.get("meshes", [])),
                    "material_count_exported": len(document.get("materials", [])),
                    "status": "PASS",
                }
                if result["gltf_version"] != "2.0" or result["mesh_count"] < 10:
                    raise ValueError("incomplete glTF structure")
                triangles.append(item.get("triangles", 0))
                lod_results.append(result)
            except Exception as exc:
                failures.append(f"{name}:LOD{item.get('lod')}:{exc}")
        if len(lod_results) != 3:
            failures.append(f"{name}:LOD_MATRIX_INCOMPLETE")
        elif not (triangles[0] > triangles[1] > triangles[2] > 0):
            failures.append(f"{name}:LOD_TRIANGLE_ORDER_INVALID")
        character_results.append({
            "character": name,
            "source_path": source.relative_to(ROOT).as_posix(),
            "source_sha256": sha256(source) if source.is_file() else None,
            "modules": character.get("modules", []),
            "renders": [{"path": p.relative_to(ROOT).as_posix(), "sha256": sha256(p)} for p in renders if p.is_file()],
            "review_board": board.relative_to(ROOT).as_posix() if board else None,
            "review_board_sha256": sha256(board) if board else None,
            "lods": lod_results,
        })
    status = "BLOCKED_EXTERNAL" if not failures else "FAIL"
    payload = {
        "schema_version": "2.0.0",
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "gate": 2,
        "status": status,
        "automated_status": "PASS" if not failures else "FAIL",
        "blender_version": build.get("blender_version"),
        "blend_sources_passed": sum(bool(c.get("source_sha256")) for c in character_results),
        "glb_models_passed": sum(len(c.get("lods", [])) for c in character_results),
        "renders_passed": sum(len(c.get("renders", [])) for c in character_results),
        "characters": character_results,
        "failures": failures,
        "manual_visual_review_required": 1,
        "manual_visual_review_count": 0,
        "blockers": ["PROJECT_OWNER_CANONICAL_IDENTITY_AND_QUALITY_REVIEW_REQUIRED"] if not failures else [],
        "gate2_status_change_applied": False,
        "next_gate_allowed": False,
    }
    QA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.write_text(
        "# Gate 2 고품질 캐릭터 후보 보고 v2.0\n\n"
        f"- 자동 상태: `{payload['automated_status']}`\n"
        f"- Blender 원본: `{payload['blend_sources_passed']}/2`\n"
        f"- LOD GLB: `{payload['glb_models_passed']}/6`\n"
        f"- 세 방향 렌더: `{payload['renders_passed']}/6`\n"
        "- 시각 승인: `0/1 PENDING`\n"
        "- Gate 2: `NOT_VERIFIED`\n"
        "- Gate 3: `NOT_STARTED`\n\n"
        "자동 검사는 파일·해시·glTF 구조·LOD 순서만 확인한다. 기존 승인 캐릭터와 같은 정체성인지, 실제 제품에 사용할 품질인지에 대한 프로젝트 책임자의 시각 승인이 필요하다.\n",
        encoding="utf-8",
    )
    print(status)
    print(f"blend={payload['blend_sources_passed']}/2 glb={payload['glb_models_passed']}/6 renders={payload['renders_passed']}/6")
    return 1 if status == "BLOCKED_EXTERNAL" else 2


if __name__ == "__main__":
    raise SystemExit(main())
