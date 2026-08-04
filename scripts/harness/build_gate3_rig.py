#!/usr/bin/env python3
"""Build deterministic glTF 2.0 skin, joint, morph-target and pose candidates for Gate 3."""

from __future__ import annotations

import copy
import hashlib
import json
import math
import struct
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from build_gate2_base_mesh import build_chakchaki, build_gongsickyi, label_cell, render_model

ROOT = Path(__file__).resolve().parents[2]
THREAD_ID = "019fcaf2-285c-7dc3-897a-3c9a2903aac4"
GATE2_ROOT = ROOT / "outputs" / THREAD_ID / "gate2"
OUTPUT_ROOT = ROOT / "outputs" / THREAD_ID / "gate3"
EVIDENCE_ROOT = ROOT / "docs" / "stage8" / "evidence" / "gate3"
PREVIEW_ROOT = EVIDENCE_ROOT / "previews"
MANIFEST_PATH = EVIDENCE_ROOT / "GATE3_BUILD_MANIFEST_v1.0.json"
GATE2_MANIFEST = ROOT / "docs" / "stage8" / "evidence" / "gate2" / "GATE2_BUILD_MANIFEST_v1.0.json"
RIG_SPEC = ROOT / "docs" / "ssot" / "stage7" / "v1.0" / "Character_Module_Rig_Spec_v1.0.xlsx"

COMMON_MORPHS = [
    "Blink_L", "Blink_R", "Eyes_Wide", "Eyes_Squint",
    "Brow_Up_L", "Brow_Up_R", "Brow_Down_L", "Brow_Down_R",
    "Smile", "Frown", "Mouth_O", "Mouth_U", "Mouth_A", "Mouth_E", "Mouth_M",
]
CHAK_OPTIONAL_MORPHS = ["Cheek_Puff", "Cheek_Blush", "Nose_Scrunch"]
GONG_REQUIRED_MORPHS = ["Body_Squash", "Body_Stretch", "Wing_Open", "Wing_Fold"]
GONG_OPTIONAL_MORPHS = ["Cheek_Puff", "Cheek_Blush", "Star_Glow"]


def mirror_bones(base):
    result = []
    for stem, parent, position in base:
        for side, sign in (("L", 1.0), ("R", -1.0)):
            parent_name = parent.replace("{side}", side) if parent else None
            result.append((f"{stem}.{side}", parent_name, (position[0] * sign, position[1], position[2])))
    return result


CHAK_BONES = [
    ("root", None, (0.0, 0.0, 0.0)),
    ("pelvis", "root", (0.0, 0.62, 0.0)),
    ("spine_01", "pelvis", (0.0, 0.74, 0.0)),
    ("spine_02", "spine_01", (0.0, 0.86, 0.0)),
    ("spine_03", "spine_02", (0.0, 0.98, 0.0)),
    ("neck", "spine_03", (0.0, 1.07, 0.0)),
    ("head", "neck", (0.0, 1.16, 0.0)),
    ("eye.L", "head", (0.085, 1.18, -0.17)),
    ("eye.R", "head", (-0.085, 1.18, -0.17)),
    ("jaw", "head", (0.0, 1.06, -0.18)),
] + mirror_bones([
    ("clavicle", "spine_03", (0.13, 0.99, 0.0)),
    ("upperarm", "clavicle.{side}", (0.23, 0.91, 0.0)),
    ("lowerarm", "upperarm.{side}", (0.31, 0.73, 0.0)),
    ("hand", "lowerarm.{side}", (0.405, 0.575, 0.0)),
    ("finger_01", "hand.{side}", (0.425, 0.555, 0.025)),
    ("finger_02", "finger_01.{side}", (0.440, 0.535, 0.025)),
    ("thigh", "pelvis", (0.10, 0.55, 0.0)),
    ("shin", "thigh.{side}", (0.10, 0.31, 0.0)),
    ("foot", "shin.{side}", (0.10, 0.09, -0.02)),
    ("toe", "foot.{side}", (0.10, 0.04, -0.13)),
    ("backpack_strap", "spine_03", (0.13, 0.94, 0.12)),
])

GONG_BONES = [
    ("root", None, (0.0, 0.0, 0.0)),
    ("body", "root", (0.0, 0.55, 0.0)),
    ("eye.L", "body", (0.14, 0.69, -0.33)),
    ("eye.R", "body", (-0.14, 0.69, -0.33)),
    ("brow.L", "body", (0.14, 0.80, -0.34)),
    ("brow.R", "body", (-0.14, 0.80, -0.34)),
    ("jaw_beak", "body", (0.0, 0.54, -0.40)),
    ("wing_01.L", "body", (0.31, 0.57, 0.0)),
    ("wing_02.L", "wing_01.L", (0.44, 0.55, 0.0)),
    ("wing_03.L", "wing_02.L", (0.56, 0.52, 0.0)),
    ("wing_01.R", "body", (-0.31, 0.57, 0.0)),
    ("wing_02.R", "wing_01.R", (-0.44, 0.55, 0.0)),
    ("wing_03.R", "wing_02.R", (-0.56, 0.52, 0.0)),
    ("foot.L", "root", (0.16, 0.08, 0.0)),
    ("foot.R", "root", (-0.16, 0.08, 0.0)),
    ("cap_tassel_01", "body", (0.27, 1.06, 0.0)),
    ("cap_tassel_02", "cap_tassel_01", (0.31, 0.96, 0.0)),
    ("cap_tassel_03", "cap_tassel_02", (0.32, 0.87, 0.0)),
    ("prop_socket.L", "wing_03.L", (0.61, 0.51, -0.02)),
    ("prop_socket.R", "wing_03.R", (-0.61, 0.51, -0.02)),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def align4(data: bytearray) -> None:
    while len(data) % 4:
        data.append(0)


def parse_glb(path: Path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        raise RuntimeError(f"invalid GLB: {path}")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"missing JSON chunk: {path}")
    gltf = json.loads(raw[20:20 + json_length].decode("utf-8").rstrip(" \0"))
    offset = 20 + json_length
    bin_length, bin_type = struct.unpack_from("<II", raw, offset)
    if bin_type != 0x004E4942:
        raise RuntimeError(f"missing BIN chunk: {path}")
    return gltf, bytearray(raw[offset + 8:offset + 8 + bin_length])


def accessor_values(gltf, binary, index):
    accessor = gltf["accessors"][index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[accessor["type"]]
    formats = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}
    fmt = formats[accessor["componentType"]]
    size = struct.calcsize("<" + fmt) * components
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", size)
    values = []
    for row in range(accessor["count"]):
        value = struct.unpack_from("<" + fmt * components, binary, start + row * stride)
        values.append(value if components > 1 else value[0])
    return values


def add_accessor(gltf, binary, values, component_type, accessor_type, target=None, bounds=False):
    align4(binary)
    start = len(binary)
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[accessor_type]
    fmt = {5126: "f", 5123: "H", 5121: "B"}[component_type]
    flat = []
    for value in values:
        if components == 1:
            flat.append(value)
        else:
            flat.extend(value)
    binary.extend(struct.pack("<" + fmt * len(flat), *flat))
    view = {"buffer": 0, "byteOffset": start, "byteLength": len(binary) - start}
    if target is not None:
        view["target"] = target
    view_index = len(gltf["bufferViews"])
    gltf["bufferViews"].append(view)
    accessor = {
        "bufferView": view_index, "byteOffset": 0, "componentType": component_type,
        "count": len(values), "type": accessor_type,
    }
    if bounds and values:
        if components == 1:
            accessor["min"] = [min(values)]
            accessor["max"] = [max(values)]
        else:
            accessor["min"] = [min(value[i] for value in values) for i in range(components)]
            accessor["max"] = [max(value[i] for value in values) for i in range(components)]
    index = len(gltf["accessors"])
    gltf["accessors"].append(accessor)
    return index


def write_glb(path, gltf, binary):
    align4(binary)
    gltf["buffers"] = [{"byteLength": len(binary)}]
    payload_json = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    while len(payload_json) % 4:
        payload_json += b" "
    total = 12 + 8 + len(payload_json) + 8 + len(binary)
    payload = bytearray(struct.pack("<4sII", b"glTF", 2, total))
    payload.extend(struct.pack("<I4s", len(payload_json), b"JSON"))
    payload.extend(payload_json)
    payload.extend(struct.pack("<I4s", len(binary), b"BIN\0"))
    payload.extend(binary)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def morphs_for_module(character, module):
    result = []
    if module == "Eyes":
        result += ["Blink_L", "Blink_R", "Eyes_Wide", "Eyes_Squint"]
    if module == "Eyebrows":
        result += ["Brow_Up_L", "Brow_Up_R", "Brow_Down_L", "Brow_Down_R"]
    if module in {"Mouth", "MouthBeak"}:
        result += ["Smile", "Frown", "Mouth_O", "Mouth_U", "Mouth_A", "Mouth_E", "Mouth_M"]
    if module == "Cheeks":
        result += ["Cheek_Puff", "Cheek_Blush"]
    if character == "Chakchaki" and module == "Nose":
        result += ["Nose_Scrunch"]
    if character == "Gongsickyi" and module == "Body":
        result += ["Body_Squash", "Body_Stretch"]
    if character == "Gongsickyi" and module == "Wings":
        result += ["Wing_Open", "Wing_Fold"]
    if character == "Gongsickyi" and module == "StarPointer":
        result += ["Star_Glow"]
    return result


def morph_delta(target, position, center):
    x, y, z = position
    cx, cy, cz = center
    left = x >= cx
    if target.endswith("_L") and not left:
        return (0.0, 0.0, 0.0)
    if target.endswith("_R") and left:
        return (0.0, 0.0, 0.0)
    if target.startswith("Blink"):
        return (0.0, -(y - cy) * 0.82, 0.0)
    if target == "Eyes_Wide":
        return (0.0, (y - cy) * 0.28, 0.0)
    if target == "Eyes_Squint":
        return (0.0, -(y - cy) * 0.48, 0.0)
    if target.startswith("Brow_Up"):
        return (0.0, 0.045, 0.0)
    if target.startswith("Brow_Down"):
        return (0.0, -0.038, 0.0)
    if target == "Smile":
        return ((x - cx) * 0.10, abs(x - cx) * 0.22, 0.0)
    if target == "Frown":
        return ((x - cx) * 0.05, -abs(x - cx) * 0.18, 0.0)
    if target == "Mouth_O":
        return (-(x - cx) * 0.38, (y - cy) * 0.38, 0.0)
    if target == "Mouth_U":
        return (-(x - cx) * 0.24, (y - cy) * 0.16, 0.0)
    if target == "Mouth_A":
        return ((x - cx) * 0.05, (y - cy) * 0.42, 0.0)
    if target == "Mouth_E":
        return ((x - cx) * 0.24, -(y - cy) * 0.12, 0.0)
    if target == "Mouth_M":
        return (0.0, -(y - cy) * 0.72, 0.0)
    if target == "Cheek_Puff":
        return ((x - cx) * 0.12, (y - cy) * 0.08, (z - cz) * 0.10)
    if target == "Cheek_Blush":
        return (0.0, 0.006, -0.004)
    if target == "Nose_Scrunch":
        return (0.0, 0.025, 0.012)
    if target == "Body_Squash":
        return ((x - cx) * 0.14, -(y - cy) * 0.16, (z - cz) * 0.10)
    if target == "Body_Stretch":
        return (-(x - cx) * 0.10, (y - cy) * 0.18, -(z - cz) * 0.07)
    if target == "Wing_Open":
        return ((x - cx) * 0.22, abs(x - cx) * 0.22, 0.0)
    if target == "Wing_Fold":
        return (-(x - cx) * 0.30, -abs(x - cx) * 0.12, 0.03)
    if target == "Star_Glow":
        return ((x - cx) * 0.08, (y - cy) * 0.08, (z - cz) * 0.08)
    return (0.0, 0.0, 0.0)


def candidates_for_module(character, module, bone_names):
    if character == "Chakchaki":
        mapping = {
            "Eyes": ["eye.L", "eye.R"], "Mouth": ["jaw"], "Arms": ["upperarm.L", "lowerarm.L", "upperarm.R", "lowerarm.R"],
            "Hands": ["hand.L", "hand.R"], "Fingers": ["finger_01.L", "finger_02.L", "finger_01.R", "finger_02.R"],
            "Legs": ["thigh.L", "shin.L", "thigh.R", "shin.R"], "Shoes": ["foot.L", "toe.L", "foot.R", "toe.R"],
            "Backpack": ["backpack_strap.L", "backpack_strap.R", "spine_03"], "Shorts": ["pelvis", "thigh.L", "thigh.R"],
            "Body": ["pelvis", "spine_01", "spine_02", "spine_03"], "Hoodie": ["spine_02", "spine_03"],
        }
        return mapping.get(module, ["head"])
    mapping = {
        "Eyes": ["eye.L", "eye.R"], "Eyebrows": ["brow.L", "brow.R"], "MouthBeak": ["jaw_beak"],
        "Wings": ["wing_01.L", "wing_02.L", "wing_03.L", "wing_01.R", "wing_02.R", "wing_03.R"],
        "Feet": ["foot.L", "foot.R"], "StarPointer": ["prop_socket.L", "prop_socket.R"],
        "GraduationCap": ["body", "cap_tassel_01", "cap_tassel_02", "cap_tassel_03"],
    }
    return mapping.get(module, ["body"])


def nearest_joint(position, candidates, bone_position, bone_index):
    name = min(candidates, key=lambda item: sum((position[i] - bone_position[item][i]) ** 2 for i in range(3)))
    return bone_index[name]


def inverse_translation(position):
    x, y, z = position
    return (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -x, -y, -z, 1.0)


def quat_z(degrees):
    radians = math.radians(degrees) / 2
    return (0.0, 0.0, math.sin(radians), math.cos(radians))


def add_pose_animations(gltf, binary, character, bone_nodes):
    if character == "Chakchaki":
        poses = {
            "Pose_Hand_Open": {"finger_01.L": 8, "finger_01.R": -8},
            "Pose_Hand_Fist": {"finger_01.L": -62, "finger_02.L": -74, "finger_01.R": 62, "finger_02.R": 74},
            "Pose_Hand_Point": {"finger_01.L": -8, "finger_02.L": 0, "finger_01.R": 46, "finger_02.R": 58},
            "Pose_Hand_ThumbsUp": {"hand.L": 18, "finger_01.L": -45, "finger_02.L": -55},
        }
    else:
        poses = {
            "Pose_Wing_Open": {"wing_01.L": 32, "wing_02.L": 18, "wing_01.R": -32, "wing_02.R": -18},
            "Pose_Wing_Fold": {"wing_01.L": -24, "wing_02.L": -36, "wing_01.R": 24, "wing_02.R": 36},
            "Pose_Prop_Left": {"wing_01.L": 20, "wing_02.L": 24},
            "Pose_Prop_Right": {"wing_01.R": -20, "wing_02.R": -24},
        }
    animations = gltf.setdefault("animations", [])
    for pose_name, rotations in poses.items():
        time_accessor = add_accessor(gltf, binary, [0.0, 1.0], 5126, "SCALAR", bounds=True)
        samplers, channels = [], []
        for bone_name, degrees in rotations.items():
            output = add_accessor(gltf, binary, [(0.0, 0.0, 0.0, 1.0), quat_z(degrees)], 5126, "VEC4")
            sampler_index = len(samplers)
            samplers.append({"input": time_accessor, "output": output, "interpolation": "LINEAR"})
            channels.append({"sampler": sampler_index, "target": {"node": bone_nodes[bone_name], "path": "rotation"}})
        animations.append({"name": pose_name, "samplers": samplers, "channels": channels, "extras": {"gate": 3, "type": "POSE_TEST"}})
    return sorted(poses)


def rig_file(source: Path, target: Path, character: str, lod: int):
    gltf, binary = parse_glb(source)
    bones = CHAK_BONES if character == "Chakchaki" else GONG_BONES
    positions = {name: position for name, _, position in bones}
    armature = len(gltf["nodes"])
    gltf["nodes"].append({"name": f"{character}_Armature", "extras": {"type": "ARMATURE", "gate": 3}})
    bone_nodes = {}
    for name, _, position in bones:
        bone_nodes[name] = len(gltf["nodes"])
        gltf["nodes"].append({"name": name, "translation": list(position), "extras": {"type": "JOINT", "bind_global": list(position)}})
    for name, parent, position in bones:
        node = gltf["nodes"][bone_nodes[name]]
        if parent:
            parent_pos = positions[parent]
            node["translation"] = [position[i] - parent_pos[i] for i in range(3)]
            gltf["nodes"][bone_nodes[parent]].setdefault("children", []).append(bone_nodes[name])
        else:
            gltf["nodes"][armature].setdefault("children", []).append(bone_nodes[name])
    gltf["nodes"][0].setdefault("children", []).append(armature)
    joint_nodes = [bone_nodes[name] for name, _, _ in bones]
    ibm = add_accessor(gltf, binary, [inverse_translation(position) for _, _, position in bones], 5126, "MAT4")
    gltf["skins"] = [{"name": f"{character}_Skin", "inverseBindMatrices": ibm, "skeleton": bone_nodes["root"], "joints": joint_nodes}]
    bone_order = {name: index for index, (name, _, _) in enumerate(bones)}

    for node in gltf["nodes"][:armature]:
        if "mesh" not in node:
            continue
        node["skin"] = 0
        module = node["name"]
        mesh = gltf["meshes"][node["mesh"]]
        target_names = morphs_for_module(character, module)
        # Gate 2 intentionally simplifies eyebrow geometry at LOD2. Preserve the
        # required brow controls on the eye mesh so the runtime control contract
        # remains stable across all LODs.
        if lod == 2 and module == "Eyes":
            target_names += ["Brow_Up_L", "Brow_Up_R", "Brow_Down_L", "Brow_Down_R"]
        if target_names:
            mesh.setdefault("extras", {})["targetNames"] = target_names
            mesh["weights"] = [0.0] * len(target_names)
        for primitive in mesh["primitives"]:
            position_values = accessor_values(gltf, binary, primitive["attributes"]["POSITION"])
            candidates = candidates_for_module(character, module, bone_order)
            joint_values, weight_values = [], []
            for position in position_values:
                joint = nearest_joint(position, candidates, positions, bone_order)
                joint_values.append((joint, 0, 0, 0))
                weight_values.append((1.0, 0.0, 0.0, 0.0))
            primitive["attributes"]["JOINTS_0"] = add_accessor(gltf, binary, joint_values, 5123, "VEC4", 34962)
            primitive["attributes"]["WEIGHTS_0"] = add_accessor(gltf, binary, weight_values, 5126, "VEC4", 34962)
            if target_names:
                center = tuple(sum(value[i] for value in position_values) / len(position_values) for i in range(3))
                primitive["targets"] = []
                for morph in target_names:
                    deltas = [morph_delta(morph, value, center) for value in position_values]
                    accessor = add_accessor(gltf, binary, deltas, 5126, "VEC3", 34962, bounds=True)
                    primitive["targets"].append({"POSITION": accessor})

    pose_names = add_pose_animations(gltf, binary, character, bone_nodes)
    gltf["asset"]["generator"] = "MathChakChak deterministic Gate 3 rig builder v1.0"
    gltf.setdefault("extras", {}).update({
        "gate": 3, "rig_type": "Humanoid stylized rig" if character == "Chakchaki" else "Custom creature rig",
        "source_gate2_sha256": sha256(source), "unit": "meter", "up_axis": "Y", "root_scale": 1.0,
        "required_morphs": COMMON_MORPHS + (GONG_REQUIRED_MORPHS if character == "Gongsickyi" else []),
        "pose_library": pose_names,
    })
    write_glb(target, gltf, binary)
    morph_union = sorted({name for mesh in gltf["meshes"] for name in mesh.get("extras", {}).get("targetNames", [])})
    return {
        "character": character, "lod": lod, "source_path": source.relative_to(ROOT).as_posix(),
        "source_sha256": sha256(source), "path": target.relative_to(ROOT).as_posix(), "sha256": sha256(target),
        "bytes": target.stat().st_size, "joint_count": len(bones), "skin_count": 1,
        "morph_count": len(morph_union), "morph_names": morph_union, "pose_names": pose_names,
    }


def apply_morph(model, active):
    model = copy.deepcopy(model)
    for module, primitives in model.modules.items():
        allowed = set(morphs_for_module(model.character, module))
        targets = [(name, weight) for name, weight in active.items() if name in allowed]
        for primitive in primitives:
            center = tuple(sum(value[i] for value in primitive.positions) / len(primitive.positions) for i in range(3))
            primitive.positions = [
                tuple(position[i] + sum(morph_delta(name, position, center)[i] * weight for name, weight in targets) for i in range(3))
                for position in primitive.positions
            ]
    return model


def skeleton_preview(character, model, bones):
    panels = []
    vertices = [position for primitive in model.primitives for position in primitive.positions]
    max_y = max(value[1] for value in vertices)
    for view in ("front", "side"):
        panel = render_model(model, view)
        draw = ImageDraw.Draw(panel)
        if view == "front":
            hs = [value[0] for value in vertices]
            project_h = lambda p: p[0]
        else:
            hs = [-value[2] for value in vertices]
            project_h = lambda p: -p[2]
        center = (min(hs) + max(hs)) / 2
        extent = max(max(hs) - min(hs), max_y) * 1.18
        scale = min(panel.size) / extent
        project = lambda p: (panel.width / 2 + (project_h(p) - center) * scale, panel.height * 0.91 - p[1] * scale)
        positions = {name: position for name, _, position in bones}
        for name, parent, position in bones:
            if parent:
                draw.line((project(positions[parent]), project(position)), fill="#22D3EE", width=3)
        for name, _, position in bones:
            x, y = project(position)
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill="#F43F5E", outline="white")
        label_cell(panel, f"{character} skeleton {view}")
        panels.append(panel)
    sheet = Image.new("RGB", (1280, 720), "#E2E8F0")
    sheet.paste(panels[0], (0, 0)); sheet.paste(panels[1], (640, 0))
    return sheet


def deformation_preview(character, model):
    if character == "Chakchaki":
        states = [("Base", {}), ("Smile + Wide", {"Smile": 1, "Eyes_Wide": 0.7}), ("Blink", {"Blink_L": 1, "Blink_R": 1}), ("Concern", {"Frown": 1, "Brow_Down_L": 1, "Brow_Down_R": 1})]
    else:
        states = [("Base", {}), ("Smile + Wide", {"Smile": 1, "Eyes_Wide": 0.7}), ("Blink + Squash", {"Blink_L": 1, "Blink_R": 1, "Body_Squash": 0.7}), ("Wing Open", {"Wing_Open": 1, "Body_Stretch": 0.25})]
    sheet = Image.new("RGB", (2560, 720), "#E2E8F0")
    for index, (label, active) in enumerate(states):
        panel = render_model(apply_morph(model, active), "front")
        label_cell(panel, label)
        sheet.paste(panel, (index * 640, 0))
    return sheet


def rotate_module_side(model, modules, side, pivot, degrees):
    radians = math.radians(degrees)
    cosine, sine = math.cos(radians), math.sin(radians)
    for module in modules:
        for primitive in model.modules.get(module, []):
            updated = []
            for x, y, z in primitive.positions:
                if (side == "positive" and x < 0) or (side == "negative" and x > 0):
                    updated.append((x, y, z)); continue
                dx, dy = x - pivot[0], y - pivot[1]
                updated.append((pivot[0] + dx * cosine - dy * sine, pivot[1] + dx * sine + dy * cosine, z))
            primitive.positions = updated


def pose_preview(character, model):
    states = []
    if character == "Chakchaki":
        states.append(("Rest", copy.deepcopy(model)))
        point = copy.deepcopy(model); rotate_module_side(point, ["Arms", "Hands", "Fingers"], "positive", (0.22, 0.91), 55)
        states.append(("Hand Point", point))
        thumbs = copy.deepcopy(model); rotate_module_side(thumbs, ["Arms", "Hands", "Fingers"], "negative", (-0.22, 0.91), -32)
        states.append(("Thumbs Up", thumbs))
        fist = copy.deepcopy(model)
        for primitive in fist.modules.get("Fingers", []):
            cx = sum(p[0] for p in primitive.positions) / len(primitive.positions)
            cy = sum(p[1] for p in primitive.positions) / len(primitive.positions)
            primitive.positions = [(cx + (x - cx) * 0.72, cy + (y - cy) * 0.72, z) for x, y, z in primitive.positions]
        states.append(("Hand Fist", fist))
    else:
        states.append(("Prop Left Socket", copy.deepcopy(model)))
        mirrored = copy.deepcopy(model)
        for primitive in mirrored.modules.get("StarPointer", []):
            primitive.positions = [(-x, y, z) for x, y, z in primitive.positions]
            primitive.normals = [(-x, y, z) for x, y, z in primitive.normals]
        states.append(("Prop Right Socket", mirrored))
        states.append(("Wing Open", apply_morph(model, {"Wing_Open": 1.0})))
        folded = apply_morph(model, {"Wing_Fold": 1.0}); states.append(("Wing Fold", folded))
    sheet = Image.new("RGB", (2560, 720), "#E2E8F0")
    for index, (label, posed) in enumerate(states):
        panel = render_model(posed, "front")
        label_cell(panel, label)
        sheet.paste(panel, (index * 640, 0))
    return sheet


def main():
    gate2 = json.loads(GATE2_MANIFEST.read_text(encoding="utf-8"))
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True); PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    files = []
    for record in gate2["files"]:
        character, lod = record["character"], record["lod"]
        source = ROOT / record["path"]
        if sha256(source) != record["sha256"]:
            raise RuntimeError(f"Gate 2 hash drift: {record['path']}")
        target = OUTPUT_ROOT / f"char_{character.lower()}_lod{lod}_v110.glb"
        files.append(rig_file(source, target, character, lod))

    previews = []
    for character, builder, bones in (("Chakchaki", build_chakchaki, CHAK_BONES), ("Gongsickyi", build_gongsickyi, GONG_BONES)):
        model = builder(0)
        preview_images = (
            ("SKELETON", skeleton_preview(character, model, bones), "Rig_Skeleton"),
            ("DEFORMATION", deformation_preview(character, model), "Deformation_Review"),
            ("POSE_SOCKET", pose_preview(character, model), "Pose_Socket_Review"),
        )
        for kind, image, suffix in preview_images:
            path = PREVIEW_ROOT / f"{character}_{suffix}.png"
            image.save(path)
            previews.append({"character": character, "type": kind, "path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path)})

    manifest = {
        "schema_version": "1.0.0", "generated_at": datetime.now(timezone.utc).isoformat(), "gate": 3,
        "status": "RIG_CANDIDATE_BUILT", "format": "glTF 2.0 binary GLB with skins and morph targets",
        "unit": "meter", "up_axis": "Y", "root_scale": 1.0, "rig_spec_path": RIG_SPEC.relative_to(ROOT).as_posix(),
        "rig_spec_sha256": sha256(RIG_SPEC), "files": files, "previews": previews,
        "required_common_morphs": COMMON_MORPHS, "required_gongsickyi_morphs": GONG_REQUIRED_MORPHS,
        "manual_review_required": 1, "next_gate_allowed": False,
        "known_constraints": ["No Blender executable is available; skin, bind matrices and morph accessors are generated and audited directly.", "Automatic rigid-nearest-joint weights remain a candidate until human deformation review."],
    }
    EVIDENCE_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("GATE3_RIG_BUILT")
    for item in files:
        print(f"{item['character']} LOD{item['lod']} joints={item['joint_count']} morphs={item['morph_count']} poses={len(item['pose_names'])} bytes={item['bytes']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
