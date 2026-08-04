#!/usr/bin/env python3
"""Read-only Stage 1-8 inventory and Gate 0 evidence generator.

The script never rewrites source assets. It writes only audit artifacts under
docs/stage8/audits, docs/stage8/evidence/gate0, and harness/ssot-manifest.json.
"""

from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
AUDIT_ROOT = ROOT / "docs" / "stage8" / "audits"
EVIDENCE_ROOT = ROOT / "docs" / "stage8" / "evidence" / "gate0"
SSOT_TARGET = ROOT / "ssot" / "stage7" / "v1.0"
GENERATED_OUTPUTS = {
    "docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.json",
    "docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.md",
    "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.json",
    "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.md",
    "docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md",
    "docs/stage8/evidence/gate0/gate0-decision.json",
    "harness/ssot-manifest.json",
}

REQUIRED = [
    "MathChakChak_Stage7_SSOT_v1.0.xlsx",
    "MathChakChak_Stage7_SSOT_v1.0.md",
    "Component_Inventory_v1.0.xlsx",
    "Gongsickyi_Character_Bible_v1.0.md",
    "Chakchaki_Character_Bible_v1.0.md",
    "Character_Module_Rig_Spec_v1.0.xlsx",
    "Expression_Motion_Bubble_Library_v1.0.xlsx",
    "Stage8_Handoff_Manifest_v1.0.md",
    "Chakchaki_Approved_Reference_v1.0.png",
    "Gongsickyi_Approved_Reference_v1.0.png",
]
SENSITIVE_NAMES = {"github-recovery-codes.txt", "id_rsa", "id_rsa.pem"}
ID_PATTERNS = {
    "SRC": re.compile(r"\bSRC-0[1-6]\b"),
    "Component": re.compile(r"\b(?:Component|COMP)-[A-Z0-9_-]+\b"),
    "Module": re.compile(r"\b(?:Module|MOD)-[A-Z0-9_-]+\b"),
    "State": re.compile(r"\b(?:State|STATE)-[A-Z0-9_-]+\b"),
    "Event": re.compile(r"\b(?:Event|EVT)-[A-Z0-9_-]+\b"),
    "Bubble": re.compile(r"\b(?:Bubble|BUB)-[A-Z0-9_-]+\b"),
    "Motion": re.compile(r"\b(?:Motion|MOT)-[A-Z0-9_-]+\b"),
    "Clip": re.compile(r"\b(?:Clip|CLIP)-[A-Z0-9_-]+\b"),
    "Character": re.compile(r"\b(?:Character|CHAR)-[A-Z0-9_-]+\b"),
    "Material": re.compile(r"\b(?:Material|MAT)-[A-Z0-9_-]+\b"),
    "Rig/Bone": re.compile(r"\b(?:Rig|Bone|BONE)-[A-Z0-9_-]+\b"),
    "Blendshape": re.compile(r"\b(?:Blendshape|BlendShape|BS)-[A-Z0-9_-]+\b"),
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_text(path: Path) -> tuple[str, str | None]:
    try:
        return path.read_text(encoding="utf-8"), None
    except UnicodeDecodeError as exc:
        return "", f"UTF-8 decode failed: {exc}"


def source_files() -> list[Path]:
    ignored = {".git", "node_modules", "dist", "build", "__pycache__"}
    result: list[Path] = []
    for path in ROOT.rglob("*"):
        relative = path.relative_to(ROOT)
        if not path.is_file() or any(part in ignored for part in relative.parts):
            continue
        if relative.as_posix() in GENERATED_OUTPUTS:
            continue
        result.append(path)
    return sorted(result, key=lambda item: rel(item).lower())


def git_tracked_paths() -> set[str]:
    if not (ROOT / ".git").exists():
        return set()
    proc = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, check=False, capture_output=True)
    if proc.returncode != 0:
        return set()
    return {
        item.decode("utf-8", errors="surrogateescape").replace("\\", "/")
        for item in proc.stdout.split(b"\0")
        if item
    }


def stage_for(path: Path, text: str = "") -> str:
    normalized = rel(path).lower()
    if "stage8" in normalized or "stage 8" in text.lower():
        return "Stage 8"
    if "stage7" in normalized or "stage 7" in text.lower() or "7단계" in text:
        return "Stage 7"
    for number in range(1, 7):
        if f"stage{number}" in normalized or f"stage {number}" in text.lower() or f"{number}단계" in text:
            return f"Stage {number}"
    if "developer" in normalized or "agent" in normalized:
        return "Stage 1-7 support"
    return "Unclassified"


def classification(path: Path, name: str) -> str:
    normalized = rel(path).lower()
    if name in REQUIRED and "ssot/stage7/v1.0" in normalized:
        return "target-candidate"
    if "approved" in name.lower() or "ssot" in normalized:
        return "approval-candidate"
    if "agent" in normalized or "developer" in normalized:
        return "derived-or-working"
    return "unclassified"


def audit_markdown(path: Path, text: str) -> dict:
    links = re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text)
    broken: list[str] = []
    for link in links:
        if re.match(r"^[a-z]+://", link, re.I) or link.startswith("#"):
            continue
        target = (path.parent / link.split("#", 1)[0]).resolve()
        if not target.exists():
            broken.append(link)
    return {
        "utf8": True,
        "h1_count": len(re.findall(r"^#\s+", text, re.M)),
        "version_tokens": sorted(set(re.findall(r"\bv?\d+\.\d+(?:\.\d+)?\b", text, re.I))),
        "status_tokens": sorted(set(re.findall(r"\b(?:NOT_STARTED|IN_PROGRESS|BLOCKED|NOT_VERIFIED|VERIFIED|PASS|FAIL|승인|조건부 PASS|미제작|미결정)\b", text, re.I))),
        "links": links,
        "broken_links": broken,
        "image_links": [link for link in links if re.search(r"\.(?:png|jpg|jpeg|webp|svg)$", link, re.I)],
    }


def xlsx_xml_audit(path: Path) -> dict:
    result = {"openable": False, "sheets": [], "formula_count": 0, "merged_cells": 0, "defined_names": 0, "data_validations": 0, "external_links": 0, "formula_errors": [], "ids": []}
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            if "xl/workbook.xml" not in names or "[Content_Types].xml" not in names:
                result["error"] = "missing required OOXML parts"
                return result
            result["openable"] = archive.testzip() is None
            workbook = ET.fromstring(archive.read("xl/workbook.xml"))
            ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            result["sheets"] = [
                {"name": node.attrib.get("name", ""), "state": node.attrib.get("state", "visible")}
                for node in workbook.findall("m:sheets/m:sheet", ns)
            ]
            result["defined_names"] = len(workbook.findall("m:definedNames/m:definedName", ns))
            result["external_links"] = len([name for name in names if name.startswith("xl/externalLinks/")])
            shared: list[str] = []
            if "xl/sharedStrings.xml" in names:
                shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
                shared = ["".join(node.itertext()) for node in shared_root.findall("m:si", ns)]
            for sheet_name in sorted(name for name in names if re.match(r"xl/worksheets/sheet\d+\.xml$", name)):
                root = ET.fromstring(archive.read(sheet_name))
                result["formula_count"] += len(root.findall(".//m:f", ns))
                result["merged_cells"] += len(root.findall(".//m:mergeCell", ns))
                result["data_validations"] += len(root.findall(".//m:dataValidation", ns))
                result["formula_errors"].extend(
                    node.text or "" for node in root.findall(".//m:f", ns) if "#REF!" in (node.text or "")
                )
                for cell in root.findall(".//m:c", ns):
                    value = cell.find("m:v", ns)
                    if value is None or value.text is None:
                        continue
                    result["ids"].extend(ID_PATTERNS["SRC"].findall(value.text))
                    if cell.attrib.get("t") == "s":
                        index = int(value.text)
                        if 0 <= index < len(shared):
                            result["ids"].extend(find_ids(shared[index]))
                    else:
                        result["ids"].extend(find_ids(value.text))
    except (OSError, zipfile.BadZipFile, ET.ParseError, ValueError) as exc:
        result["error"] = str(exc)
    return result


def find_ids(text: str) -> list[str]:
    found: list[str] = []
    for pattern in ID_PATTERNS.values():
        found.extend(pattern.findall(text))
    return found


def image_audit(path: Path) -> dict:
    result: dict = {"decodable": False}
    try:
        from PIL import Image  # type: ignore

        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            result.update({"decodable": True, "format": image.format, "width": image.width, "height": image.height, "mode": image.mode, "has_alpha": "A" in image.getbands()})
    except Exception as exc:  # Pillow is optional; inability is evidence, not a pass.
        result["error"] = str(exc)
    return result


def searchable_text(path: Path) -> str:
    if path.name in SENSITIVE_NAMES or "recovery-code" in path.name.lower():
        return ""
    if path.suffix.lower() in {".md", ".json", ".txt", ".py", ".js", ".ts", ".tsx", ".jsx", ".yml", ".yaml"}:
        return safe_text(path)[0]
    if path.suffix.lower() != ".xlsx":
        return ""
    values: list[str] = []
    try:
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if name == "xl/sharedStrings.xml" or re.match(r"xl/worksheets/sheet\d+\.xml$", name):
                    root = ET.fromstring(archive.read(name))
                    values.extend(text for text in root.itertext() if text)
    except (OSError, zipfile.BadZipFile, ET.ParseError):
        return ""
    return "\n".join(values)


def inventory() -> tuple[list[dict], dict[str, list[dict]], dict[str, list[str]]]:
    rows: list[dict] = []
    by_name: dict[str, list[dict]] = defaultdict(list)
    id_locations: dict[str, list[str]] = defaultdict(list)
    for path in source_files():
        name = path.name
        if name in SENSITIVE_NAMES or "recovery-code" in name.lower():
            row = {"path": rel(path), "file_name": name, "security": "SENSITIVE_FILENAME_CONTENT_NOT_READ", "stage": stage_for(path)}
            rows.append(row)
            by_name[name].append(row)
            continue
        text = ""
        md_audit = None
        if path.suffix.lower() in {".md", ".json", ".txt", ".py", ".js", ".ts", ".tsx", ".jsx", ".yml", ".yaml"}:
            text, decode_error = safe_text(path)
            if decode_error:
                text = ""
        elif path.suffix.lower() == ".xlsx":
            text = searchable_text(path)
        row = {
            "stage": stage_for(path, text),
            "file_name": name,
            "path": rel(path),
            "size_bytes": path.stat().st_size,
            "modified_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
            "mime": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            "sha256": sha256(path),
            "version": (re.search(r"v\d+\.\d+(?:\.\d+)?", name, re.I) or re.search(r"v\d+\.\d+(?:\.\d+)?", text, re.I) or [None])[0],
            "approval_status_tokens": sorted(set(re.findall(r"\b(?:APPROVED|APPROVE|VERIFIED|PASS|FAIL|조건부 PASS|승인|후보|미제작|미결정)\b", text, re.I))),
            "classification": classification(path, name),
            "references": [],
            "duplicate_group": None,
            "usable_now": path.suffix.lower() in {".md", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".json"},
            "basis": "metadata plus read-only content/OOXML inspection",
        }
        if path.suffix.lower() == ".md":
            md_audit = audit_markdown(path, text)
            row["markdown_audit"] = md_audit
            row["references"] = md_audit["links"]
        if path.suffix.lower() == ".xlsx":
            row["xlsx_audit"] = xlsx_xml_audit(path)
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            row["image_audit"] = image_audit(path)
        ids = find_ids(text)
        for identifier in ids:
            id_locations[identifier].append(rel(path))
        rows.append(row)
        by_name[name].append(row)
    hashes = Counter(row.get("sha256") for row in rows if row.get("sha256"))
    for row in rows:
        if row.get("sha256") and hashes[row["sha256"]] > 1:
            row["duplicate_group"] = row["sha256"][:12]
    return rows, by_name, id_locations


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    rows, by_name, id_locations = inventory()
    missing = [name for name in REQUIRED if not by_name.get(name)]
    candidates = {}
    for name in REQUIRED:
        base = Path(name).stem
        candidates[name] = [
            row["path"] for row in rows
            if row.get("file_name") != name
            and re.fullmatch(re.escape(base) + r"(?:\(\d+\))?", Path(row.get("file_name", "")).stem, re.I)
        ]
    sensitive = [row["path"] for row in rows if row.get("security")]
    tracked = git_tracked_paths()
    sensitive_tracked_or_canonical = [
        path for path in sensitive
        if path in tracked or path.startswith("ssot/stage7/v1.0/")
    ]
    audit_status = "BLOCKED" if missing or sensitive_tracked_or_canonical else "NOT_VERIFIED"
    target_rows = [row for row in rows if row.get("path", "").startswith("ssot/stage7/v1.0/")]
    required_records = []
    for name in REQUIRED:
        found = by_name.get(name, [])
        hashes = {item.get("sha256") for item in found if item.get("sha256")}
        record_status = (
            "FOUND_EXACT" if len(found) == 1 else
            "FOUND_EXACT_DUPLICATES_IDENTICAL" if len(found) > 1 and len(hashes) == 1 else
            "CONFLICT_MULTIPLE_EXACT" if len(found) > 1 else
            "MISSING_EXACT"
        )
        required_records.append({
            "file_name": name,
            "exact_matches": found,
            "exact_match_count": len(found),
            "candidate_paths": candidates.get(name, []),
            "status": record_status,
        })
    id_counts = {identifier: len(paths) for identifier, paths in sorted(id_locations.items())}
    progress_evidence: list[str] = []
    welcome_evidence: list[str] = []
    for path in source_files():
        relative = rel(path)
        if not relative.startswith(("docs/agent/", "docs/developer/", "docs/ssot/", "ssot/")):
            continue
        text = searchable_text(path)
        for line in text.splitlines():
            if re.search(r"\bProgress\b", line, re.I) and re.search(r"\bHappy\b", line, re.I):
                progress_evidence.append(relative)
            if re.search(r"\bWelcome\b", line, re.I) and re.search(r"\bGreet\b", line, re.I):
                welcome_evidence.append(relative)
    semantics = {
        "progress_bubble_type_happy_state": bool(progress_evidence),
        "progress_evidence": sorted(set(progress_evidence)),
        "welcome_greet_connection": bool(welcome_evidence),
        "welcome_evidence": sorted(set(welcome_evidence)),
        "note": "Presence is evidenced by source lines containing both mapped terms; approval still requires all canonical originals and human review.",
    }
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace_root": str(ROOT),
        "file_count": len(rows),
        "required_stage7_file_count": len(REQUIRED),
        "required_exact_found": sum(record["status"].startswith("FOUND_EXACT") for record in required_records),
        "required_exact_missing_or_conflicting": sum(not record["status"].startswith("FOUND_EXACT") for record in required_records),
        "sensitive_filename_count": len(sensitive),
        "sensitive_tracked_or_canonical_count": len(sensitive_tracked_or_canonical),
        "git_metadata_present": (ROOT / ".git").exists(),
        "3d_files": [row["path"] for row in rows if Path(row["file_name"]).suffix.lower() in {".glb", ".gltf", ".blend", ".fbx"}],
        "required_records": required_records,
        "ssot_target_rows": target_rows,
        "semantic_presence": semantics,
        "id_counts": id_counts,
        "id_locations": id_locations,
        "notes": [
            "Exact filenames are not inferred from suffix candidates.",
            "Sensitive filename content was not read or copied.",
            "No source asset is rewritten by this audit.",
        ],
    }
    write_json(AUDIT_ROOT / "STAGE1_TO_STAGE8_INVENTORY.json", {"summary": summary, "files": rows})
    write_json(AUDIT_ROOT / "ID_CROSS_REFERENCE_AUDIT.json", {"generated_at": summary["generated_at"], "id_counts": id_counts, "id_locations": id_locations, "semantic_presence": semantics, "status": audit_status})
    write_json(ROOT / "harness" / "ssot-manifest.json", {"generated_at": summary["generated_at"], "target_root": rel(SSOT_TARGET) if SSOT_TARGET.exists() else "ssot/stage7/v1.0", "required_files": required_records, "sensitive_paths": sensitive, "sensitive_tracked_or_canonical_paths": sensitive_tracked_or_canonical, "source_rows": [{"path": row.get("path"), "sha256": row.get("sha256"), "size_bytes": row.get("size_bytes")} for row in rows if row.get("sha256")], "status": audit_status})

    md_lines = [
        "# Stage 1~8 파일 인벤토리",
        "",
        f"- 생성 시각(UTC): `{summary['generated_at']}`",
        f"- 조사 파일 수: `{len(rows)}`",
        f"- Stage 7 지정 원본 정확 일치: `{summary['required_exact_found']}/{len(REQUIRED)}`",
        f"- Git 메타데이터: `{'FOUND' if summary['git_metadata_present'] else 'MISSING'}`",
        f"- 판정: `{audit_status}` — 정확한 승인 원본 누락/미입고 여부와 canonical SSOT 보안 상태를 기준으로 판단한다.",
        "",
        "## Stage 7 지정 원본",
        "",
        "| 파일 | 정확 일치 | 후보/대체 파일 | 판정 |",
        "|---|---:|---|---|",
    ]
    for record in required_records:
        md_lines.append(f"| `{record['file_name']}` | {record['exact_match_count']} | {', '.join('`' + p + '`' for p in record['candidate_paths']) or '없음'} | `{record['status']}` |")
    md_lines += ["", "## 전체 파일 상세", "", "| Stage | 파일 | 경로 | 크기 | 수정일(UTC) | MIME | SHA-256 | 분류 | 사용 가능 |", "|---|---|---|---:|---|---|---|---|---|"]
    for row in rows:
        if row.get("security"):
            md_lines.append(f"| `{row.get('stage','')}` | `{row['file_name']}` | `{row['path']}` | 비공개 | 비공개 | 비공개 | 기록 안 함 | `SENSITIVE_FILENAME_CONTENT_NOT_READ` | `NO` |")
        else:
            md_lines.append(f"| `{row.get('stage','')}` | `{row['file_name']}` | `{row['path']}` | {row.get('size_bytes')} | `{row.get('modified_at')}` | `{row.get('mime')}` | `{row.get('sha256')}` | `{row.get('classification')}` | `{row.get('usable_now')}` |")
    md_lines += ["", "## 조사 규칙", "", "- 파일명만으로 Stage를 단정하지 않고 경로·본문·버전·참조를 함께 기록했다.", "- 동명 후보는 해시가 같아도 정확한 승인 원본으로 승격하지 않았다.", "- `github-recovery-codes.txt`는 민감정보 가능성 때문에 내용을 읽거나 해시를 기록하지 않았다.", "- 3D 파일이 없으면 3D 검증은 통과가 아니라 `검증 불가/미입고`로 남긴다.", ""]
    (AUDIT_ROOT / "STAGE1_TO_STAGE8_INVENTORY.md").parent.mkdir(parents=True, exist_ok=True)
    (AUDIT_ROOT / "STAGE1_TO_STAGE8_INVENTORY.md").write_text("\n".join(md_lines), encoding="utf-8")

    cross_lines = [
        "# ID 교차참조 감사",
        "",
        f"- 생성 시각(UTC): `{summary['generated_at']}`",
        f"- 판정: `{audit_status}` — 승인 원본 입고·정의 충돌·자동검증 전제 확인이 필요하다.",
        "",
        "## ID 사용 현황",
        "",
        "| ID | 발견 횟수 | 참조 파일 수 | 파일 예시 |",
        "|---|---:|---:|---|",
    ]
    for identifier, count in sorted(id_counts.items()):
        locations = id_locations[identifier]
        cross_lines.append(f"| `{identifier}` | {count} | {len(set(locations))} | {', '.join('`' + item + '`' for item in sorted(set(locations))[:4])} |")
    cross_lines += ["", "## 필수 의미 연결", "", f"- `Progress = Bubble Type / Happy State`: **동일 원문 행에서 두 용어 발견 = {semantics['progress_bubble_type_happy_state']}**. 근거: {', '.join('`' + item + '`' for item in semantics['progress_evidence']) or '없음'}", f"- `Welcome State = Greet Clip`: **동일 원문 행에서 두 용어 발견 = {semantics['welcome_greet_connection']}**. 근거: {', '.join('`' + item + '`' for item in semantics['welcome_evidence']) or '없음'}", "", "## 제한", "", "- 현재 로컬에는 지정된 Stage 7 원본 전체가 없으므로 정의/사용/충돌을 확정할 수 없다.", "- 파일명 후보를 ID 정의로 승격하지 않았다.", "- 의미 연결 토큰 발견은 승인 완료가 아니며 원본 10종과 수동 검토가 필요하다.", ""]
    (AUDIT_ROOT / "ID_CROSS_REFERENCE_AUDIT.md").write_text("\n".join(cross_lines), encoding="utf-8")

    report_lines = [
        "# Gate 0 SSOT 감사 보고서",
        "",
        f"- 감사 시각(UTC): `{summary['generated_at']}`",
        f"- Gate 0 상태: `{audit_status}`",
        "- 다음 Gate: 실행 금지 (`Gate 1`은 `NOT_STARTED` 유지)",
        "",
        "## 확인 결과",
        "",
        f"- Stage 7 지정 원본 정확 일치: `{summary['required_exact_found']}/{len(REQUIRED)}`",
        f"- Stage 7 SSOT 대상 경로 존재: `{'YES' if SSOT_TARGET.exists() else 'NO'}`",
        f"- Git 메타데이터: `{'FOUND' if summary['git_metadata_present'] else 'MISSING'}`",
        f"- 3D 자산: `{len(summary['3d_files'])}개`",
        "- XLSX·Markdown·이미지 읽기 전용 감사: 인벤토리 산출물에 파일별 결과 기록",
        "- ID·의미 연결: 인벤토리 및 교차참조 보고서에 실제 발견 범위 기록",
        "",
        "## 차단사항",
        "",
    ]
    if missing:
        report_lines.append("- 정확한 Stage 7 승인 원본이 누락됨: " + ", ".join(f"`{name}`" for name in missing))
    if sensitive_tracked_or_canonical:
        report_lines.append("- 민감정보로 보이는 파일이 Git 추적 또는 canonical SSOT에 존재함: " + ", ".join(f"`{path}`" for path in sensitive_tracked_or_canonical))
    elif sensitive:
        report_lines.append("- 민감정보로 보이는 로컬 파일은 내용 미열람 상태이며 `.gitignore`로 제외되어 Gate 차단 대신 보안 경고로 기록함: " + ", ".join(f"`{path}`" for path in sensitive))
    if not (ROOT / ".git").exists():
        report_lines.append("- 로컬 `.git`이 없어 HEAD·브랜치·미커밋 기준선을 기록할 수 없음")
    if not summary["3d_files"]:
        report_lines.append("- GLB/GLTF/BLEND/FBX가 없어 Gate 2~4 실제 자산 검증 불가")
    report_lines += ["", "## 증거 경로", "", "- `docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.md`", "- `docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.json`", "- `docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.md`", "- `docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.json`", "- `harness/ssot-manifest.json`", "", "## 판정 근거", "", "필수 원본·형상관리·자동검증 전제가 충족되지 않았으므로 실제 증거 없이 `VERIFIED`로 변경하지 않는다. 누락된 파일을 재생성하거나 후보 파일을 승인 원본으로 이름 변경하지 않는다.", ""]
    (AUDIT_ROOT / "GATE0_SSOT_AUDIT_REPORT.md").write_text("\n".join(report_lines), encoding="utf-8")

    EVIDENCE_ROOT.mkdir(parents=True, exist_ok=True)
    (EVIDENCE_ROOT / "gate0-decision.json").write_text(json.dumps({"status": audit_status, "generated_at": summary["generated_at"], "missing_exact_files": missing, "sensitive_paths": sensitive, "sensitive_tracked_or_canonical_paths": sensitive_tracked_or_canonical, "evidence": ["docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md", "docs/stage8/audits/STAGE1_TO_STAGE8_INVENTORY.json", "docs/stage8/audits/ID_CROSS_REFERENCE_AUDIT.json"]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("AUDIT_WRITTEN")
    print(f"files={len(rows)}")
    print(f"required_exact={summary['required_exact_found']}/{len(REQUIRED)}")
    print(f"missing_exact={len(missing)}")
    print(f"sensitive_paths={len(sensitive)}")
    print(f"gate0={audit_status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
