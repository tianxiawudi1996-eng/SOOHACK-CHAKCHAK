#!/usr/bin/env python3
"""Build smooth, editable Stage 8 character models from the approved design locks."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity"
SOURCE = OUT / "source"
GLB = OUT / "glb"
RENDER = OUT / "renders"
for directory in (SOURCE, GLB, RENDER):
    directory.mkdir(parents=True, exist_ok=True)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def rgba(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    srgb = tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    linear = tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)
    return linear + (1.0,)


def material(name: str, color: str, roughness: float = 0.48, metallic: float = 0.0,
             noise_scale: float | None = None, bump_strength: float = 0.08) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if noise_scale:
        noise = mat.node_tree.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 3.0
        noise.inputs["Roughness"].default_value = 0.7
        bump = mat.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = bump_strength
        bump.inputs["Distance"].default_value = 0.04
        mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def finish(obj: bpy.types.Object, name: str, mat: bpy.types.Material | None = None,
           parent: bpy.types.Object | None = None) -> bpy.types.Object:
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def uv_sphere(name: str, loc, scale, mat, parent=None, segments=64, rings=32) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def round_cube(name: str, loc, scale, mat, parent=None, bevel=0.16) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("SoftEdge", "BEVEL")
    mod.width = bevel
    mod.segments = 5
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat, parent)


def cylinder(name: str, loc, radius, depth, mat, parent=None, rotation=(0, 0, 0), vertices=48) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent)


def cylinder_between(name: str, a, b, radius, mat, parent=None) -> bpy.types.Object:
    start, end = Vector(a), Vector(b)
    direction = end - start
    obj = cylinder(name, (start + end) / 2, radius, direction.length, mat, parent)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def capsule_between(name: str, a, b, radius, mat, parent=None) -> bpy.types.Object:
    start, end = Vector(a), Vector(b)
    direction = end - start
    obj = uv_sphere(name, (start + end) / 2, (radius, radius, direction.length / 2 + radius * 0.35), mat, parent, 64, 32)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def torus(name: str, loc, major, minor, mat, parent=None, rotation=(math.pi / 2, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64,
                                    minor_segments=16, location=loc, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent)


def curve(name: str, points, bevel, mat, parent=None, cyclic=False) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 16
    data.bevel_depth = bevel
    data.bevel_resolution = 5
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = point
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, parent)


def star(name: str, loc, radius, depth, mat, parent=None, rotation_z=0.0) -> bpy.types.Object:
    verts = []
    for y in (-depth / 2, depth / 2):
        for i in range(10):
            angle = math.pi / 2 + i * math.pi / 5 + rotation_z
            r = radius if i % 2 == 0 else radius * 0.46
            verts.append((r * math.cos(angle), y, r * math.sin(angle)))
    faces = [tuple(range(10)), tuple(range(19, 9, -1))]
    for i in range(10):
        n = (i + 1) % 10
        faces.append((i, n, 10 + n, 10 + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    bevel = obj.modifiers.new("RoundedStar", "BEVEL")
    bevel.width = radius * 0.06
    bevel.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return finish(obj, name, mat, parent)


def text_object(name: str, text: str, loc, size, depth, mat, parent=None) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "FONT")
    data.body = text
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.extrude = depth
    data.bevel_depth = depth * 0.25
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (math.pi / 2, 0, 0)
    return finish(obj, name, mat, parent)


def add_eye(prefix: str, x: float, y: float, z: float, scale, mats, parent) -> None:
    uv_sphere(prefix + ".Sclera", (x, y, z), scale, mats["white"], parent)
    uv_sphere(prefix + ".Iris", (x, y - scale[1] * 0.88, z),
              (scale[0] * 0.56, scale[1] * 0.28, scale[2] * 0.58), mats["iris"], parent, 48, 24)
    uv_sphere(prefix + ".Pupil", (x, y - scale[1] * 1.06, z),
              (scale[0] * 0.30, scale[1] * 0.20, scale[2] * 0.32), mats["pupil"], parent, 48, 24)
    uv_sphere(prefix + ".Catchlight", (x - scale[0] * 0.16, y - scale[1] * 1.24, z + scale[2] * 0.20),
              (scale[0] * 0.10, scale[1] * 0.08, scale[2] * 0.11), mats["white"], parent, 32, 16)


def common_materials() -> dict[str, bpy.types.Material]:
    return {
        "white": material("M_White", "F8F7F3", 0.34),
        "pupil": material("M_Pupil", "1B100D", 0.24),
        "iris": material("M_IrisWarmBrown", "5B2D18", 0.30),
        "navy": material("M_DeepNavy", "172033", 0.34),
        "blue": material("M_PrimaryBlue", "2F5BFF", 0.40, noise_scale=70, bump_strength=0.04),
        "deepblue": material("M_DeepBlue", "173EA5", 0.40),
        "skin": material("M_WarmSkin", "F0AA78", 0.53, noise_scale=110, bump_strength=0.025),
        "hair": material("M_DarkWarmBrownHair", "2B160E", 0.42),
        "mouth": material("M_MouthInterior", "461518", 0.46),
        "tongue": material("M_Tongue", "E76F72", 0.42),
        "cheek": material("M_Cheek", "F38A91", 0.62),
        "rubber": material("M_ShoeRubber", "E7E4DD", 0.60),
        "yellow": material("M_RewardYellowDown", "FFB84D", 0.68, noise_scale=85, bump_strength=0.11),
        "yellow_hi": material("M_YellowHighlight", "FFD57A", 0.62, noise_scale=80, bump_strength=0.08),
        "orange": material("M_BeakOrange", "E68A24", 0.46),
        "brown": material("M_WarmBrown", "643518", 0.55),
        "gold": material("M_StarGold", "FFC928", 0.32, metallic=0.08),
    }


def build_gongsickyi() -> tuple[bpy.types.Object, list[str]]:
    mats = common_materials()
    root = bpy.data.objects.new("Gongsickyi_ROOT", None)
    bpy.context.collection.objects.link(root)
    modules = []
    body = uv_sphere("Body", (0, 0, 1.58), (1.18, 0.92, 1.26), mats["yellow"], root, 96, 64)
    modules.append(body.name)
    for side in (-1, 1):
        x = side * 0.47
        add_eye(f"Eyes.{ 'L' if side < 0 else 'R' }", x, -0.86, 1.78, (0.33, 0.15, 0.39), mats, root)
        torus(f"Glasses.Rim.{ 'L' if side < 0 else 'R' }", (x, -1.04, 1.78), 0.38, 0.043, mats["navy"], root)
        curve(f"Eyebrows.{ 'L' if side < 0 else 'R' }",
              [(x - 0.18, -1.03, 2.19), (x, -1.10, 2.25), (x + 0.18, -1.03, 2.19)],
              0.035, mats["orange"], root)
        wing_x = side * 1.14
        wing = uv_sphere(f"Wings.{ 'L' if side < 0 else 'R' }", (wing_x, -0.01, 1.42),
                         (0.28, 0.43, 0.50), mats["yellow"], root, 64, 36)
        wing.rotation_euler = (0.10, side * 0.25, side * 0.20)
        modules.append(wing.name)
    curve("Glasses.Bridge", [(-0.10, -1.07, 1.80), (0, -1.13, 1.86), (0.10, -1.07, 1.80)],
          0.042, mats["navy"], root)
    curve("Glasses.Temple.L", [(-0.84, -0.94, 1.81), (-1.06, -0.68, 1.80)], 0.035, mats["navy"], root)
    curve("Glasses.Temple.R", [(0.84, -0.94, 1.81), (1.06, -0.68, 1.80)], 0.035, mats["navy"], root)
    modules.append("Glasses")
    uv_sphere("MouthBeak.Upper", (0, -1.00, 1.44), (0.25, 0.14, 0.11), mats["orange"], root, 48, 24)
    uv_sphere("MouthBeak.Lower", (0, -1.01, 1.38), (0.20, 0.12, 0.075), mats["gold"], root, 48, 24)
    modules += ["Eyes", "Eyebrows", "MouthBeak"]
    for side in (-1, 1):
        foot = uv_sphere(f"Feet.{ 'L' if side < 0 else 'R' }", (side * 0.43, -0.22, 0.24),
                         (0.46, 0.62, 0.24), mats["brown"], root, 64, 32)
        modules.append(foot.name)
    # Graduation cap with softened crown, square board, tassel and knot.
    uv_sphere("GraduationCap.Crown", (0, 0.02, 2.78), (0.70, 0.62, 0.27), mats["navy"], root, 64, 32)
    board = round_cube("GraduationCap.Board", (0, -0.02, 3.02), (1.00, 0.84, 0.065), mats["navy"], root, 0.022)
    board.rotation_euler[2] = math.radians(-5)
    curve("GraduationCap.TasselCord", [(0.32, -0.63, 3.08), (0.80, -0.72, 2.96), (0.82, -0.77, 2.61)],
          0.025, mats["gold"], root)
    uv_sphere("GraduationCap.TasselKnot", (0.82, -0.77, 2.57), (0.09, 0.07, 0.11), mats["gold"], root, 32, 16)
    curve("GraduationCap.Tassel", [(0.77, -0.77, 2.50), (0.70, -0.77, 2.34)], 0.022, mats["gold"], root)
    curve("GraduationCap.Tassel.2", [(0.82, -0.77, 2.50), (0.82, -0.77, 2.31)], 0.022, mats["gold"], root)
    curve("GraduationCap.Tassel.3", [(0.87, -0.77, 2.50), (0.94, -0.77, 2.34)], 0.022, mats["gold"], root)
    modules.append("GraduationCap")
    # Pointer is held beside the left wing and remains a separate prop module.
    cylinder_between("StarPointer.Handle", (-1.15, -0.32, 1.00), (-1.48, -0.34, 2.38), 0.052, mats["brown"], root)
    star("StarPointer.Star", (-1.54, -0.34, 2.61), 0.27, 0.12, mats["gold"], root, rotation_z=0.12)
    modules.append("StarPointer")
    return root, sorted(set(modules))


def add_fingers(prefix: str, center, side: int, mats, root) -> None:
    uv_sphere(prefix + ".Palm", center, (0.18, 0.13, 0.22), mats["skin"], root, 56, 28)
    uv_sphere(prefix + ".Thumb", (center[0] + side * 0.15, center[1] - 0.045, center[2] + 0.03),
              (0.07, 0.055, 0.10), mats["skin"], root, 36, 18)
    for i, offset in enumerate((-0.075, 0.0, 0.075)):
        uv_sphere(f"{prefix}.Finger{i + 1}", (center[0] + offset, center[1] - 0.025, center[2] - 0.14),
                  (0.045, 0.045, 0.10), mats["skin"], root, 32, 16)


def build_chakchaki() -> tuple[bpy.types.Object, list[str]]:
    mats = common_materials()
    hoodie = material("M_HoodieFabric", "F7F2EA", 0.72, noise_scale=78, bump_strength=0.08)
    root = bpy.data.objects.new("Chakchaki_ROOT", None)
    bpy.context.collection.objects.link(root)
    modules = []
    # Backpack first so it sits behind the torso.
    round_cube("Backpack.Body", (0, 0.40, 2.04), (0.50, 0.22, 0.58), mats["blue"], root, 0.17)
    round_cube("Backpack.Pocket", (0, 0.59, 1.88), (0.36, 0.08, 0.22), mats["deepblue"], root, 0.08)
    curve("Backpack.Strap.L", [(-0.40, 0.05, 2.58), (-0.54, -0.39, 2.17), (-0.43, -0.40, 1.61)], 0.038, mats["deepblue"], root)
    curve("Backpack.Strap.R", [(0.40, 0.05, 2.58), (0.54, -0.39, 2.17), (0.43, -0.40, 1.61)], 0.038, mats["deepblue"], root)
    modules.append("Backpack")
    # Legs, socks and large structured sneakers.
    for side in (-1, 1):
        x = side * 0.32
        cylinder(f"Legs.{ 'L' if side < 0 else 'R' }", (x, -0.02, 0.79), 0.16, 0.58, mats["skin"], root)
        cylinder(f"Socks.{ 'L' if side < 0 else 'R' }", (x, -0.02, 0.53), 0.18, 0.24, mats["white"], root)
        uv_sphere(f"Shoes.{ 'L' if side < 0 else 'R' }.Upper", (x, -0.17, 0.29), (0.31, 0.46, 0.22), mats["blue"], root, 64, 32)
        round_cube(f"Shoes.{ 'L' if side < 0 else 'R' }.Sole", (x, -0.20, 0.11), (0.35, 0.51, 0.10), mats["rubber"], root, 0.08)
        uv_sphere(f"Shoes.{ 'L' if side < 0 else 'R' }.Toe", (x, -0.57, 0.28), (0.29, 0.20, 0.18), mats["white"], root, 48, 24)
        for lace in (-0.10, 0, 0.10):
            curve(f"Shoes.{side}.Lace{lace}", [(x - 0.16, -0.48 + lace, 0.43), (x + 0.16, -0.48 + lace, 0.43)], 0.018, mats["white"], root)
    modules += ["Legs", "Shoes"]
    # Shorts are separated into waistband and legs for deformation later.
    round_cube("Shorts.Waist", (0, -0.01, 1.22), (0.56, 0.43, 0.25), mats["blue"], root, 0.14)
    round_cube("Shorts.Leg.L", (-0.29, -0.02, 1.03), (0.30, 0.42, 0.25), mats["blue"], root, 0.13)
    round_cube("Shorts.Leg.R", (0.29, -0.02, 1.03), (0.30, 0.42, 0.25), mats["blue"], root, 0.13)
    curve("Shorts.Seam", [(0, -0.45, 1.30), (0, -0.47, 1.03)], 0.012, mats["deepblue"], root)
    modules.append("Shorts")
    # Hoodie torso, hood, sleeves, cuffs and drawstrings.
    uv_sphere("Body", (0, 0.00, 1.87), (0.62, 0.46, 0.76), hoodie, root, 80, 48)
    torus("Hoodie.Hood", (0, 0.20, 2.48), 0.49, 0.13, hoodie, root, rotation=(math.pi / 2, 0, 0))
    round_cube("Hoodie.Pocket", (0, -0.45, 1.70), (0.34, 0.055, 0.18), hoodie, root, 0.08)
    curve("Hoodie.Drawstring.L", [(-0.12, -0.47, 2.39), (-0.15, -0.52, 2.04)], 0.018, mats["rubber"], root)
    curve("Hoodie.Drawstring.R", [(0.12, -0.47, 2.39), (0.15, -0.52, 2.04)], 0.018, mats["rubber"], root)
    uv_sphere("Hoodie.StringEnd.L", (-0.15, -0.53, 2.01), (0.035, 0.03, 0.055), mats["rubber"], root, 24, 12)
    uv_sphere("Hoodie.StringEnd.R", (0.15, -0.53, 2.01), (0.035, 0.03, 0.055), mats["rubber"], root, 24, 12)
    for side in (-1, 1):
        shoulder = (side * 0.53, 0, 2.24)
        elbow = (side * 0.72, -0.02, 1.82)
        wrist = (side * 0.76, -0.13, 1.51)
        capsule_between(f"Arms.{side}.Upper", shoulder, elbow, 0.18, hoodie, root)
        capsule_between(f"Arms.{side}.Lower", elbow, wrist, 0.16, hoodie, root)
        cylinder_between(f"Hoodie.Cuff.{side}", (side * 0.75, -0.12, 1.58), (side * 0.77, -0.14, 1.46), 0.18, mats["blue"], root)
        add_fingers(f"Hands.{ 'L' if side < 0 else 'R' }", (side * 0.78, -0.14, 1.34), side, mats, root)
    modules += ["Body", "Hoodie", "Arms", "Hands", "Fingers"]
    # Head and face use layered smooth surfaces, not flat texture cards.
    head = uv_sphere("Head", (0, -0.02, 3.08), (0.67, 0.59, 0.67), mats["skin"], root, 96, 64)
    for vertex in head.data.vertices:
        if vertex.co.z < 0:
            taper = 1.0 + 0.16 * vertex.co.z / 0.67
            vertex.co.x *= taper
            vertex.co.y *= 0.97 + 0.03 * taper
    uv_sphere("Ears.L", (-0.66, -0.01, 3.07), (0.15, 0.10, 0.20), mats["skin"], root, 48, 24)
    uv_sphere("Ears.R", (0.66, -0.01, 3.07), (0.15, 0.10, 0.20), mats["skin"], root, 48, 24)
    add_eye("Eyes.L", -0.24, -0.58, 3.13, (0.19, 0.070, 0.24), mats, root)
    add_eye("Eyes.R", 0.24, -0.58, 3.13, (0.19, 0.070, 0.24), mats, root)
    curve("Eyebrows.L", [(-0.42, -0.62, 3.43), (-0.26, -0.66, 3.49), (-0.09, -0.62, 3.44)], 0.029, mats["hair"], root)
    curve("Eyebrows.R", [(0.09, -0.62, 3.44), (0.26, -0.66, 3.49), (0.42, -0.62, 3.43)], 0.029, mats["hair"], root)
    uv_sphere("Nose", (0, -0.63, 2.97), (0.070, 0.045, 0.080), mats["skin"], root, 40, 20)
    curve("Mouth.Smile", [(-0.20, -0.635, 2.83), (0, -0.665, 2.75), (0.20, -0.635, 2.83)], 0.018, mats["mouth"], root)
    modules += ["Head", "Eyes", "Eyebrows", "Mouth", "Ears", "Nose"]
    # Hair cap and individually shaped fringe tufts preserve the approved silhouette.
    uv_sphere("Hair.Cap", (0, 0.02, 3.43), (0.64, 0.55, 0.34), mats["hair"], root, 80, 44)
    fringe_specs = [(-0.46, -0.51, 3.44, -18), (-0.31, -0.57, 3.49, -10), (-0.15, -0.60, 3.45, -4),
                    (0.03, -0.61, 3.50, 6), (0.20, -0.58, 3.45, 13), (0.38, -0.52, 3.48, 20)]
    for i, (x, y, z, angle) in enumerate(fringe_specs):
        tuft = uv_sphere(f"Fringe.{i + 1:02d}", (x, y, z), (0.17, 0.080, 0.22), mats["hair"], root, 48, 24)
        tuft.rotation_euler[1] = math.radians(angle)
    modules += ["Hair", "Fringe"]
    # Round cap, structured brim and replaceable placeholder badge.
    uv_sphere("Cap.Crown", (0, 0.00, 3.80), (0.69, 0.60, 0.35), mats["blue"], root, 80, 44)
    brim = uv_sphere("Cap.Brim", (0, -0.57, 3.65), (0.53, 0.29, 0.070), mats["deepblue"], root, 64, 28)
    brim.rotation_euler[0] = math.radians(-7)
    uv_sphere("CapBadge.Base", (0, -0.630, 3.83), (0.18, 0.03, 0.16), mats["white"], root, 48, 24)
    text_object("CapBadge.PlaceholderS", "S", (0, -0.670, 3.83), 0.23, 0.014, mats["blue"], root)
    modules += ["Cap", "CapBadge"]
    return root, sorted(set(modules))


def setup_render(character: str) -> tuple[bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = rgba("F8FAFD")
    background.inputs["Strength"].default_value = 0.32
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    ground_mat = material("M_Ground", "EEF2F8", 0.82)
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, 0))
    ground = finish(bpy.context.object, "RenderGround", ground_mat)
    for name, loc, energy, size, color in (
        ("Key", (-4.5, -5.5, 7.5), 470, 5.5, (1.0, 0.95, 0.90)),
        ("Fill", (4.5, -3.0, 5.0), 260, 5.0, (0.82, 0.90, 1.0)),
        ("Rim", (2.0, 4.5, 6.0), 390, 4.0, (0.88, 0.93, 1.0)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (math.radians(25), 0, math.radians(25))
    cam_data = bpy.data.cameras.new("ReviewCamera")
    cam = bpy.data.objects.new("ReviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam_data.type = "ORTHO"
    cam_data.lens = 62
    cam_data.ortho_scale = 3.75 if character == "Gongsickyi" else 4.80
    scene.camera = cam
    return cam, ground


def point_camera(camera: bpy.types.Object, location, target) -> None:
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_views(character: str, root: bpy.types.Object) -> list[str]:
    camera, ground = setup_render(character)
    center = 1.52 if character == "Gongsickyi" else 2.05
    distance = 9.0
    views = {
        "front": ((0, -distance, center), (0, 0, center)),
        "side_left": ((-distance, 0, center), (0, 0, center)),
        "three_quarter": ((-6.2, -6.2, center + 0.05), (0, 0, center)),
    }
    paths = []
    for view, (location, target) in views.items():
        point_camera(camera, location, target)
        path = RENDER / f"{character}_{view}_v2.0.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        paths.append(path.relative_to(ROOT).as_posix())
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.objects.remove(ground, do_unlink=True)
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)
    return paths


def select_character(root: bpy.types.Object) -> list[bpy.types.Object]:
    selected = [root] + list(root.children_recursive)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in selected:
        obj.hide_render = False
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    return selected


def convert_character_to_mesh(root: bpy.types.Object) -> None:
    for obj in list(root.children_recursive):
        if obj.type in {"CURVE", "FONT"}:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.convert(target="MESH")
            for polygon in obj.data.polygons:
                polygon.use_smooth = True


def export_glb(root: bpy.types.Object, path: Path) -> None:
    select_character(root)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True)


def mesh_stats(root: bpy.types.Object) -> dict[str, int]:
    meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
    return {
        "mesh_objects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons),
        "materials": len({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
    }


def decimate(root: bpy.types.Object, ratio: float) -> None:
    for obj in list(root.children_recursive):
        if obj.type != "MESH" or len(obj.data.polygons) < 160:
            continue
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        mod = obj.modifiers.new(f"LOD_{ratio}", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            obj.modifiers.remove(mod)


def produce(character: str, builder) -> dict:
    clear_scene()
    root, modules = builder()
    renders = render_views(character, root)
    source_path = SOURCE / f"{character}_HighFidelity_v2.0.blend"
    select_character(root)
    bpy.ops.wm.save_as_mainfile(filepath=str(source_path), compress=True)
    convert_character_to_mesh(root)
    lod_records = []
    for lod, ratio in ((0, None), (1, 0.55), (2, 0.40)):
        if ratio:
            decimate(root, ratio)
        glb_path = GLB / f"char_{character.lower()}_lod{lod}_v200.glb"
        export_glb(root, glb_path)
        lod_records.append({"lod": lod, "path": glb_path.relative_to(ROOT).as_posix(), **mesh_stats(root)})
    return {
        "character": character,
        "source": source_path.relative_to(ROOT).as_posix(),
        "modules": modules,
        "renders": renders,
        "lods": lod_records,
    }


def main() -> int:
    records = [produce("Gongsickyi", build_gongsickyi), produce("Chakchaki", build_chakchaki)]
    manifest = {
        "schema_version": "2.0.0",
        "blender_version": bpy.app.version_string,
        "status": "HIGH_FIDELITY_CANDIDATES_BUILT",
        "characters": records,
        "manual_visual_review_required": True,
        "gate2_verified": False,
    }
    (OUT / "BUILD_RECORD_v2.0.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
