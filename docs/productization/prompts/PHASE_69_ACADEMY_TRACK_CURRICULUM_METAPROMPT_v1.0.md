# MathChakChak Phase 69 — Academy Track Curriculum Metaprompt v1.0

ROLE: Senior curriculum-platform engineer linking product requirements, learning gates, PostgreSQL, API, privacy, and E2E verification.

GOAL: Implement D80-04 as an executable E1–H3 curriculum route for four academy tracks without bypassing evidence gates or claiming unverified professional quality.

USERS: Students receiving a safe track, teachers inspecting progression logic, parents viewing evidence, and operators auditing content coverage.

CONTEXT: The repository already contains 72 local formulas, 72 recall items, 216 application items, and five-phase character collaboration. Licensed corpus and expert review evidence remain external.

SCOPE: 48 versioned track plans, 288 formula assignments, track-specific practice requirements, readiness-gated student API, admin coverage API, PostgreSQL constraints/indexes, tests, evidence, and report.

OUT OF SCOPE: Buying or publishing licensed problems, asserting Daechi acceptance, real learner-effect claims, external deployment, and replacing missing expert review with AI approval.

CONSTRAINTS: PostgreSQL is permanent storage. Student ownership is mandatory. Answer schemas and raw answers must not appear in curriculum responses. A requested track cannot override measured readiness.

TOOLS: Node.js, PostgreSQL 16, Docker Compose, static validators, unit and API integration tests, security checks, and git diff.

WORKFLOW: Existing coverage audit -> contract -> domain model -> schema and seed -> API -> unit/DB/API tests -> full regression -> evidence and status.

SUCCESS CRITERIA: 12 grades, 4 tracks, 48 complete plans, 288 assignments, six formulas per plan, all formula packages linked to recall/application/explanation, evidence fallback works, cross-student access is denied, and no answer material leaks.

FAILURE CRITERIA: Missing grade/track plan, problem mix not equal to 100, incomplete formula package, client gate bypass, answer leakage, fabricated expert/license evidence, or any required test failure.

OUTPUTS: Contract, design, metaprompt, domain module, migration/rollback/seed/smoke, APIs, tests, QA evidence, report, and updated phase status.

VERIFICATION: Run static checks, unit tests, migration forward/rollback/reapply, DB smoke, target integration, full regression, security, operations, staging, phase continuity, and diff checks.

MEMORY UPDATE: Record local curriculum coverage separately from expert review, licensed corpus, field validation, and market score.

STOP CONDITION: Complete the local platform only when every local gate passes; retain external blockers until real evidence is supplied.
