# Test Execution Report

## Environment

- Workspace: `D:\project\SOOHACK CHACKCHACK`
- Executed: `2026-08-04T15:32:14+09:00` to `2026-08-04T17:56:39+09:00`
- Platform: Windows PowerShell / Python 3 / bundled Node.js

## Results

| Command | Exit | Result |
|---|---:|---|
| `python -m py_compile scripts/harness/audit_stage8.py scripts/harness/audit_gate1.py scripts/harness/build_gate1_evidence.py scripts/harness/prepare_gate1_manual_review.py scripts/harness/audit_gate1_approval_intake.py scripts/harness/audit_gate1_reviewer_assignment.py scripts/harness/audit_gate1_external_unblock.py scripts/harness/audit_gate1_single_approval.py scripts/harness/validate_harness.py` | 0 | Nine harness scripts compiled successfully. |
| `python scripts/harness/audit_stage8.py` | 0 | 184 files audited, Stage 7 exact originals 10/10, Gate 0 `VERIFIED`. |
| `python scripts/harness/audit_gate1.py` | 1 | Expected gate-blocking exit: automated QA `PASS`, active approval mode `PROJECT_OWNER_SINGLE_APPROVAL`, approvals 0/1. |
| `python scripts/harness/audit_gate1_single_approval.py` | 1 | Expected external-blocking exit: active single approval 0/1, candidate and immutable hash drift 0. |
| `python scripts/harness/validate_harness.py` | 0 | `HARNESS_PASS`; Gate 0 `VERIFIED`, Gate 1 `BLOCKED`, manifest `VERIFIED`. |
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

## Expected non-zero result

`audit_gate1.py` intentionally returns exit 1 until Gate 1 is genuinely `VERIFIED`. The only current failure is the missing single authorized Project Owner package decision. This is a gate-control success, not an automated image-QA failure.

The 5-role and 10-decision rows above are retained historical test results. They are `SUPERSEDED_NON_GATING` and do not contribute to the active Gate 1 decision count.

## Not applicable

- No root `package.json`; npm lint/typecheck/build commands do not apply.
- No GLB/GLTF/BLEND/FBX asset; Gate 2 mesh validation does not apply and must not start.
