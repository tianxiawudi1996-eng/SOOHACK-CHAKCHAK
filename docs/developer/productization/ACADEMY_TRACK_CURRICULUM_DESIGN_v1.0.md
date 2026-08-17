# Academy track curriculum design v1.0

## Goal

D80-04 connects the four evidence-gated academy tracks to an executable grade-specific learning route. Every E1–H3 grade has six formula packages in each track. A package links the existing five-phase character collaboration, formula recall, three application tasks, and spaced review.

## Access rule

A student requests a target track, but the service computes readiness from answer volume, accuracy, durable recall, application mastery, completion, and independent response. If the requested track gate is not met, the API returns the recommended evidence-safe track instead. Client input cannot override this decision.

## Content model

- `academy_track_curriculum`: 12 grades × 4 tracks = 48 versioned local plans.
- `academy_track_formula_assignment`: six grade formulas per plan = 288 assignments.
- Existing content reused: 72 formula explanations, 72 recall items, and 216 application items.
- Track-specific requirements vary in recall repetitions, application count, collaboration score, and concept/standard/advanced mix.

PostgreSQL constraints enforce a 100% problem mix, valid track and review states, unique active grade-track plans, unique assignment order, and bounded practice requirements. Foreign-key columns and the grade/track lookup path are indexed. External calls are not made inside transactions.

## Privacy and security

The curriculum response contains formula titles, notation, explanations, and route references only. Answer schemas, accepted values, raw student answers, and direct identity are excluded. Student ownership is checked in the repository and cross-student access returns 403.

## Truth boundary

The 48 plans are local synthetic product routes based on the existing catalog. They have not received the two-person math expert review or licensed-content approval required for a professional market claim. They may support local E2E validation but cannot establish Daechi-market acceptance or learning effect.
