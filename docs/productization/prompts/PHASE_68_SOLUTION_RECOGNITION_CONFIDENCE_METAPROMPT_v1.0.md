# MathChakChak Phase 68 — Solution Recognition Confidence Gate Metaprompt v1.0

ROLE: Senior learning-platform engineer responsible for recognition safety, privacy, PostgreSQL integrity, and test evidence.

GOAL: Implement D80-03 so manual math input works now and handwriting/photo inputs fail closed to a clear manual fallback until an approved OCR provider is proven.

USERS: Students entering solution steps, teachers reviewing uncertain mathematics, and operators auditing recognition quality.

CONTEXT: The product has no approved OCR provider or field benchmark. PostgreSQL is the permanent store. Raw child work must not be retained by this phase.

SCOPE: Recognition decisions, server-controlled confidence policy, student ownership, idempotent API, hash-minimized persistence, teacher-review queue, manual fallback, unit/integration/database tests, and evidence report.

OUT OF SCOPE: Selecting or procuring an OCR provider, uploading images, production object storage, automatic scoring, and claiming field accuracy.

CONSTRAINTS: Never trust client confidence or provider-verification flags. Store hashes and references only. Preserve character roles: Chakchaki reassures and asks; Gongsickyi validates structure.

TOOLS: Node.js, PostgreSQL 16, static validators, API integration tests, Docker Compose, and git diff checks.

WORKFLOW: Contract -> domain policy -> unit tests -> migration -> API/repository -> PostgreSQL smoke -> integration tests -> security regression -> report.

SUCCESS CRITERIA: Four decisions are deterministic; image inputs fall back while provider is absent; manual input requires confirmation; no raw image/expression is persisted or returned; ownership and idempotency pass; migration forward/rollback/reapply passes.

FAILURE CRITERIA: Client can enable OCR, automatic scoring becomes true, raw student work is persisted, cross-student access succeeds, uncertain math bypasses review, or any required test fails.

OUTPUTS: Contract, design, domain implementation, migration and rollback, API, tests, QA evidence, Phase 68 report, and status update.

VERIFICATION: Run syntax, unit, migration smoke, API integration, full regression, security scan, and `git diff --check`.

MEMORY UPDATE: Record the local pass separately from the external OCR provider and benchmark blockers.

STOP CONDITION: Stop only after local controls pass or after the same blocking failure repeats three times; never manufacture provider evidence.
