<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-08 Design System — tokens, fonts, sidebar shell, reusable primitives

- **Plan**: context/changes/design-system/plan.md
- **Scope**: Full plan — Phase 1 of 8 through Phase 8 of 8
- **Date**: 2026-08-20
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — LibraryCard's ReactNode subtitle has no test coverage

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: test/app/_components/library-card.spec.tsx
- **Detail**: `subtitle` was widened from `string` to `ReactNode` in Phase 7 so book author and status/requester text render as distinct DOM nodes. All 3 real consumers (`request-row.tsx`, `pending-return-row.tsx`, `borrowing-row.tsx`) pass a two-`<span>` fragment. The spec still only exercises string subtitles — the shape actually used in production is untested.
- **Fix**: Add a test rendering `subtitle` as a fragment with two child spans and assert both text nodes are present.
- **Decision**: PENDING

### F2 — Relative import instead of @/* alias

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: src/app/login/_components/login-form.tsx:4, src/app/register/_components/register-form.tsx:4
- **Detail**: Both import their actions module via `from "../actions"`, violating the documented @/* alias rule (lessons.md). Pre-existing debt, not introduced by this change — but both files were touched (converted to Field/Button) without cleaning it up.
- **Fix**: Change to `@/app/login/actions` / `@/app/register/actions`.
- **Decision**: PENDING

### F3 — Auth cross-links use plain <a> instead of Button/Link

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: login-form.tsx (Register link), register-form.tsx (Sign in link)
- **Detail**: Full page reload instead of client-side nav. Button now supports `href`, and the mockup styles these as inline text either way, so this is optional polish, not a defect.
- **Fix**: Optional — swap to next/link Link if client-side nav matters here; leave as-is otherwise.
- **Decision**: PENDING

### F4 — Phase 7 plan text inaccurately describes a heading style

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence (documentation only)
- **Location**: context/changes/design-system/plan.md, Phase 7 change 2
- **Detail**: Plan says pending-returns-list.tsx's heading "picks up font-display." design.html's actual `.section-heading` class is a styled `<div>` (14px/600/green-800), not an h1-h3, so the global font-display rule never applied to it in the source mockup. The implementation correctly followed the mockup's real CSS via the existing `Section` component instead of the plan's prose — the code is right, the plan text was the inaccurate part.
- **Fix**: Optional — leave the historical plan text as-is (phases are closed/committed) or amend for the record.
- **Decision**: PENDING
