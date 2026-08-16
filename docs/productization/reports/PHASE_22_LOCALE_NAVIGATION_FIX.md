# Phase 22 follow-up — locale continuity fix

## Goal

Preserve the learner's selected locale when moving from the landing page to the diagnostic, lesson, and curriculum screens while keeping session and handoff tokens memory-only.

## Root cause

The landing locale normalizer called `toLowerCase()` on an empty saved preference. That stopped the landing script before it could apply translations or persist a selection. The downstream screens also did not read the saved preference.

## Change

- Added `client/i18n/preferred-locale.mjs` as the isolated preference adapter.
- Made all four client surfaces null-safe and consistent with the locale order: URL → saved preference → browser language → English.
- Persisted explicit locale changes from diagnostic, lesson, and curriculum screens.
- Added the preference adapter to the staging artifact build.
- Extended the locale fallback regression test to cover all four surfaces.

## Verification

- `npm.cmd run test:unit` — 51/51 PASS
- `npm.cmd run test:productization:features` — PASS, 15/15 features
- `npm.cmd run test:productization:accessibility-interaction` — PASS, 4/4 surfaces, 12/12 contrast pairs
- `npm.cmd run test:integration:diagnostic-curriculum` — PASS
- Browser Smoke Test — Italian landing selection remained Italian on the diagnostic screen.
- `npm.cmd run build:staging` — PASS, 33 files generated.

## Remaining gates

- Phase 22 product-owner keyboard and screen-reader approval remains pending (0/1).
- Seven non-Korean linguistic reviews remain pending (0/7).
- Staging readiness evidence must be rerun against the new 33-file artifact before it can be marked current.
