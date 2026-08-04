# Test Execution Report

## Environment

- Workspace: `D:\project\SOOHACK CHACKCHACK`
- Executed: `2026-08-04T15:32:14+09:00` to `2026-08-04T15:32:30+09:00`
- Platform: Windows PowerShell / Python 3 / bundled Node.js

## Results

| Command | Exit | Result |
|---|---:|---|
| `python -m py_compile scripts/harness/audit_stage8.py scripts/harness/audit_gate1.py scripts/harness/build_gate1_evidence.py scripts/harness/validate_harness.py` | 0 | Four harness scripts compiled successfully. |
| `python scripts/harness/audit_stage8.py` | 0 | 139 files audited, Stage 7 exact originals 10/10, Gate 0 `VERIFIED`. |
| `python scripts/harness/audit_gate1.py` | 1 | Expected gate-blocking exit: automated QA `PASS`, Gate status `BLOCKED_EXTERNAL`, manual approvals 0/10. |
| `python scripts/harness/validate_harness.py` | 0 | `HARNESS_PASS`; Gate 0 `VERIFIED`, Gate 1 `BLOCKED`, manifest `VERIFIED`. |
| Artifact-tool formula scan | 0 errors | Both workbooks reported no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`. |
| Artifact-tool XLSX re-import | 0 | Register reopened with 4 sheets; approval log reopened with 3 sheets. |
| Spreadsheet render review | 7/7 | Every sheet rendered and was visually inspected. |
| Candidate and evidence image review | PASS | Both final boards, both overlays, and difference annotations were inspected. |

## Quantitative Gate 1 result

| Character | Resolution | Max height deviation | Baseline spread | Directions | Automated result |
|---|---:|---:|---:|---:|---|
| Chakchaki | 4096×4096 | 0.3358% | 2px | 16/16 at 2048×2048 | `PASS` |
| Gongsickyi | 4096×4096 | 0.1555% | 1px | 16/16 at 2048×2048 | `PASS` |

## Expected non-zero result

`audit_gate1.py` intentionally returns exit 1 until Gate 1 is genuinely `VERIFIED`. The only current failure is the missing 10 accountable human approvals. This is a gate-control success, not an automated image-QA failure.

## Not applicable

- No root `package.json`; npm lint/typecheck/build commands do not apply.
- No GLB/GLTF/BLEND/FBX asset; Gate 2 mesh validation does not apply and must not start.
