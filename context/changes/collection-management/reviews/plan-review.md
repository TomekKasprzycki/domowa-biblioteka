<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Collection Management (S-01) Implementation Plan

- **Plan**: context/changes/collection-management/plan.md
- **Mode**: Deep
- **Date**: 2026-07-14
- **Verdict**: REVISE (fixes applied during triage — see decisions below)
- **Findings**: 1 critical, 2 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | PASS |

## Grounding

8/8 paths ✓ (user.entity.ts, user.repository.ts, data-source.ts, auth.config.ts, middleware.ts, register/actions.ts, page.tsx, nav.tsx), 3/3 symbols ✓ (`getRepository<Entity>("tablename")` pattern, `entities: [UserEntity]` array, `QueryFailedError` code `23505` handling), brief↔plan ✓. Progress↔Phase mechanical check: PASS (one `## Progress` heading, every phase/success-criteria bullet mapped 1:1).

## Findings

### F1 — TypeORM entities crossing the Server→Client boundary

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 #1 (collection page) and #3 (book-list.tsx)
- **Detail**: `page.tsx` passed `BookEntity[]` (real TypeORM class instances) straight into the Client Component `book-list.tsx`. Next.js RSC throws at runtime since class instances can't cross the Server→Client boundary as props — this would only surface in the browser during manual verification, not via tsc/lint.
- **Fix**: Map repository results to plain objects in Phase 3 #1 before passing down; changed `book-list.tsx`'s Props contract to a plain shape instead of `BookEntity[]`.
- **Decision**: FIXED (applied to plan.md)

### F2 — bookId unvalidated before reaching TypeORM

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 #1 — updateBookAction / deleteBookAction
- **Detail**: `bookId` was read from a hidden form field with no format validation before being passed to `updateBook`/`deleteBook`. Server Actions are directly reachable POST endpoints; a non-UUID value would hit the `uuid` column and raise an unhandled `QueryFailedError`, surfacing as a generic 500 instead of the intended not-found/not-owned message.
- **Fix**: Added `bookId: z.string().uuid()` validation, mapped to the existing not-found/not-owned message on failure.
- **Decision**: FIXED (applied to plan.md)

### F3 — Notes can be set but never cleared via edit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: End-State Alignment
- **Location**: Phase 1 #4 (updateBook signature) vs. Phase 2 #1 (validation)
- **Detail**: `updateBook`'s signature supports clearing notes via `null`, but the validation contract treated an empty `notes` field as "absent" for both add and update, so a cleared textarea would silently leave the old value in place on edit.
- **Fix (as decided by user)**: Edit is a full-form resubmission (every field pre-filled, not a partial patch), so an empty `notes` field there unambiguously means "clear" — mapped to explicit `null` in `updateBookAction` only. Add keeps treating empty as "don't set" (nothing to clear on create).
- **Decision**: FIXED (applied to plan.md, fixed differently per user's PUT-semantics reasoning)
