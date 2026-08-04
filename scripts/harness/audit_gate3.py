#!/usr/bin/env python3
"""Audit Stage 8 Gate 3 skin, skeleton, morph targets, sockets and pose evidence."""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

from build_gate3_rig import (
    CHAK_BONES,
    COMMON_MORPHS,
    GONG_BONES,
    GONG_REQUIRED_MORPHS,
    accessor_values,
    parse_glb,
    sha256,
)

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "docs" / "stage8" / "evidence" / "gate3" / "GATE3_BUILD_MANIFEST_v1.0.json"
REVIEW_PATH = ROOT / "docs" / "stage8" / "evidence" / "gate3" / "GATE3_MANUAL_REVIEW_v1.0.json"
STATUS_PATH = ROOT / "harness" / "status.json"
OUTPUT_JSON = ROOT / "docs" / "stage8" / "evidence" / "gate3" / "GATE3_AUTOMATED_QA_v1.0.json"
OUTPUT_MD = ROOT / "docs" / "stage8" / "audits" / "GATE3_RIG_BLENDSHAPE_AUDIT.md"

REQUIRED_POSES = {
    "Chakchaki": {"Pose_Hand_Open", "Pose_Hand_Fist", "Pose_Hand_Point", "Pose_Hand_ThumbsUp"},
    "Gongsickyi": {"Pose_Wing_Open", "Pose_Wing_Fold", "Pose_Prop_Left", "Pose_Prop_Right"},
}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"cannot read {path.relative_to(ROOT)}: {exc}") from exc


def valid_timestamp(value):
    if not isinstance(value, str) or not value:
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None


def audit_rig(path: Path, record: dict):
    character, lod = record["character"], record["lod"]
    failures = []
    gltf, binary = parse_glb(path)
    extras = gltf.get("extras", {})
    expected_bones = CHAK_BONES if character == "Chakchaki" else GONG_BONES
    expected_bone_names = [item[0] for item in expected_bones]
    expected_morphs = set(COMMON_MORPHS)
    if character == "Gongsickyi":
        expected_morphs.update(GONG_REQUIRED_MORPHS)

    if extras.get("gate") != 3 or extras.get("unit") != "meter" or extras.get("up_axis") != "Y" or extras.get("root_scale") != 1.0:
        failures.append("RIG_METADATA_INVALID")
    nodes = gltf.get("nodes", [])
    name_to_index = {}
    duplicate_names = set()
    for index, node in enumerate(nodes):
        name = node.get("name")
        if name in name_to_index:
            duplicate_names.add(name)
        name_to_index[name] = index
    missing_bones = sorted(set(expected_bone_names) - set(name_to_index))
    if missing_bones:
        failures.append("MISSING_BONES:" + ",".join(missing_bones))
    if duplicate_names.intersection(expected_bone_names):
        failures.append("DUPLICATE_BONE_NAMES")

    parent_of = {}
    for parent_index, node in enumerate(nodes):
        for child in node.get("children", []):
            if child in parent_of:
                failures.append(f"MULTIPLE_PARENTS:{nodes[child].get('name')}")
            parent_of[child] = parent_index
    for name, parent, _ in expected_bones:
        if name not in name_to_index:
            continue
        actual_parent = nodes[parent_of.get(name_to_index[name], -1)].get("name") if name_to_index[name] in parent_of else None
        expected_parent = parent if parent else f"{character}_Armature"
        if actual_parent != expected_parent:
            failures.append(f"BONE_PARENT:{name}:{actual_parent}:{expected_parent}")

    skins = gltf.get("skins", [])
    if len(skins) != 1:
        failures.append(f"SKIN_COUNT:{len(skins)}")
        skin = {}
    else:
        skin = skins[0]
    joint_nodes = skin.get("joints", [])
    joint_names = [nodes[index].get("name") for index in joint_nodes if 0 <= index < len(nodes)]
    if set(joint_names) != set(expected_bone_names) or len(joint_names) != len(expected_bone_names):
        failures.append("SKIN_JOINT_SET_MISMATCH")
    try:
        ibm_accessor = gltf["accessors"][skin["inverseBindMatrices"]]
        if ibm_accessor.get("type") != "MAT4" or ibm_accessor.get("count") != len(expected_bones):
            failures.append("INVERSE_BIND_MATRIX_INVALID")
    except (KeyError, IndexError):
        failures.append("INVERSE_BIND_MATRIX_MISSING")

    primitive_count = 0
    weighted_vertex_count = 0
    bad_weight_count = 0
    invalid_joint_index_count = 0
    morph_names = set()
    nonzero_by_morph = {}
    for node in nodes:
        if "mesh" not in node:
            continue
        if node.get("skin") != 0:
            failures.append(f"MESH_WITHOUT_SKIN:{node.get('name')}")
        mesh = gltf["meshes"][node["mesh"]]
        names = mesh.get("extras", {}).get("targetNames", [])
        morph_names.update(names)
        if names and len(mesh.get("weights", [])) != len(names):
            failures.append(f"MORPH_WEIGHT_COUNT:{mesh.get('name')}")
        for primitive in mesh.get("primitives", []):
            primitive_count += 1
            attrs = primitive.get("attributes", {})
            if not {"POSITION", "JOINTS_0", "WEIGHTS_0"}.issubset(attrs):
                failures.append(f"SKIN_ATTRIBUTES_MISSING:{mesh.get('name')}")
                continue
            positions = accessor_values(gltf, binary, attrs["POSITION"])
            joints = accessor_values(gltf, binary, attrs["JOINTS_0"])
            weights = accessor_values(gltf, binary, attrs["WEIGHTS_0"])
            if not (len(positions) == len(joints) == len(weights)):
                failures.append(f"SKIN_ATTRIBUTE_COUNT:{mesh.get('name')}")
                continue
            weighted_vertex_count += len(weights)
            for joint_row, weight_row in zip(joints, weights):
                if any(index < 0 or index >= len(joint_nodes) for index in joint_row):
                    invalid_joint_index_count += 1
                if not math.isclose(sum(weight_row), 1.0, abs_tol=1e-5) or any(weight < 0 for weight in weight_row):
                    bad_weight_count += 1
            targets = primitive.get("targets", [])
            if len(targets) != len(names):
                failures.append(f"MORPH_TARGET_COUNT:{mesh.get('name')}")
                continue
            for target_name, target in zip(names, targets):
                if "POSITION" not in target:
                    failures.append(f"MORPH_POSITION_MISSING:{target_name}")
                    continue
                deltas = accessor_values(gltf, binary, target["POSITION"])
                if len(deltas) != len(positions):
                    failures.append(f"MORPH_VERTEX_COUNT:{target_name}")
                magnitude = max((sum(abs(component) for component in value) for value in deltas), default=0.0)
                nonzero_by_morph[target_name] = max(nonzero_by_morph.get(target_name, 0.0), magnitude)
    if bad_weight_count:
        failures.append(f"WEIGHT_SUM_INVALID:{bad_weight_count}")
    if invalid_joint_index_count:
        failures.append(f"JOINT_INDEX_INVALID:{invalid_joint_index_count}")
    missing_morphs = sorted(expected_morphs - morph_names)
    if missing_morphs:
        failures.append("MISSING_MORPHS:" + ",".join(missing_morphs))
    zero_morphs = sorted(name for name in expected_morphs if nonzero_by_morph.get(name, 0.0) <= 1e-7)
    if zero_morphs:
        failures.append("ZERO_MORPHS:" + ",".join(zero_morphs))

    pose_names = {animation.get("name") for animation in gltf.get("animations", [])}
    missing_poses = sorted(REQUIRED_POSES[character] - pose_names)
    if missing_poses:
        failures.append("MISSING_POSES:" + ",".join(missing_poses))
    for animation in gltf.get("animations", []):
        if animation.get("name") in REQUIRED_POSES[character] and (not animation.get("channels") or not animation.get("samplers")):
            failures.append(f"EMPTY_POSE:{animation.get('name')}")
    socket_parents = {}
    if character == "Gongsickyi":
        for socket, expected_parent in (("prop_socket.L", "wing_03.L"), ("prop_socket.R", "wing_03.R")):
            actual = nodes[parent_of[name_to_index[socket]]].get("name") if socket in name_to_index and name_to_index[socket] in parent_of else None
            socket_parents[socket] = actual
            if actual != expected_parent:
                failures.append(f"SOCKET_PARENT:{socket}:{actual}")

    return {
        "character": character, "lod": lod, "path": record["path"], "sha256": sha256(path), "bytes": path.stat().st_size,
        "joint_count": len(joint_names), "skin_count": len(skins), "primitive_count": primitive_count,
        "weighted_vertex_count": weighted_vertex_count, "bad_weight_count": bad_weight_count,
        "invalid_joint_index_count": invalid_joint_index_count, "morph_count": len(morph_names),
        "required_morph_count": len(expected_morphs), "missing_morphs": missing_morphs, "zero_morphs": zero_morphs,
        "pose_count": len(REQUIRED_POSES[character]), "missing_poses": missing_poses, "socket_parents": socket_parents,
        "failures": failures, "status": "PASS" if not failures else "FAIL",
    }


def write_outputs(result):
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rows = []
    for item in result["rigs"]:
        rows.append(
            f"| {item['character']} | LOD{item['lod']} | {item['joint_count']} | {item['weighted_vertex_count']:,} | "
            f"{item['morph_count']} | {item['pose_count']} | `{item['status']}` |"
        )
    failures = "\n".join(f"- {value}" for value in result["failures"]) or "- 없음"
    blockers = "\n".join(f"- {value}" for value in result["blockers"]) or "- 없음"
    OUTPUT_MD.write_text(
        f"""# Gate 3 Rig & Blendshape Audit

## Outcome

- Status: `{result['status']}`
- Automated status: `{result['automated_status']}`
- Rig files: `{result['rig_pass_count']}/6 PASS`
- Manual approval: `{result['manual_approval_count']}/1`
- Gate 3 status change applied: `{str(result['gate3_status_change_applied']).lower()}`
- Gate 4 allowed: `{str(result['next_gate_allowed']).lower()}`

## Rig metrics

| Character | LOD | Joints | Weighted vertices | Morphs | Poses | Result |
|---|---:|---:|---:|---:|---:|---|
{chr(10).join(rows)}

## Failures

{failures}

## Blockers

{blockers}

## Decision

실제 GLB skin·joint hierarchy·inverse bind matrix·normalized weights·non-zero morph target·pose·socket을 검사했다. 자동 검사가 통과해도 프로젝트 책임자의 기본 포즈·표정·시선·소품·관통 비교 승인 전에는 Gate 3를 `VERIFIED`로 올리지 않는다.
""",
        encoding="utf-8",
    )


def main():
    try:
        manifest, review, status = load_json(MANIFEST_PATH), load_json(REVIEW_PATH), load_json(STATUS_PATH)
    except RuntimeError as exc:
        print(f"GATE3_FAIL: {exc}", file=sys.stderr)
        return 2
    failures, blockers, rigs = [], [], []
    if status.get("gate2", {}).get("status") != "VERIFIED":
        failures.append("GATE2_NOT_VERIFIED")
    rig_spec = ROOT / manifest.get("rig_spec_path", "")
    if not rig_spec.is_file() or sha256(rig_spec) != manifest.get("rig_spec_sha256"):
        failures.append("RIG_SPEC_HASH_DRIFT")
    records = manifest.get("files", [])
    pairs = {(item.get("character"), item.get("lod")) for item in records}
    if pairs != {(character, lod) for character in ("Chakchaki", "Gongsickyi") for lod in (0, 1, 2)}:
        failures.append("RIG_FILE_MATRIX_INCOMPLETE")
    for record in records:
        source, path = ROOT / record.get("source_path", ""), ROOT / record.get("path", "")
        if not source.is_file() or sha256(source) != record.get("source_sha256"):
            failures.append(f"SOURCE_HASH_DRIFT:{record.get('character')}:LOD{record.get('lod')}")
        if not path.is_file():
            failures.append(f"RIG_MISSING:{record.get('path')}")
            continue
        if sha256(path) != record.get("sha256"):
            failures.append(f"RIG_HASH_DRIFT:{record.get('character')}:LOD{record.get('lod')}")
        try:
            item = audit_rig(path, record)
        except (OSError, RuntimeError, KeyError, IndexError, ValueError) as exc:
            failures.append(f"RIG_PARSE_FAIL:{record.get('character')}:LOD{record.get('lod')}:{exc}")
            continue
        rigs.append(item)
        failures.extend(f"{item['character']}:LOD{item['lod']}:{value}" for value in item["failures"])
    previews = manifest.get("previews", [])
    if len(previews) != 6:
        failures.append("PREVIEW_COUNT_INVALID")
    for preview in previews:
        path = ROOT / preview.get("path", "")
        if not path.is_file() or sha256(path) != preview.get("sha256"):
            failures.append(f"PREVIEW_HASH_DRIFT:{preview.get('path')}")
    automated_status = "PASS" if not failures and len(rigs) == 6 else "FAIL"

    decision = str(review.get("decision", "")).strip()
    checks = review.get("checks", {})
    review_complete = (
        str(review.get("reviewer_name", "")).strip()
        and decision in {"APPROVE", "APPROVE_WITH_PATCH", "REJECT"}
        and valid_timestamp(review.get("reviewed_at"))
        and review.get("scope_acknowledged") is True
        and checks and all(value is True for value in checks.values())
    )
    manual_count = 0
    if decision == "REJECT":
        failures.append("MANUAL_REVIEW_REJECTED")
    elif review_complete and decision == "APPROVE" and automated_status == "PASS":
        manual_count = 1
    elif review_complete and decision == "APPROVE_WITH_PATCH":
        blockers.append("APPROVED_PATCH_NOT_APPLIED")
    else:
        blockers.append("PROJECT_OWNER_DEFORMATION_REVIEW_REQUIRED")
    ready = automated_status == "PASS" and manual_count == 1 and not failures and not blockers
    promotion_applied = ready and status.get("gate3", {}).get("status") == "VERIFIED" and review.get("approval_applied") is True
    next_allowed = promotion_applied and status.get("gate4", {}).get("entry_allowed") is True
    if promotion_applied and next_allowed:
        outcome = "VERIFIED"
    elif ready:
        outcome = "READY_FOR_PROMOTION"
    elif failures:
        outcome = "FAIL"
    else:
        outcome = "BLOCKED_EXTERNAL"
    result = {
        "schema_version": "1.0.0", "generated_at": datetime.now(timezone.utc).isoformat(), "gate": 3,
        "status": outcome, "automated_status": automated_status,
        "rig_pass_count": sum(item["status"] == "PASS" for item in rigs), "rigs": rigs,
        "manual_approval_count": manual_count, "manual_approval_required": 1,
        "failures": failures, "blockers": blockers, "ready_for_promotion": ready,
        "gate3_status_change_applied": promotion_applied, "next_gate_allowed": next_allowed,
    }
    write_outputs(result)
    print("GATE3_AUDIT_WRITTEN")
    print(f"status={outcome}")
    print(f"automated_status={automated_status}")
    print(f"rigs={result['rig_pass_count']}/6")
    print(f"manual_approval={manual_count}/1")
    print(f"failures={len(failures)}")
    print(f"blockers={len(blockers)}")
    return 0 if ready else (2 if failures else 1)


if __name__ == "__main__":
    raise SystemExit(main())
