# Gate 1 Canonical View Audit

- Gate 0 prerequisite: `VERIFIED`
- Automated QA: `PASS`
- Gate 1 status: `BLOCKED`
- External approval state: `0/10`
- Gate 2 entry: `PROHIBITED`

## Audited candidates

| Character | Candidate | SHA-256 | Resolution | Automated result |
|---|---|---|---:|---|
| Chakchaki | `evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png` | `916636d0cb1603ad0eed785cf9e827b693687fe437c1eb24014724a0f1b57480` | 4096×4096 | `PASS` |
| Gongsickyi | `evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png` | `9c8061afab5bc381edc02780c0ee9265489d977f3cecfc1e8e52ab6467b01157` | 4096×4096 | `PASS` |

## Automated evidence

- Both boards decode as 4×4 PNG contact sheets with all 16 required cells.
- Main-view maximum height deviations are 0.3358% and 0.1555%, below the ±3% threshold.
- Main-view baseline spreads are 2px and 1px, below the 30.72px board-cell limit.
- Left/right side and front-three-quarter pairs are measurably distinct from simple mirrors.
- All 32 individual direction files decode at 2048×2048.
- Both 2048×2048 overlay sheets and both 4096×2048 difference-annotation sheets decode successfully.

## Manual evidence still required

Pixel QA does not prove true orthographic camera equivalence, production-ready anatomy, accessory-side logic, or brand/product acceptability. Character Art Lead, 3D Technical Art Lead, UX Brand System Lead, QA Lead, and Product Owner must each approve both characters in the manual approval log.

## Decision

The automated package passes, but no accountable manual approval exists. Gate 1 therefore remains `BLOCKED`; the candidates are not canonical SSOT and Gate 2 must not start.

## Evidence index

- `docs/stage8/evidence/gate1/Gate1_Automated_QA_v5.2.0.json`
- `docs/stage8/audits/GATE1_AUTOMATED_QA.md`
- `docs/stage8/evidence/gate1/Gate1_Character_Consistency_Report_v5.2.0.md`
- `docs/stage8/evidence/gate1/Gate1_Change_Log_v5.2.0.md`
- `docs/stage8/evidence/gate1/SHA256SUMS.txt`
- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Canonical_View_Register_v5.2.0.xlsx`
- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/Gate1_Manual_Approval_Log_v5.2.0.xlsx`
