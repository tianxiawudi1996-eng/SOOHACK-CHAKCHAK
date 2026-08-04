#!/usr/bin/env python3
"""Freeze Gate 1 evidence and prepare blank packets for accountable human review."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE1 = ROOT / "docs/stage8/evidence/gate1"
MANUAL = GATE1 / "manual-review"
PACKETS = MANUAL / "packets"
REVIEW_PATH = GATE1 / "candidate-review.json"
QA_PATH = GATE1 / "Gate1_Automated_QA_v5.2.0.json"
CHECKSUMS_PATH = GATE1 / "SHA256SUMS.txt"
WORKBOOK_PREFLIGHT = MANUAL / "approval-workbook-preflight.json"
MANIFEST_PATH = MANUAL / "FROZEN_EVIDENCE_MANIFEST_v1.0.json"
INTAKE_PATH = MANUAL / "APPROVAL_INTAKE_TEMPLATE.json"
README_PATH = MANUAL / "README.md"
AUDIT_PATH = ROOT / "docs/stage8/audits/GATE1_MANUAL_REVIEW_PREFLIGHT.md"

ROLES = {
    "character_art_lead": {
        "name": "Character Art Lead",
        "criteria": [
            "얼굴, 체형, 의상, 고유 액세서리가 승인 원본의 정체성을 유지하는가?",
            "정면·측면·후면·3/4 방향 사이의 비례와 실루엣이 일관적인가?",
            "accessory-off 뷰가 캐릭터 고유 구조를 훼손하지 않는가?",
        ],
    },
    "3d_technical_art_lead": {
        "name": "3D Technical Art Lead",
        "criteria": [
            "모든 방향이 하나의 3D 체적과 위상 구조로 구현 가능한가?",
            "좌우·전후 방향의 부피, 접지선, 액세서리 연결 위치가 모순되지 않는가?",
            "Gate 2 Base Mesh 제작에 필요한 형태 정보가 충분한가?",
        ],
    },
    "ux_brand_system_lead": {
        "name": "UX Brand System Lead",
        "criteria": [
            "브랜드 색상과 캐릭터 고유 요소가 방향별로 유지되는가?",
            "32px, 64px, 128px 조건에서 핵심 실루엣과 식별 요소가 읽히는가?",
            "제품 UI에서 오해를 유발할 시각적 요소나 브랜드 이탈이 없는가?",
        ],
    },
    "qa_lead": {
        "name": "QA Lead",
        "criteria": [
            "16개 방향 ID와 파일 매핑이 완전하며 누락·중복이 없는가?",
            "후보·개별 뷰·오버레이·차이 주석의 해시와 자동 QA가 일치하는가?",
            "승인 판단을 재현할 증거가 충분하며 잔여 결함이 기록됐는가?",
        ],
    },
    "product_owner": {
        "name": "Product Owner",
        "criteria": [
            "캐릭터가 수학착착의 제품 목적과 아동 사용자 경험에 적합한가?",
            "다른 전문 역할의 판단과 잔여 위험이 수용 가능한가?",
            "Gate 2 진입으로 넘겨도 되는 범위와 보류해야 할 범위가 명확한가?",
        ],
    },
}
CHARACTERS = ("Chakchaki", "Gongsickyi")
KST = timezone(timedelta(hours=9))


def fail(message: str) -> None:
    print(f"MANUAL_REVIEW_PREP_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot load {path.relative_to(ROOT)}: {exc}")
    if not isinstance(value, dict):
        fail(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value.rstrip() + "\n", encoding="utf-8")


def load_checksums() -> list[dict]:
    entries: list[dict] = []
    for line_number, raw in enumerate(CHECKSUMS_PATH.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        parts = raw.split(maxsplit=1)
        if len(parts) != 2 or len(parts[0]) != 64:
            fail(f"invalid checksum line {line_number}")
        expected, relative = parts
        path = ROOT / relative
        if not path.is_file():
            fail(f"checksum target missing: {relative}")
        actual = sha256(path)
        if actual.lower() != expected.lower():
            fail(f"checksum mismatch: {relative}")
        policy = (
            "CONTROLLED_MUTABLE_APPROVAL_LEDGER"
            if relative.endswith("Gate1_Manual_Approval_Log_v5.2.0.xlsx")
            else "IMMUTABLE_REVIEW_EVIDENCE"
        )
        entries.append(
            {
                "path": relative.replace("\\", "/"),
                "sha256": actual,
                "size_bytes": path.stat().st_size,
                "freeze_policy": policy,
            }
        )
    if len(entries) != 40:
        fail(f"expected 40 checksum entries, found {len(entries)}")
    return entries


def evidence_for(character: str, entries: list[dict]) -> list[dict]:
    selected = [
        entry
        for entry in entries
        if character in entry["path"]
        and entry["freeze_policy"] == "IMMUTABLE_REVIEW_EVIDENCE"
    ]
    shared_paths = {
        "docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json",
        "docs/stage8/evidence/gate1/Gate1_Character_Consistency_Report_v5.2.0.md",
        "docs/stage8/evidence/gate1/SHA256SUMS.txt",
        "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx",
        "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx",
    }
    known = {entry["path"] for entry in selected}
    for path in sorted(shared_paths):
        if path in known:
            continue
        absolute = ROOT / path
        if absolute.is_file():
            selected.append(
                {
                    "path": path,
                    "sha256": sha256(absolute),
                    "size_bytes": absolute.stat().st_size,
                    "freeze_policy": (
                        "CONTROLLED_MUTABLE_APPROVAL_LEDGER"
                        if path.endswith("Gate1_Manual_Approval_Log_v5.2.0.xlsx")
                        else "REFERENCE_DOCUMENT"
                    ),
                }
            )
    return sorted(selected, key=lambda item: item["path"])


def packet_markdown(character: str, role: dict, candidate: dict, evidence: list[dict], package_id: str) -> str:
    evidence_lines = "\n".join(
        f"- `{item['path']}` — `{item['sha256']}` ({item['freeze_policy']})"
        for item in evidence
    )
    criteria_lines = "\n".join(f"- [ ] {criterion}" for criterion in role["criteria"])
    return f"""# Gate 1 Manual Review Packet — {character} / {role['name']}

## Package identity

- Package: `{package_id}`
- State: `FROZEN_PENDING_REVIEW`
- Candidate: `{candidate['path']}`
- Candidate SHA-256: `{candidate['sha256']}`
- Automated QA: `PASS`
- Gate 1: `BLOCKED`
- Gate 2 entry: `NOT_ALLOWED`

후보 SHA-256이 달라지면 이 캐릭터의 기존 승인 5개는 모두 무효다. AI는 reviewer, decision, reviewed_at을 작성할 수 없다.

## Evidence

{evidence_lines}

## {role['name']} checklist

{criteria_lines}

## Human decision record — intentionally blank

```text
Reviewer:
Decision: PENDING
Reviewed at:
Comment:
Patch ID:
```

허용 결정은 `APPROVE`, `APPROVE_WITH_PATCH`, `REJECT`다. `APPROVE_WITH_PATCH`는 patch_id, 책임자, 완료 기준, 재검증 결과가 모두 있어야 승인으로 집계한다. 실제 결정은 승인 대장과 검증된 JSON 승인 기록에만 반영한다.
"""


def main() -> int:
    review = load_json(REVIEW_PATH)
    qa = load_json(QA_PATH)
    workbook = load_json(WORKBOOK_PREFLIGHT)

    if qa.get("automated_status") != "PASS" or qa.get("status") != "BLOCKED_EXTERNAL":
        fail("automated QA must be PASS with BLOCKED_EXTERNAL status")
    if qa.get("manual_approval_count") != 0 or qa.get("manual_approval_required") != 10:
        fail("automated QA approval counts must be 0/10")
    if qa.get("next_gate_allowed") is not False:
        fail("automated QA must keep next_gate_allowed=false")
    if review.get("status") != "NOT_VERIFIED" or review.get("next_gate_allowed") is not False:
        fail("candidate review must remain NOT_VERIFIED with next gate blocked")
    if review.get("manual_approvals") != []:
        fail("candidate-review.json contains approvals; preparation requires an empty approval set")
    if workbook.get("status") != "PASS" or workbook.get("pending_rows") != 10:
        fail("approval workbook preflight must pass with 10 pending rows")
    if not all(workbook.get(key) is True for key in ("decisions_blank", "reviewers_blank", "reviewed_at_blank")):
        fail("approval workbook contains nonblank approval identity fields")

    candidates = {item.get("character"): item for item in review.get("candidates", [])}
    if set(candidates) != set(CHARACTERS):
        fail("candidate set must contain exactly Chakchaki and Gongsickyi")
    for character, candidate in candidates.items():
        path = ROOT / candidate["path"]
        if not path.is_file() or sha256(path).lower() != candidate.get("sha256", "").lower():
            fail(f"candidate hash mismatch: {character}")

    entries = load_checksums()
    generated_at = datetime.now(KST).isoformat(timespec="seconds")
    package_id = (
        "gate1-manual-review-"
        f"{candidates['Chakchaki']['sha256'][:8]}-{candidates['Gongsickyi']['sha256'][:8]}"
    )
    immutable_count = sum(item["freeze_policy"] == "IMMUTABLE_REVIEW_EVIDENCE" for item in entries)

    manifest = {
        "schema_version": "1.0.0",
        "package_id": package_id,
        "generated_at": generated_at,
        "gate": 1,
        "status": "FROZEN_PENDING_REVIEW",
        "automated_status": "PASS",
        "manual_review_status": "PENDING",
        "approval_required": 10,
        "approval_recorded": 0,
        "reject_count": 0,
        "unresolved_patch_count": 0,
        "next_gate_allowed": False,
        "candidate_hash_change_policy": "Invalidate all five approvals for the changed character and rebuild this package.",
        "candidates": [candidates[character] for character in CHARACTERS],
        "evidence_asset_count": len(entries),
        "immutable_evidence_count": immutable_count,
        "controlled_mutable_ledger_count": len(entries) - immutable_count,
        "evidence_assets": entries,
        "approval_workbook_preflight": str(WORKBOOK_PREFLIGHT.relative_to(ROOT)).replace("\\", "/"),
        "approval_workbook_baseline_sha256": workbook["workbook_sha256"],
    }
    write_json(MANIFEST_PATH, manifest)

    intake_rows = []
    for character in CHARACTERS:
        for slug, role in ROLES.items():
            intake_rows.append(
                {
                    "character": character,
                    "role": role["name"],
                    "role_slug": slug,
                    "reviewer": "",
                    "decision": "",
                    "reviewed_at": "",
                    "evidence_hash": candidates[character]["sha256"],
                    "comment": "",
                    "patch_id": None,
                    "unresolved_patch": False,
                    "status": "PENDING",
                }
            )
    write_json(
        INTAKE_PATH,
        {
            "schema_version": "1.0.0",
            "package_id": package_id,
            "status": "TEMPLATE_ONLY_NOT_AN_APPROVAL_RECORD",
            "generated_at": generated_at,
            "approval_required": 10,
            "approval_recorded": 0,
            "next_gate_allowed": False,
            "rows": intake_rows,
        },
    )

    for character in CHARACTERS:
        character_evidence = evidence_for(character, entries)
        for slug, role in ROLES.items():
            write_text(
                PACKETS / character / f"{slug}.md",
                packet_markdown(character, role, candidates[character], character_evidence, package_id),
            )

    write_text(
        README_PATH,
        f"""# Gate 1 Manual Review Package

## Current state

- Package: `{package_id}`
- Preparation result: `READY_FOR_HUMAN_REVIEW`
- Automated QA: `PASS`
- Actual approvals: `0/10`
- Gate 1: `BLOCKED`
- Gate 2: `NOT_STARTED`

## Package contents

- `FROZEN_EVIDENCE_MANIFEST_v1.0.json`: 40 checksum records. Of these, {immutable_count} inputs are immutable; the blank approval ledger is a controlled mutable record whose pre-review baseline hash is retained.
- `approval-workbook-preflight.json`: read-only verification of the 10 blank `PENDING` rows.
- `APPROVAL_INTAKE_TEMPLATE.json`: blank 5-role × 2-character intake template; it is not an approval record.
- `packets/`: ten role-specific human review packets.

## Workflow

1. Assign one accountable named reviewer to each required role.
2. Each role reviews both character packets against the frozen candidate hash.
3. Record decisions only from the real reviewer in `Gate1_Manual_Approval_Log_v5.2.0.xlsx` and the canonical JSON approval record.
4. On any candidate hash change, invalidate all five approvals for that character and rebuild/re-audit the package.
5. Do not promote Gate 1 until 10 valid approvals, zero rejects, zero unresolved patches, automated QA PASS, and zero hash drift are all proven.

AI preparation does not count as approval and must never populate reviewer identity, decision, or time fields.
""",
    )

    packet_count = len(list(PACKETS.glob("*/*.md")))
    write_text(
        AUDIT_PATH,
        f"""# Gate 1 Manual Review Preflight

## Outcome

`READY_FOR_HUMAN_REVIEW`. 자동 QA와 승인 대장 사전 검사는 통과했고, 해시 고정 검토 패킷을 준비했다. 이것은 승인이 아니므로 Gate 1은 계속 `BLOCKED`, Gate 2는 `NOT_STARTED`다.

## Goal framing

- 사용자: Character Art Lead, 3D Technical Art Lead, UX Brand System Lead, QA Lead, Product Owner
- 변화: 각 책임자가 동일한 후보 해시와 역할별 기준으로 두 캐릭터를 검토할 수 있다.

## Completion specification

- 자동 QA `PASS`: 충족
- SHA-256 목록 검증: 40/40 충족
- 불변 검토 입력: {immutable_count}개 고정
- 승인 대장 기준본: 1개 해시 기록, 10행 모두 `PENDING`
- 역할별 검토 패킷: {packet_count}/10
- 실제 승인: 0/10 — 미충족
- Gate 1 `VERIFIED`: 미충족

## Harness and controls

- 패키지 ID: `{package_id}`
- 후보 해시 변경 시 해당 캐릭터 승인 5개 전부 무효
- AI가 reviewer, decision, reviewed_at을 생성하는 행위 금지
- `APPROVE_WITH_PATCH`는 해결·재검증 전까지 승인으로 집계 금지
- 하나의 `REJECT` 또는 해시 드리프트가 있으면 Gate 1 승격 금지

## Loop and stop condition

검토 → 결정 기록 → 해시·필수필드·patch 상태 재검증을 반복한다. 10/10 유효 승인, reject 0, unresolved patch 0, hash drift 0일 때만 종료하고 Gate 1 승격 감사를 별도로 실행한다.

## Current blocker

실제 이름이 있는 다섯 역할이 두 캐릭터에 대해 내리는 책임 있는 결정 10개가 필요하다. 현재 자동화로 생성된 승인값은 없으며 Gate 2 진입은 허용되지 않는다.
""",
    )

    print("MANUAL_REVIEW_PREP_PASS")
    print(f"package_id={package_id}")
    print(f"checksums={len(entries)}/40")
    print(f"immutable_evidence={immutable_count}")
    print(f"packets={packet_count}/10")
    print("approvals=0/10")
    print("gate1=BLOCKED")
    print("gate2=NOT_STARTED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
