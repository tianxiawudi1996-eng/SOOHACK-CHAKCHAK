#!/usr/bin/env python3
"""Audit Stage 8 Gate 2 GLB, topology, LOD, material and manual-review evidence."""

from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = ROOT / "docs/stage8/evidence/gate2"
MANIFEST_PATH = EVIDENCE_ROOT / "GATE2_BUILD_MANIFEST_v1.0.json"
REVIEW_PATH = EVIDENCE_ROOT / "GATE2_MANUAL_REVIEW_v1.0.json"
OUTPUT_JSON = EVIDENCE_ROOT / "GATE2_AUTOMATED_QA_v1.0.json"
OUTPUT_MD = ROOT / "docs/stage8/audits/GATE2_BASE_MESH_MATERIAL_AUDIT.md"
STATUS_PATH = ROOT / "harness/status.json"

REQUIRED_MODULES = {
    "Chakchaki": {
        "Head", "Hair", "Fringe", "Eyes", "Eyebrows", "Eyelids", "Mouth", "Cheeks", "Ears", "Nose",
        "Cap", "CapBadge", "Body", "Hoodie", "Shorts", "Arms", "Hands", "Fingers", "Legs", "Shoes", "Backpack",
    },
    "Gongsickyi": {
        "Body", "Eyes", "Eyebrows", "Eyelids", "MouthBeak", "Cheeks", "Glasses", "GraduationCap", "Wings", "Feet", "StarPointer",
    },
}

SOURCE_FILES = {
    "Chakchaki": ROOT / "evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png",
    "Gongsickyi": ROOT / "evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png",
}

COMPONENT_INFO = {
    5123: ("H", 2),
    5125: ("I", 4),
    5126: ("f", 4),
}
TYPE_WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"cannot load {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"invalid JSON root: {path.relative_to(ROOT)}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def valid_timestamp(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None


def read_glb(path: Path) -> tuple[dict, bytes]:
    payload = path.read_bytes()
    if len(payload) < 20:
        raise RuntimeError("GLB_TOO_SMALL")
    magic, version, declared_length = struct.unpack_from("<4sII", payload, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(payload):
        raise RuntimeError("GLB_HEADER_INVALID")
    offset = 12
    json_chunk = None
    binary_chunk = None
    while offset + 8 <= len(payload):
        chunk_length, chunk_type = struct.unpack_from("<I4s", payload, offset)
        offset += 8
        chunk = payload[offset:offset + chunk_length]
        offset += chunk_length
        if chunk_type == b"JSON":
            json_chunk = chunk
        elif chunk_type == b"BIN\x00":
            binary_chunk = chunk
    if json_chunk is None or binary_chunk is None or offset != len(payload):
        raise RuntimeError("GLB_CHUNKS_INVALID")
    return json.loads(json_chunk.decode("utf-8")), binary_chunk


def accessor_values(gltf: dict, binary: bytes, accessor_index: int) -> list[tuple | int]:
    accessor = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    component_type = accessor["componentType"]
    fmt, component_size = COMPONENT_INFO[component_type]
    width = TYPE_WIDTH[accessor["type"]]
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", component_size * width)
    values = []
    for index in range(accessor["count"]):
        value = struct.unpack_from("<" + fmt * width, binary, start + index * stride)
        values.append(value[0] if width == 1 else value)
    return values


def triangle_area_squared(a, b, c) -> float:
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    cross = (
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    )
    return sum(value * value for value in cross) / 4


def topology_metrics(gltf: dict, binary: bytes, primitive: dict) -> dict:
    attributes = primitive.get("attributes", {})
    positions = accessor_values(gltf, binary, attributes["POSITION"])
    indices = accessor_values(gltf, binary, primitive["indices"])
    welded: dict[tuple[float, float, float], int] = {}
    welded_indices = []
    for position in positions:
        key = tuple(round(float(value), 5) for value in position)
        if key not in welded:
            welded[key] = len(welded)
        welded_indices.append(welded[key])
    edges = Counter()
    degenerate = 0
    for offset in range(0, len(indices), 3):
        ia, ib, ic = (int(indices[offset + value]) for value in range(3))
        if len({welded_indices[ia], welded_indices[ib], welded_indices[ic]}) < 3:
            degenerate += 1
        elif triangle_area_squared(positions[ia], positions[ib], positions[ic]) <= 1e-14:
            degenerate += 1
        for first, second in ((ia, ib), (ib, ic), (ic, ia)):
            edge = tuple(sorted((welded_indices[first], welded_indices[second])))
            edges[edge] += 1
    non_manifold = sum(1 for count in edges.values() if count != 2)
    return {
        "triangles": len(indices) // 3,
        "vertices": len(positions),
        "degenerate_triangles": degenerate,
        "non_manifold_edges_welded": non_manifold,
        "has_normals": "NORMAL" in attributes,
        "has_uv0": "TEXCOORD_0" in attributes,
    }


def audit_glb(path: Path, character: str, lod: int) -> dict:
    gltf, binary = read_glb(path)
    failures = []
    if gltf.get("asset", {}).get("version") != "2.0":
        failures.append("GLTF_VERSION_INVALID")
    if gltf.get("scene") != 0 or not gltf.get("scenes"):
        failures.append("SCENE_INVALID")
    if gltf.get("buffers", [{}])[0].get("uri"):
        failures.append("EXTERNAL_BUFFER_FORBIDDEN")
    if gltf.get("images") or gltf.get("textures"):
        failures.append("EXTERNAL_OR_EMBEDDED_TEXTURE_UNEXPECTED")
    extras = gltf.get("extras", {})
    if extras.get("character") != character or extras.get("lod") != lod:
        failures.append("CHARACTER_OR_LOD_METADATA_INVALID")
    root = gltf.get("nodes", [{}])[0]
    root_extras = root.get("extras", {})
    if root_extras.get("unit") != "meter" or root_extras.get("up_axis") != "Y" or root_extras.get("root_scale") != 1.0:
        failures.append("UNIT_AXIS_SCALE_INVALID")
    if any(key in root for key in ("matrix", "scale")):
        failures.append("ROOT_TRANSFORM_NOT_IDENTITY")
    module_names = {node.get("name") for node in gltf.get("nodes", [])[1:]}
    missing_modules = sorted(REQUIRED_MODULES[character] - module_names)
    unexpected_modules = sorted(module_names - REQUIRED_MODULES[character])
    if missing_modules:
        failures.append("REQUIRED_MODULES_MISSING")
    badge_status = None
    if character == "Chakchaki":
        badge = next((node for node in gltf.get("nodes", []) if node.get("name") == "CapBadge"), {})
        badge_status = badge.get("extras", {}).get("status")
        if badge_status != "PLACEHOLDER_IP_PENDING":
            failures.append("CAP_BADGE_NOT_PLACEHOLDER")
    pbr_failures = 0
    for material in gltf.get("materials", []):
        pbr = material.get("pbrMetallicRoughness", {})
        if len(pbr.get("baseColorFactor", [])) != 4 or "roughnessFactor" not in pbr or "metallicFactor" not in pbr:
            pbr_failures += 1
    if pbr_failures:
        failures.append("PBR_MATERIAL_INVALID")
    primitive_results = []
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                failures.append("NON_TRIANGLE_PRIMITIVE")
                continue
            metrics = topology_metrics(gltf, binary, primitive)
            metrics["part_name"] = primitive.get("extras", {}).get("part_name", "")
            primitive_results.append(metrics)
    triangles = sum(item["triangles"] for item in primitive_results)
    vertices = sum(item["vertices"] for item in primitive_results)
    degenerate = sum(item["degenerate_triangles"] for item in primitive_results)
    non_manifold = sum(item["non_manifold_edges_welded"] for item in primitive_results)
    if degenerate:
        failures.append("DEGENERATE_TRIANGLES")
    if non_manifold:
        failures.append("NON_MANIFOLD_EDGES")
    if any(not item["has_normals"] for item in primitive_results):
        failures.append("NORMALS_MISSING")
    if any(not item["has_uv0"] for item in primitive_results):
        failures.append("UV0_MISSING")
    if not primitive_results:
        failures.append("NO_MESH_PRIMITIVES")
    position_accessors = [
        gltf["accessors"][primitive["attributes"]["POSITION"]]
        for mesh in gltf.get("meshes", [])
        for primitive in mesh.get("primitives", [])
    ]
    min_y = min((accessor.get("min", [0, 0, 0])[1] for accessor in position_accessors), default=0)
    max_y = max((accessor.get("max", [0, 0, 0])[1] for accessor in position_accessors), default=0)
    if min_y < -0.001 or min_y > 0.06:
        failures.append("GROUND_ALIGNMENT_INVALID")
    if character == "Chakchaki" and not (1.35 <= max_y <= 1.55):
        failures.append("HEIGHT_OUT_OF_RANGE")
    if character == "Gongsickyi" and not (1.10 <= max_y <= 1.25):
        failures.append("HEIGHT_OUT_OF_RANGE")
    if triangles > 30000:
        failures.append("TRIANGLE_BUDGET_EXCEEDED")
    if len(gltf.get("materials", [])) > 16:
        failures.append("MATERIAL_BUDGET_EXCEEDED")
    if path.stat().st_size > 2 * 1024 * 1024:
        failures.append("FILE_SIZE_BUDGET_EXCEEDED")
    return {
        "character": character,
        "lod": lod,
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "triangles": triangles,
        "vertices": vertices,
        "materials": len(gltf.get("materials", [])),
        "module_count": len(module_names),
        "missing_modules": missing_modules,
        "unexpected_modules": unexpected_modules,
        "degenerate_triangles": degenerate,
        "non_manifold_edges_welded": non_manifold,
        "minimum_y": round(min_y, 6),
        "maximum_y": round(max_y, 6),
        "cap_badge_status": badge_status,
        "failures": failures,
        "status": "PASS" if not failures else "FAIL",
    }


def write_outputs(result: dict) -> None:
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rows = []
    for item in result["models"]:
        rows.append(
            f"| {item['character']} | LOD{item['lod']} | {item['triangles']:,} | {item['vertices']:,} | "
            f"{item['materials']} | {item['non_manifold_edges_welded']} | `{item['status']}` |"
        )
    failures = "\n".join(f"- {item}" for item in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- {item}" for item in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 2 Base Mesh & Material Audit

## Outcome

- Status: `{result['status']}`
- Automated status: `{result['automated_status']}`
- Models: `{result['model_pass_count']}/6 PASS`
- Manual approval: `{result['manual_approval_count']}/1`
- Gate 2 status change applied: `{str(result['gate2_status_change_applied']).lower()}`
- Gate 3 allowed: `{str(result['next_gate_allowed']).lower()}`

## Model metrics

| Character | LOD | Triangles | Vertices | Materials | Non-manifold edges | Result |
|---|---:|---:|---:|---:|---:|---|
{chr(10).join(rows)}

LOD1 ratios are {result['lod_ratios']['Chakchaki']['lod1_to_lod0']:.4f} and {result['lod_ratios']['Gongsickyi']['lod1_to_lod0']:.4f}; LOD2 ratios are {result['lod_ratios']['Chakchaki']['lod2_to_lod0']:.4f} and {result['lod_ratios']['Gongsickyi']['lod2_to_lod0']:.4f}.

## Failures

{failures}

## Blockers

{blockers}

## Decision

실제 GLB 6개와 비교 렌더를 생성했고 자동 구조·토폴로지·UV·PBR·LOD 검사를 수행했다. 프로젝트 책임자의 유효한 1인 승인과 상태 승격이 모두 확인된 경우에만 Gate 2를 `VERIFIED`로 판정한다.
""",
        encoding="utf-8",
    )


def main() -> int:
    try:
        manifest = load_json(MANIFEST_PATH)
        review = load_json(REVIEW_PATH)
        harness = load_json(STATUS_PATH)
    except RuntimeError as exc:
        print(f"GATE2_FAIL: {exc}", file=sys.stderr)
        return 2
    failures = []
    blockers = []
    if harness.get("gate1", {}).get("status") != "VERIFIED":
        failures.append("GATE1_NOT_VERIFIED")
    expected_source_hashes = manifest.get("source_candidate_hashes", {})
    for character, source in SOURCE_FILES.items():
        if not source.is_file() or sha256(source).lower() != str(expected_source_hashes.get(character, "")).lower():
            failures.append(f"SOURCE_HASH_DRIFT:{character}")
    models = []
    manifest_records = {(item.get("character"), item.get("lod")): item for item in manifest.get("files", [])}
    for character in ("Chakchaki", "Gongsickyi"):
        for lod in (0, 1, 2):
            record = manifest_records.get((character, lod), {})
            relative = record.get("path", "")
            path = ROOT / relative
            if not path.is_file():
                failures.append(f"MODEL_MISSING:{character}:LOD{lod}")
                continue
            try:
                result = audit_glb(path, character, lod)
            except (OSError, RuntimeError, KeyError, IndexError, json.JSONDecodeError, struct.error) as exc:
                failures.append(f"MODEL_PARSE_FAIL:{character}:LOD{lod}:{exc}")
                continue
            models.append(result)
            if result["sha256"].lower() != str(record.get("sha256", "")).lower():
                failures.append(f"MODEL_HASH_DRIFT:{character}:LOD{lod}")
            failures.extend(f"{character}:LOD{lod}:{item}" for item in result["failures"])
    ratios = manifest.get("lod_ratios", {})
    for character in ("Chakchaki", "Gongsickyi"):
        values = ratios.get(character, {})
        lod1 = values.get("lod1_to_lod0")
        lod2 = values.get("lod2_to_lod0")
        if not isinstance(lod1, (int, float)) or not 0.45 <= lod1 <= 0.60:
            failures.append(f"LOD1_RATIO_INVALID:{character}")
        if not isinstance(lod2, (int, float)) or not 0.15 <= lod2 <= 0.25:
            failures.append(f"LOD2_RATIO_INVALID:{character}")
    for preview in manifest.get("previews", []):
        path = ROOT / preview.get("path", "")
        if not path.is_file() or sha256(path).lower() != str(preview.get("sha256", "")).lower():
            failures.append(f"PREVIEW_HASH_DRIFT:{preview.get('path', '')}")
    automated_status = "PASS" if not failures and len(models) == 6 else "FAIL"

    manual_approval_count = 0
    decision = str(review.get("decision", "")).strip()
    checks = review.get("checks", {})
    review_complete = (
        str(review.get("reviewer_name", "")).strip()
        and decision in {"APPROVE", "APPROVE_WITH_PATCH", "REJECT"}
        and valid_timestamp(review.get("reviewed_at"))
        and review.get("scope_acknowledged") is True
        and checks
        and all(value is True for value in checks.values())
    )
    if decision == "REJECT":
        failures.append("MANUAL_REVIEW_REJECTED")
    elif review_complete and decision == "APPROVE" and automated_status == "PASS":
        manual_approval_count = 1
    elif review_complete and decision == "APPROVE_WITH_PATCH":
        blockers.append("APPROVED_PATCH_NOT_APPLIED")
    else:
        blockers.append("PROJECT_OWNER_VISUAL_REVIEW_REQUIRED")
    verified = automated_status == "PASS" and manual_approval_count == 1 and not failures and not blockers
    promotion_applied = (
        verified
        and harness.get("gate2", {}).get("status") == "VERIFIED"
        and review.get("approval_applied") is True
    )
    next_gate_allowed = promotion_applied and harness.get("gate3", {}).get("entry_allowed") is True
    if promotion_applied and next_gate_allowed:
        status = "VERIFIED"
    elif verified:
        status = "READY_FOR_PROMOTION"
    elif failures:
        status = "FAIL"
    else:
        status = "BLOCKED_EXTERNAL"
    result = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 2,
        "status": status,
        "automated_status": automated_status,
        "model_pass_count": sum(item["status"] == "PASS" for item in models),
        "models": models,
        "lod_ratios": ratios,
        "manual_approval_count": manual_approval_count,
        "manual_approval_required": 1,
        "failures": failures,
        "blockers": blockers,
        "ready_for_promotion": verified,
        "gate2_status_change_applied": promotion_applied,
        "next_gate_allowed": next_gate_allowed,
    }
    write_outputs(result)
    print("GATE2_AUDIT_WRITTEN")
    print(f"status={status}")
    print(f"automated_status={automated_status}")
    print(f"models={result['model_pass_count']}/6")
    print(f"manual_approval={manual_approval_count}/1")
    print(f"failures={len(failures)}")
    print(f"blockers={len(blockers)}")
    return 0 if verified else (2 if failures else 1)


if __name__ == "__main__":
    raise SystemExit(main())
