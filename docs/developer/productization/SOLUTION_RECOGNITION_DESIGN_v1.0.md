# Solution recognition confidence gate v1.0

## Purpose

D80-03 provides a safe foundation for handwritten, camera, and manually entered mathematics. It does not claim that an OCR provider is connected. Manual text can be submitted now; image sources fail closed to manual entry until an approved provider and benchmark evidence exist.

## Data flow

`Browser -> authenticated student endpoint -> server-controlled source policy -> recognition domain -> repository transaction -> PostgreSQL hashes/decision -> privacy-minimized response`

- The browser cannot assert that an OCR provider is verified.
- Client-supplied confidence values are not trusted.
- Raw images and recognized expressions are not persisted.
- Candidate expressions are normalized and represented by SHA-256 only.
- No recognition decision permits automatic scoring.

## Decision policy

| Decision | Condition | Next action |
|---|---|---|
| `STUDENT_CONFIRMATION_REQUIRED` | Valid manual expression or sufficiently reliable approved recognition | Student confirms before any scoring |
| `TEACHER_REVIEW_REQUIRED` | Mathematical consistency or step continuity is below threshold | Create review queue item |
| `MANUAL_ENTRY_REQUIRED` | Provider unavailable, no candidate, low image quality, or low OCR confidence | Open manual entry |
| `REJECTED` | Candidate contains unsupported or unsafe syntax | Request new input |

## PostgreSQL transaction

One transaction creates `solution_capture`, `solution_recognition_evaluation`, idempotency evidence, and a metadata-only audit event. A trigger creates `solution_review_queue` only for teacher-review decisions. Foreign keys, checks, a partial pending-queue index, and a JSONB hash index support integrity and operations without storing raw student work.

## Current boundary

The local API implements manual entry and image-source fallback. Actual handwriting/photo OCR, image storage, provider verification, grade-by-grade accuracy benchmarking, and production approval remain external work. Therefore D80-03 is a local platform pass, not a production completion claim.
