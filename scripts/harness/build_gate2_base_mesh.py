#!/usr/bin/env python3
"""Build deterministic glTF 2.0 base-mesh candidates for Stage 8 Gate 2."""

from __future__ import annotations

import hashlib
import json
import math
import struct
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2"
PREVIEW_ROOT = ROOT / "docs/stage8/evidence/gate2/previews"
MANIFEST_PATH = ROOT / "docs/stage8/evidence/gate2/GATE2_BUILD_MANIFEST_v1.0.json"
REFERENCE_ROOT = ROOT / "docs/stage8/evidence/gate1/views"

SOURCE_HASHES = {
    "Chakchaki": "916636d0cb1603ad0eed785cf9e827b693687fe437c1eb24014724a0f1b57480",
    "Gongsickyi": "9c8061afab5bc381edc02780c0ee9265489d977f3cecfc1e8e52ab6467b01157",
}

LOD_CONFIG = {
    0: {"sphere_lon": 24, "sphere_lat": 16, "cylinder": 16, "torus_major": 20, "torus_minor": 8},
    1: {"sphere_lon": 16, "sphere_lat": 12, "cylinder": 8, "torus_major": 14, "torus_minor": 6},
    2: {"sphere_lon": 12, "sphere_lat": 8, "cylinder": 6, "torus_major": 10, "torus_minor": 5},
}


def hex_rgba(value: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (alpha,)


MATERIALS = {
    "Skin": ("#E9B58E", 0.72, 0.0),
    "Hair": ("#3A241C", 0.78, 0.0),
    "PrimaryBlue": ("#2F5BFF", 0.62, 0.0),
    "DeepNavy": ("#172033", 0.58, 0.0),
    "WarmWhite": ("#F7F1E8", 0.82, 0.0),
    "Rubber": ("#B8B5B0", 0.88, 0.0),
    "EyeWhite": ("#FFFDF7", 0.32, 0.0),
    "IrisBrown": ("#5A3827", 0.38, 0.0),
    "Mouth": ("#8F3E48", 0.62, 0.0),
    "Cheek": ("#EE8C91", 0.68, 0.0),
    "BadgePlaceholder": ("#FFD57A", 0.45, 0.05),
    "RewardYellow": ("#FFB84D", 0.76, 0.0),
    "OrangeKeratin": ("#F28A2E", 0.62, 0.0),
    "WarmBrown": ("#8A5A32", 0.72, 0.0),
    "Gold": ("#E6B94A", 0.48, 0.08),
    "StarEmissive": ("#FFD34F", 0.42, 0.0),
}


def add(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return a[0] + b[0], a[1] + b[1], a[2] + b[2]


def sub(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return a[0] - b[0], a[1] - b[1], a[2] - b[2]


def mul(a: tuple[float, float, float], scalar: float) -> tuple[float, float, float]:
    return a[0] * scalar, a[1] * scalar, a[2] * scalar


def dot(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]


def normalize(value: tuple[float, float, float]) -> tuple[float, float, float]:
    length = math.sqrt(max(dot(value, value), 1e-20))
    return value[0] / length, value[1] / length, value[2] / length


def rotate_xyz(point: tuple[float, float, float], rotation: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = point
    rx, ry, rz = rotation
    cx, sx = math.cos(rx), math.sin(rx)
    y, z = y * cx - z * sx, y * sx + z * cx
    cy, sy = math.cos(ry), math.sin(ry)
    x, z = x * cy + z * sy, -x * sy + z * cy
    cz, sz = math.cos(rz), math.sin(rz)
    x, y = x * cz - y * sz, x * sz + y * cz
    return x, y, z


@dataclass
class Primitive:
    name: str
    material: str
    positions: list[tuple[float, float, float]]
    normals: list[tuple[float, float, float]]
    uvs: list[tuple[float, float]]
    indices: list[int]

    def transformed(
        self,
        center: tuple[float, float, float] = (0.0, 0.0, 0.0),
        scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
        rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> "Primitive":
        positions = []
        normals = []
        for position, normal in zip(self.positions, self.normals):
            scaled = position[0] * scale[0], position[1] * scale[1], position[2] * scale[2]
            positions.append(add(rotate_xyz(scaled, rotation), center))
            inverse = normal[0] / scale[0], normal[1] / scale[1], normal[2] / scale[2]
            normals.append(normalize(rotate_xyz(inverse, rotation)))
        return Primitive(self.name, self.material, positions, normals, list(self.uvs), list(self.indices))


@dataclass
class CharacterModel:
    character: str
    lod: int
    modules: dict[str, list[Primitive]] = field(default_factory=dict)
    module_extras: dict[str, dict] = field(default_factory=dict)

    def add(self, module: str, *primitives: Primitive, extras: dict | None = None) -> None:
        self.modules.setdefault(module, []).extend(primitives)
        if extras:
            self.module_extras[module] = extras

    @property
    def primitives(self) -> Iterable[Primitive]:
        for primitives in self.modules.values():
            yield from primitives


def uv_sphere(name: str, material: str, lon: int, lat: int) -> Primitive:
    positions = [(0.0, 1.0, 0.0)]
    normals = [(0.0, 1.0, 0.0)]
    uvs = [(0.5, 0.0)]
    for j in range(1, lat):
        theta = math.pi * j / lat
        for i in range(lon):
            phi = 2 * math.pi * i / lon
            value = math.sin(theta) * math.cos(phi), math.cos(theta), math.sin(theta) * math.sin(phi)
            positions.append(value)
            normals.append(value)
            uvs.append((i / lon, j / lat))
    bottom = len(positions)
    positions.append((0.0, -1.0, 0.0))
    normals.append((0.0, -1.0, 0.0))
    uvs.append((0.5, 1.0))
    indices: list[int] = []
    for i in range(lon):
        next_i = (i + 1) % lon
        indices.extend((0, 1 + next_i, 1 + i))
    for j in range(lat - 2):
        row = 1 + j * lon
        next_row = row + lon
        for i in range(lon):
            next_i = (i + 1) % lon
            indices.extend((row + i, row + next_i, next_row + next_i))
            indices.extend((row + i, next_row + next_i, next_row + i))
    last_row = 1 + (lat - 2) * lon
    for i in range(lon):
        next_i = (i + 1) % lon
        indices.extend((last_row + i, last_row + next_i, bottom))
    return Primitive(name, material, positions, normals, uvs, indices)


def box(name: str, material: str, size: tuple[float, float, float], center=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)) -> Primitive:
    hx, hy, hz = (value / 2 for value in size)
    faces = [
        ((0, 0, 1), [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]),
        ((0, 0, -1), [(hx, -hy, -hz), (-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz)]),
        ((1, 0, 0), [(hx, -hy, hz), (hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz)]),
        ((-1, 0, 0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)]),
        ((0, 1, 0), [(-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz), (-hx, hy, -hz)]),
        ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)]),
    ]
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    uvs: list[tuple[float, float]] = []
    indices: list[int] = []
    for normal, corners in faces:
        offset = len(positions)
        positions.extend(corners)
        normals.extend([normal] * 4)
        uvs.extend([(0, 0), (1, 0), (1, 1), (0, 1)])
        indices.extend((offset, offset + 1, offset + 2, offset, offset + 2, offset + 3))
    return Primitive(name, material, positions, normals, uvs, indices).transformed(center, rotation=rotation)


def cylinder_between(
    name: str,
    material: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    segments: int,
) -> Primitive:
    direction = normalize(sub(end, start))
    helper = (0.0, 1.0, 0.0) if abs(direction[1]) < 0.9 else (1.0, 0.0, 0.0)
    axis_x = normalize(cross(helper, direction))
    axis_z = normalize(cross(direction, axis_x))
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    uvs: list[tuple[float, float]] = []
    indices: list[int] = []
    for endpoint_index, center in enumerate((start, end)):
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            radial = add(mul(axis_x, math.cos(angle)), mul(axis_z, math.sin(angle)))
            positions.append(add(center, mul(radial, radius)))
            normals.append(radial)
            uvs.append((i / segments, float(endpoint_index)))
    for i in range(segments):
        next_i = (i + 1) % segments
        indices.extend((i, next_i, segments + next_i, i, segments + next_i, segments + i))
    for center, normal, reverse in ((start, mul(direction, -1), True), (end, direction, False)):
        center_index = len(positions)
        positions.append(center)
        normals.append(normal)
        uvs.append((0.5, 0.5))
        ring_offset = len(positions)
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            radial = add(mul(axis_x, math.cos(angle)), mul(axis_z, math.sin(angle)))
            positions.append(add(center, mul(radial, radius)))
            normals.append(normal)
            uvs.append((0.5 + math.cos(angle) * 0.5, 0.5 + math.sin(angle) * 0.5))
        for i in range(segments):
            next_i = (i + 1) % segments
            if reverse:
                indices.extend((center_index, ring_offset + next_i, ring_offset + i))
            else:
                indices.extend((center_index, ring_offset + i, ring_offset + next_i))
    return Primitive(name, material, positions, normals, uvs, indices)


def torus(
    name: str,
    material: str,
    center: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    major_segments: int,
    minor_segments: int,
    scale=(1.0, 1.0, 1.0),
) -> Primitive:
    positions = []
    normals = []
    uvs = []
    indices = []
    for i in range(major_segments):
        u = 2 * math.pi * i / major_segments
        for j in range(minor_segments):
            v = 2 * math.pi * j / minor_segments
            radial = major_radius + minor_radius * math.cos(v)
            position = radial * math.cos(u), radial * math.sin(u), minor_radius * math.sin(v)
            normal = math.cos(v) * math.cos(u), math.cos(v) * math.sin(u), math.sin(v)
            positions.append(position)
            normals.append(normal)
            uvs.append((i / major_segments, j / minor_segments))
    for i in range(major_segments):
        next_i = (i + 1) % major_segments
        for j in range(minor_segments):
            next_j = (j + 1) % minor_segments
            a = i * minor_segments + j
            b = next_i * minor_segments + j
            c = next_i * minor_segments + next_j
            d = i * minor_segments + next_j
            indices.extend((a, b, c, a, c, d))
    return Primitive(name, material, positions, normals, uvs, indices).transformed(center, scale)


def star_prism(name: str, material: str, center: tuple[float, float, float], radius: float, depth: float) -> Primitive:
    ring = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        current = radius if i % 2 == 0 else radius * 0.45
        ring.append((math.cos(angle) * current, math.sin(angle) * current))
    positions = []
    normals = []
    uvs = []
    indices = []
    for z, normal in ((depth / 2, (0, 0, 1)), (-depth / 2, (0, 0, -1))):
        center_index = len(positions)
        positions.append((0, 0, z))
        normals.append(normal)
        uvs.append((0.5, 0.5))
        offset = len(positions)
        for x, y in ring:
            positions.append((x, y, z))
            normals.append(normal)
            uvs.append((0.5 + x / (2 * radius), 0.5 + y / (2 * radius)))
        for i in range(10):
            next_i = (i + 1) % 10
            if z > 0:
                indices.extend((center_index, offset + i, offset + next_i))
            else:
                indices.extend((center_index, offset + next_i, offset + i))
    for i in range(10):
        next_i = (i + 1) % 10
        x1, y1 = ring[i]
        x2, y2 = ring[next_i]
        normal = normalize((y2 - y1, -(x2 - x1), 0.0))
        offset = len(positions)
        positions.extend(((x1, y1, -depth / 2), (x2, y2, -depth / 2), (x2, y2, depth / 2), (x1, y1, depth / 2)))
        normals.extend([normal] * 4)
        uvs.extend(((0, 0), (1, 0), (1, 1), (0, 1)))
        indices.extend((offset, offset + 1, offset + 2, offset, offset + 2, offset + 3))
    return Primitive(name, material, positions, normals, uvs, indices).transformed(center)


def sphere_part(name: str, material: str, center, radii, config, rotation=(0.0, 0.0, 0.0)) -> Primitive:
    return uv_sphere(name, material, config["sphere_lon"], config["sphere_lat"]).transformed(center, radii, rotation)


def build_chakchaki(lod: int) -> CharacterModel:
    config = LOD_CONFIG[lod]
    model = CharacterModel("Chakchaki", lod)
    model.add("Head", sphere_part("Head", "Skin", (0, 1.14, 0.02), (0.225, 0.225, 0.20), config))
    model.add("Hair", sphere_part("Hair", "Hair", (0, 1.19, -0.090), (0.238, 0.205, 0.155), config))
    fringe = [] if lod == 2 else [
        sphere_part("Fringe_L", "Hair", (-0.072, 1.285, 0.182), (0.065, 0.065, 0.028), config, rotation=(0, 0, 0.25)),
        sphere_part("Fringe_R", "Hair", (0.055, 1.285, 0.187), (0.072, 0.060, 0.028), config, rotation=(0, 0, -0.2)),
    ]
    model.add("Fringe", *fringe)
    eyes = []
    for x in (-0.070, 0.070):
        eyes.append(sphere_part("EyeWhite", "EyeWhite", (x, 1.155, 0.205), (0.046, 0.054, 0.023), config))
        eyes.append(sphere_part("Iris", "IrisBrown", (x, 1.155, 0.226), (0.022, 0.029, 0.011), config))
    model.add("Eyes", *eyes)
    brows = [] if lod == 2 else [
        sphere_part("Brow_L", "Hair", (-0.070, 1.220, 0.211), (0.047, 0.011, 0.009), config, rotation=(0, 0, -0.1)),
        sphere_part("Brow_R", "Hair", (0.070, 1.220, 0.211), (0.047, 0.011, 0.009), config, rotation=(0, 0, 0.1)),
    ]
    model.add("Eyebrows", *brows)
    model.add("Eyelids")
    model.add("Mouth", sphere_part("Mouth", "Mouth", (0, 1.075, 0.220), (0.045, 0.016, 0.010), config))
    cheeks = [] if lod == 2 else [
        sphere_part("Cheek_L", "Cheek", (-0.120, 1.095, 0.210), (0.038, 0.018, 0.009), config),
        sphere_part("Cheek_R", "Cheek", (0.120, 1.095, 0.210), (0.038, 0.018, 0.009), config),
    ]
    model.add("Cheeks", *cheeks)
    model.add("Ears",
              sphere_part("Ear_L", "Skin", (-0.225, 1.14, 0.0), (0.038, 0.058, 0.030), config),
              sphere_part("Ear_R", "Skin", (0.225, 1.14, 0.0), (0.038, 0.058, 0.030), config))
    nose = [] if lod == 2 else [sphere_part("Nose", "Skin", (0, 1.115, 0.224), (0.018, 0.020, 0.015), config)]
    model.add("Nose", *nose)
    cap_parts = [
        sphere_part("CapCrown", "PrimaryBlue", (0, 1.370, -0.015), (0.250, 0.110, 0.215), config),
        box("CapBrim", "PrimaryBlue", (0.31, 0.022, 0.16), (0, 1.335, 0.172), rotation=(0.08, 0, 0)),
    ]
    model.add("Cap", *cap_parts)
    model.add(
        "CapBadge",
        sphere_part("CapBadgePlaceholder", "BadgePlaceholder", (0, 1.390, 0.205), (0.043, 0.043, 0.010), config),
        extras={"status": "PLACEHOLDER_IP_PENDING", "final_symbol_locked": False},
    )
    model.add("Body", sphere_part("Body", "Skin", (0, 0.78, -0.01), (0.205, 0.285, 0.145), config))
    model.add("Hoodie", sphere_part("Hoodie", "WarmWhite", (0, 0.78, 0.0), (0.250, 0.315, 0.185), config))
    model.add("Shorts", sphere_part("Shorts", "PrimaryBlue", (0, 0.515, 0.0), (0.230, 0.145, 0.170), config))
    model.add("Arms",
              sphere_part("Arm_L", "WarmWhite", (-0.305, 0.76, 0.0), (0.068, 0.22, 0.068), config, rotation=(0, 0, -0.28)),
              sphere_part("Arm_R", "WarmWhite", (0.305, 0.76, 0.0), (0.068, 0.22, 0.068), config, rotation=(0, 0, 0.28)))
    model.add("Hands",
              sphere_part("Hand_L", "Skin", (-0.405, 0.575, 0.0), (0.073, 0.075, 0.058), config),
              sphere_part("Hand_R", "Skin", (0.405, 0.575, 0.0), (0.073, 0.075, 0.058), config))
    fingers = [] if lod == 2 else [
        sphere_part("Finger_L", "Skin", (-0.425, 0.555, 0.035), (0.035, 0.055, 0.025), config),
        sphere_part("Finger_R", "Skin", (0.425, 0.555, 0.035), (0.035, 0.055, 0.025), config),
    ]
    model.add("Fingers", *fingers)
    model.add("Legs",
              sphere_part("Leg_L", "Skin", (-0.105, 0.34, 0.0), (0.075, 0.19, 0.075), config),
              sphere_part("Leg_R", "Skin", (0.105, 0.34, 0.0), (0.075, 0.19, 0.075), config))
    model.add("Shoes",
              sphere_part("Shoe_L", "WarmWhite", (-0.115, 0.115, 0.075), (0.13, 0.09, 0.19), config),
              sphere_part("Shoe_R", "WarmWhite", (0.115, 0.115, 0.075), (0.13, 0.09, 0.19), config))
    model.add("Backpack",
              sphere_part("BackpackBody", "PrimaryBlue", (0, 0.80, -0.205), (0.225, 0.265, 0.105), config),
              *([] if lod == 2 else [
                  torus("BackpackTrim", "DeepNavy", (0, 0.80, -0.305), 0.16, 0.016,
                        config["torus_major"], config["torus_minor"], scale=(1.0, 1.2, 0.65))
              ]))
    return model


def build_gongsickyi(lod: int) -> CharacterModel:
    config = LOD_CONFIG[lod]
    model = CharacterModel("Gongsickyi", lod)
    model.add("Body", sphere_part("Body", "RewardYellow", (0, 0.56, 0.0), (0.43, 0.55, 0.39), config))
    eyes = []
    for x in (-0.105, 0.105):
        eyes.append(sphere_part("EyeWhite", "EyeWhite", (x, 0.69, 0.355), (0.105, 0.12, 0.045), config))
        eyes.append(sphere_part("Iris", "IrisBrown", (x, 0.69, 0.395), (0.050, 0.060, 0.018), config))
    model.add("Eyes", *eyes)
    brows = [] if lod == 2 else [
        sphere_part("Brow_L", "WarmBrown", (-0.11, 0.805, 0.395), (0.075, 0.014, 0.010), config, rotation=(0, 0, -0.15)),
        sphere_part("Brow_R", "WarmBrown", (0.11, 0.805, 0.395), (0.075, 0.014, 0.010), config, rotation=(0, 0, 0.15)),
    ]
    model.add("Eyebrows", *brows)
    model.add("Eyelids")
    model.add("MouthBeak", sphere_part("MouthBeak", "OrangeKeratin", (0, 0.56, 0.405), (0.115, 0.060, 0.075), config))
    cheeks = [] if lod == 2 else [
        sphere_part("Cheek_L", "Cheek", (-0.235, 0.57, 0.365), (0.065, 0.035, 0.012), config),
        sphere_part("Cheek_R", "Cheek", (0.235, 0.57, 0.365), (0.065, 0.035, 0.012), config),
    ]
    model.add("Cheeks", *cheeks)
    glasses = [
        torus("Glasses_L", "DeepNavy", (-0.105, 0.69, 0.408), 0.122, 0.014,
              config["torus_major"], config["torus_minor"], scale=(1.0, 1.0, 0.8)),
        torus("Glasses_R", "DeepNavy", (0.105, 0.69, 0.408), 0.122, 0.014,
              config["torus_major"], config["torus_minor"], scale=(1.0, 1.0, 0.8)),
        cylinder_between("GlassesBridge", "DeepNavy", (-0.01, 0.69, 0.41), (0.01, 0.69, 0.41), 0.012, config["cylinder"]),
    ]
    model.add("Glasses", *glasses)
    cap_parts = [
        cylinder_between("CapBase", "DeepNavy", (0, 1.015, 0), (0, 1.105, 0), 0.235, config["cylinder"]),
        box("Mortarboard", "DeepNavy", (0.54, 0.035, 0.44), (0, 1.12, 0.0), rotation=(0, 0.08, 0)),
        cylinder_between("Tassel", "Gold", (0.20, 1.12, 0.03), (0.27, 0.91, 0.08), 0.010, config["cylinder"]),
    ]
    model.add("GraduationCap", *cap_parts)
    model.add("Wings",
              sphere_part("Wing_L", "RewardYellow", (-0.395, 0.54, -0.005), (0.12, 0.20, 0.09), config, rotation=(0, 0, -0.40)),
              sphere_part("Wing_R", "RewardYellow", (0.395, 0.54, -0.005), (0.12, 0.20, 0.09), config, rotation=(0, 0, 0.40)))
    feet = [
        sphere_part("Foot_L", "WarmBrown", (-0.17, 0.075, 0.08), (0.17, 0.075, 0.15), config),
        sphere_part("Foot_R", "WarmBrown", (0.17, 0.075, 0.08), (0.17, 0.075, 0.15), config),
    ]
    model.add("Feet", *feet)
    pointer = [
        cylinder_between("PointerHandle", "WarmBrown", (-0.42, 0.44, 0.08), (-0.68, 0.77, 0.11), 0.018, config["cylinder"]),
        star_prism("PointerStar", "StarEmissive", (-0.72, 0.82, 0.12), 0.095, 0.035),
    ]
    model.add("StarPointer", *pointer)
    return model


def align4(data: bytearray) -> None:
    while len(data) % 4:
        data.append(0)


def write_glb(model: CharacterModel, path: Path) -> dict:
    material_names = sorted({primitive.material for primitive in model.primitives})
    material_index = {name: index for index, name in enumerate(material_names)}
    gltf = {
        "asset": {"version": "2.0", "generator": "MathChakChak deterministic Gate 2 builder v1.0"},
        "scene": 0,
        "scenes": [{"name": f"{model.character}_LOD{model.lod}", "nodes": [0]}],
        "nodes": [{
            "name": f"{model.character}_Root",
            "children": list(range(1, len(model.modules) + 1)),
            "extras": {"unit": "meter", "up_axis": "Y", "root_scale": 1.0},
        }],
        "meshes": [],
        "materials": [],
        "bufferViews": [],
        "accessors": [],
        "buffers": [],
        "extras": {
            "character": model.character,
            "lod": model.lod,
            "canonical_sha256": SOURCE_HASHES[model.character],
            "approval_mode": "PROJECT_OWNER_SINGLE_APPROVAL",
            "gate1_status": "VERIFIED",
        },
    }
    for name in material_names:
        color, roughness, metallic = MATERIALS[name]
        material = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": list(hex_rgba(color)),
                "metallicFactor": metallic,
                "roughnessFactor": roughness,
            },
        }
        if name == "StarEmissive":
            material["emissiveFactor"] = list(hex_rgba(color)[:3])
        gltf["materials"].append(material)

    binary = bytearray()

    def add_accessor(values: list, component_type: int, accessor_type: str, target: int, include_bounds=False) -> int:
        align4(binary)
        byte_offset = len(binary)
        if component_type == 5126:
            width = {"VEC2": 2, "VEC3": 3}[accessor_type]
            flat = [component for value in values for component in value]
            binary.extend(struct.pack("<" + "f" * len(flat), *flat))
            byte_length = len(flat) * 4
        elif component_type == 5123:
            binary.extend(struct.pack("<" + "H" * len(values), *values))
            byte_length = len(values) * 2
            width = 1
        else:
            binary.extend(struct.pack("<" + "I" * len(values), *values))
            byte_length = len(values) * 4
            width = 1
        view_index = len(gltf["bufferViews"])
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": byte_offset, "byteLength": byte_length, "target": target})
        accessor = {
            "bufferView": view_index,
            "byteOffset": 0,
            "componentType": component_type,
            "count": len(values),
            "type": accessor_type,
        }
        if include_bounds:
            accessor["min"] = [min(value[index] for value in values) for index in range(width)]
            accessor["max"] = [max(value[index] for value in values) for index in range(width)]
        accessor_index = len(gltf["accessors"])
        gltf["accessors"].append(accessor)
        return accessor_index

    triangle_count = 0
    vertex_count = 0
    for module_name, primitives in model.modules.items():
        mesh_primitives = []
        for primitive in primitives:
            position_accessor = add_accessor(primitive.positions, 5126, "VEC3", 34962, include_bounds=True)
            normal_accessor = add_accessor(primitive.normals, 5126, "VEC3", 34962)
            uv_accessor = add_accessor(primitive.uvs, 5126, "VEC2", 34962)
            index_type = 5123 if len(primitive.positions) <= 65535 else 5125
            index_accessor = add_accessor(primitive.indices, index_type, "SCALAR", 34963)
            mesh_primitives.append({
                "attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor, "TEXCOORD_0": uv_accessor},
                "indices": index_accessor,
                "material": material_index[primitive.material],
                "mode": 4,
                "extras": {"part_name": primitive.name},
            })
            triangle_count += len(primitive.indices) // 3
            vertex_count += len(primitive.positions)
        mesh_index = None
        if mesh_primitives:
            mesh_index = len(gltf["meshes"])
            gltf["meshes"].append({"name": module_name, "primitives": mesh_primitives})
        node = {"name": module_name}
        if mesh_index is not None:
            node["mesh"] = mesh_index
        if module_name in model.module_extras:
            node["extras"] = model.module_extras[module_name]
        gltf["nodes"].append(node)

    gltf["buffers"] = [{"byteLength": len(binary)}]
    json_bytes = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    align4(binary)
    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary)
    payload = bytearray(struct.pack("<4sII", b"glTF", 2, total_length))
    payload.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    payload.extend(json_bytes)
    payload.extend(struct.pack("<I4s", len(binary), b"BIN\x00"))
    payload.extend(binary)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "triangles": triangle_count,
        "vertices": vertex_count,
        "module_count": len(model.modules),
        "material_count": len(material_names),
    }


def render_model(model: CharacterModel, view: str, size=(640, 720)) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, "#F5F7FB")
    draw = ImageDraw.Draw(image)
    vertices = [position for primitive in model.primitives for position in primitive.positions]
    max_y = max(value[1] for value in vertices)
    def view_coordinates(point):
        x, _, z = point
        if view == "side":
            return -z, x
        if view == "three-quarter":
            angle = math.radians(38)
            return x * math.cos(angle) - z * math.sin(angle), x * math.sin(angle) + z * math.cos(angle)
        return x, z

    horizontal_values = [view_coordinates(value)[0] for value in vertices]
    horizontal_center = (min(horizontal_values) + max(horizontal_values)) / 2
    extent = max(max(horizontal_values) - min(horizontal_values), max_y) * 1.18
    scale = min(width, height) / extent
    center_x = width / 2
    ground_y = height * 0.91

    def project(point):
        x, y, z = point
        screen_x, depth = view_coordinates((x, y, z))
        return center_x + (screen_x - horizontal_center) * scale, ground_y - y * scale, depth

    triangles = []
    light = normalize((-0.35, 0.65, 0.7))
    for primitive in model.primitives:
        base = MATERIALS[primitive.material][0]
        rgb = tuple(int(base[index:index + 2], 16) for index in (1, 3, 5))
        for index in range(0, len(primitive.indices), 3):
            points_3d = [primitive.positions[primitive.indices[index + offset]] for offset in range(3)]
            projected = [project(point) for point in points_3d]
            normal = normalize(cross(sub(points_3d[1], points_3d[0]), sub(points_3d[2], points_3d[0])))
            shade = max(0.52, min(1.05, 0.72 + 0.33 * dot(normal, light)))
            color = tuple(max(0, min(255, round(channel * shade))) for channel in rgb)
            triangles.append((sum(point[2] for point in projected) / 3, projected, color))
    for _, points, color in sorted(triangles, key=lambda item: item[0]):
        draw.polygon([(point[0], point[1]) for point in points], fill=color)
    draw.line((width * 0.08, ground_y, width * 0.92, ground_y), fill="#CBD5E1", width=2)
    return image


def fit_reference(path: Path, size=(640, 720)) -> Image.Image:
    with Image.open(path) as source:
        source = source.convert("RGB")
        source.thumbnail((size[0] - 30, size[1] - 30), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", size, "white")
        canvas.paste(source, ((size[0] - source.width) // 2, (size[1] - source.height) // 2))
        return canvas


def label_cell(image: Image.Image, label: str) -> None:
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((12, 12, 12 + max(110, len(label) * 7), 38), radius=6, fill="#172033")
    draw.text((20, 20), label, fill="white", font=font)


def make_previews(models: dict[tuple[str, int], CharacterModel]) -> list[dict]:
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    records = []
    direction_map = {"front": "CV-FRONT.png", "side": "CV-SIDE-L.png", "three-quarter": "CV-FRONT-3Q-L.png"}
    for character in ("Chakchaki", "Gongsickyi"):
        comparison = Image.new("RGB", (640 * 3, 720 * 2), "#E2E8F0")
        for column, (view, filename) in enumerate(direction_map.items()):
            reference = fit_reference(REFERENCE_ROOT / character / filename)
            label_cell(reference, f"REFERENCE {view}")
            render = render_model(models[(character, 0)], view)
            label_cell(render, f"LOD0 {view}")
            comparison.paste(reference, (column * 640, 0))
            comparison.paste(render, (column * 640, 720))
        comparison_path = PREVIEW_ROOT / f"{character}_Canonical_vs_LOD0.png"
        comparison.save(comparison_path)
        records.append({
            "path": comparison_path.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(comparison_path.read_bytes()).hexdigest(),
            "type": "CANONICAL_VS_LOD0",
        })

        lod_sheet = Image.new("RGB", (640 * 3, 720 * 3), "#E2E8F0")
        for row, lod in enumerate((0, 1, 2)):
            for column, view in enumerate(direction_map):
                render = render_model(models[(character, lod)], view)
                label_cell(render, f"LOD{lod} {view}")
                lod_sheet.paste(render, (column * 640, row * 720))
        lod_path = PREVIEW_ROOT / f"{character}_LOD_Comparison.png"
        lod_sheet.save(lod_path)
        records.append({
            "path": lod_path.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(lod_path.read_bytes()).hexdigest(),
            "type": "LOD_COMPARISON",
        })
    return records


def main() -> int:
    models = {}
    files = []
    for character, builder in (("Chakchaki", build_chakchaki), ("Gongsickyi", build_gongsickyi)):
        for lod in (0, 1, 2):
            model = builder(lod)
            models[(character, lod)] = model
            filename = f"char_{character.lower()}_lod{lod}_v100.glb"
            files.append({"character": character, "lod": lod, **write_glb(model, OUTPUT_ROOT / filename)})
    previews = make_previews(models)
    ratios = {}
    for character in ("Chakchaki", "Gongsickyi"):
        counts = {item["lod"]: item["triangles"] for item in files if item["character"] == character}
        ratios[character] = {
            "lod1_to_lod0": round(counts[1] / counts[0], 6),
            "lod2_to_lod0": round(counts[2] / counts[0], 6),
        }
    manifest = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gate": 2,
        "status": "CANDIDATE_BUILT",
        "format": "glTF 2.0 binary GLB",
        "unit": "meter",
        "up_axis": "Y",
        "root_scale": 1.0,
        "source_candidate_hashes": SOURCE_HASHES,
        "files": files,
        "lod_ratios": ratios,
        "previews": previews,
        "material_strategy": "Embedded glTF PBR base-color materials; UV0 retained for later texture baking; no external texture dependency.",
        "known_constraints": [
            "CapBadge is a neutral replaceable placeholder pending EXT-01 IP approval.",
            "No Blender executable is available; GLB structure and topology are generated and audited directly.",
            "Human silhouette, proportion, color-drift and intersection review is still required.",
        ],
        "next_gate_allowed": False,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("GATE2_BASE_MESH_BUILT")
    for item in files:
        print(f"{item['character']} LOD{item['lod']} triangles={item['triangles']} vertices={item['vertices']} bytes={item['bytes']}")
    for character, values in ratios.items():
        print(f"{character} lod1_ratio={values['lod1_to_lod0']:.4f} lod2_ratio={values['lod2_to_lod0']:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
