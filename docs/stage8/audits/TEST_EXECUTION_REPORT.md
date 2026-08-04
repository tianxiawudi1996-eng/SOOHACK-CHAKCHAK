# Test Execution Report

## Environment

- Workspace: `D:\project\SOOHACK CHACKCHACK`
- Executed: `2026-08-04T15:32:14+09:00` to `2026-08-05T08:28:59+09:00`
- Platform: Windows PowerShell / Python 3 / bundled Node.js

## Results

| Command | Exit | Result |
|---|---:|---|
| `python -m py_compile scripts/harness/audit_stage8.py scripts/harness/audit_gate1.py scripts/harness/build_gate1_evidence.py scripts/harness/prepare_gate1_manual_review.py scripts/harness/audit_gate1_approval_intake.py scripts/harness/audit_gate1_reviewer_assignment.py scripts/harness/audit_gate1_external_unblock.py scripts/harness/audit_gate1_single_approval.py scripts/harness/build_gate2_base_mesh.py scripts/harness/audit_gate2.py scripts/harness/validate_harness.py` | 0 | Eleven Python harness scripts compiled successfully. |
| `python scripts/harness/audit_stage8.py` | 0 | 204 files audited, Stage 7 exact originals 10/10, Gate 0 `VERIFIED`. |
| `python scripts/harness/audit_gate1.py` | 0 | Gate 1 `VERIFIED`: automated QA `PASS`, active approval mode `PROJECT_OWNER_SINGLE_APPROVAL`, approvals 1/1. |
| `python scripts/harness/audit_gate1_single_approval.py` | 0 | Single approval valid 1/1; candidate and immutable hash drift 0; promotion recorded. |
| `python scripts/harness/build_gate2_base_mesh.py` | 0 | Six GLB files and four comparison renders generated; LOD ratios within Stage 7 specification. |
| Rig-spec workbook inspection and render | 0 | Seven of seven sheets inspected and visually reviewed; formula error scan returned zero matches. |
| `python scripts/harness/audit_gate2.py` | 0 | Gate 2 `VERIFIED`: automated QA PASS, models 6/6 PASS, John KIM manual visual approval 1/1, failures and blockers 0. |
| `python scripts/harness/validate_harness.py` | 0 | `HARNESS_PASS`; Gate 0, Gate 1, and Gate 2 `VERIFIED`; Gate 3 entry allowed; manifest `VERIFIED`. |
| Artifact-tool approval workbook preflight | 0 | Read-only inspection passed: 10/10 rows `PENDING`; reviewer, decision, and reviewed_at blank; formula errors 0. |
| `python scripts/harness/prepare_gate1_manual_review.py` | 0 | 40/40 checksum records verified; 39 immutable inputs, one controlled ledger baseline, and 10/10 role packets prepared. |
| Gate 1 manual-review package validation | 0 | Frozen manifest, blank intake template, candidate hashes, packet matrix, and no-fabricated-approval controls passed. |
| Artifact-tool current approval snapshot | 0 | Read-only workbook inspection found 10 rows, 10 `PENDING`, 0 populated decisions, and 0 formula errors. |
| `python scripts/harness/audit_gate1_approval_intake.py` | 1 | Expected external-blocking exit: workbook decisions 0/10, JSON approvals 0/10, valid synchronized approvals 0/10, immutable hash drift 0. |
| `python scripts/harness/audit_gate1_reviewer_assignment.py` | 0 | `DISPATCH_CONFIRMED`: assignments 5/5, acknowledgments 5/5, packet mappings 10/10, dispatch records 5/5, user-confirmed dispatch true. |
| Reviewer dispatch confirmation (`2026-08-04T17:34:20+09:00`) | 0 | All five requests recorded as `SENT_CONFIRMED`; confirmation source is the user, approvals remain 0/10. |
| Reviewer assignment application (`2026-08-04T17:24:25+09:00`) | 0 | Five user-provided assignments and acknowledgments validated; no dispatch or approval created. |
| `python scripts/harness/audit_gate1_external_unblock.py` | 0 | `READY_FOR_ASSIGNMENT`: valid nominations 5/5, authority reference present, missing roles 0, no assignment/dispatch/approval applied. |
| Coordinator nomination validation (`2026-08-04T17:19:21+09:00`) | 0 | `READY_FOR_ASSIGNMENT`: valid nominations 5/5, authority reference present, missing roles 0, no assignment/dispatch/approval applied. |
| Artifact-tool formula scan | 0 errors | Both workbooks reported no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`. |
| Artifact-tool XLSX re-import | 0 | Register reopened with 4 sheets; approval log reopened with 3 sheets. |
| Spreadsheet render review | 7/7 | Every sheet rendered and was visually inspected. |
| Candidate and evidence image review | PASS | Both final boards, both overlays, and difference annotations were inspected. |
| `git push -u origin codex/stage8-harness-continuation` | 1 | GitHub returned 403; `visionlab-coder` has no write permission to the target repository. |
| Next-part metaprompt validation (`2026-08-04T15:48:13+09:00`) | `0 / 0 / 1 / 0 / 0` | py_compile PASS, Stage 8 audit PASS, Gate 1 audit expected BLOCKED_EXTERNAL exit 1, Harness PASS, diff check PASS. |
| Manual-review preflight validation (`2026-08-04T16:04:55+09:00`) | `0 / 1 / 0 / 0 / 0` | py_compile PASS, Gate 1 expected BLOCKED_EXTERNAL exit 1, package preparation PASS, Stage 8 audit PASS, Harness PASS. |
| Approval-intake validation (`2026-08-04T16:26:49+09:00`) | `0 / 1 / 1 / 0 / 0` | py_compile PASS; Gate 1 audit and approval-intake audit returned expected BLOCKED_EXTERNAL exit 1; Stage 8 audit and Harness PASS. |
| Reviewer-assignment validation (`2026-08-04T16:54:13+09:00`) | `0 / 1 / 1 / 1 / 0 / 0` | py_compile PASS; Gate 1, approval-intake, and reviewer-assignment audits returned expected BLOCKED_EXTERNAL exit 1; Stage 8 audit and Harness PASS. |
| External-unblock validation (`2026-08-04T17:01:37+09:00`) | `0 / 1 / 1 / 1 / 1 / 0 / 0` | py_compile PASS; four Gate 1 audits returned expected BLOCKED_EXTERNAL exit 1; Stage 8 audit and Harness PASS. |

## Quantitative Gate 1 result

| Character | Resolution | Max height deviation | Baseline spread | Directions | Automated result |
|---|---:|---:|---:|---:|---|
| Chakchaki | 4096×4096 | 0.3358% | 2px | 16/16 at 2048×2048 | `PASS` |
| Gongsickyi | 4096×4096 | 0.1555% | 1px | 16/16 at 2048×2048 | `PASS` |

## Current Gate result

`audit_gate1.py` and `audit_gate1_single_approval.py` now return exit 0. John KIM's package approval is valid 1/1, all automated checks pass, and Gate 1 is `VERIFIED`.

The 5-role and 10-decision rows above are retained historical test results. They are `SUPERSEDED_NON_GATING` and do not contribute to the active Gate 1 decision count.

Gate 2 has six real GLBs. Its automated audit passes, John KIM's Project Owner visual comparison approval is valid 1/1, and Gate 2 is `VERIFIED`. Gate 3 entry is allowed but rig/blendshape work remains `NOT_STARTED`.

## Not applicable

- No root `package.json`; npm lint/typecheck/build commands do not apply.
- Blender is not installed; GLB structure and topology are therefore generated and audited directly with a deterministic glTF 2.0 builder and parser.
