<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-05 Loan Lifecycle

- **Plan**: `context/changes/loan-lifecycle/plan.md`
- **Scope**: All 5 phases
- **Date**: 2026-08-01
- **Verdict**: REJECTED → **APPROVED** after triage (all 4 findings resolved)
- **Findings**: 1 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict | After fixes |
|-----------|---------|-------------|
| Plan Adherence | PASS | PASS |
| Scope Discipline | WARNING | PASS |
| Safety & Quality | FAIL | PASS |
| Architecture | PASS | PASS |
| Pattern Consistency | WARNING | PASS |
| Success Criteria | PASS | PASS |

Automated criteria re-run at review time: `npx tsc --noEmit` clean, `npm run lint` clean, 231/231 tests passing, no pending migrations.

Plan Adherence passed with four deviations, each surfaced to the user when made: `borrowing.types.ts` pulled forward from Phase 3 to Phase 1 (tsc could not pass otherwise); dedicated return-failure messages instead of reusing `LOAN_NOT_FOUND_MESSAGE`; `HAS_HISTORY_MESSAGE` reworded to cover pending requests as well as history; the inline `Book` type moved to `collection.types.ts` under the plan's "only if free" clause.

## Findings

### F1 — Delete guard leaks other users' book existence

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/collection/actions.ts:156-160
- **Detail**: The loan pre-check ran before any ownership check, and `countLoansForBook(bookId)` is not scoped to the session user. Submitting another user's bookId distinguished "currently on loan" / "has borrow requests or borrowing history" / "Book not found" — only the last is correct for a book you don't own. A regression introduced in Phase 5: previously `deleteBook({id, userId})` made all three cases indistinguishable. Contradicts the PRD guardrail against URL guessing and the codebase's deliberate `LOAN_NOT_FOUND_MESSAGE` design. Exploitability is near zero (v4 UUIDs are not enumerable); rated CRITICAL for the defect class — resource lookup before authorization — and because it regressed an explicit guardrail.
- **Fix**: Establish ownership before the loan pre-check via `findBookById` scoped to `session.user.id`, returning `NOT_FOUND_MESSAGE` otherwise.
  - Strength: Restores the pre-Phase-5 property that a non-owner learns nothing; FK backstop untouched.
  - Tradeoff: One additional query on the delete path.
  - Confidence: HIGH — `updateBook` already demonstrates the `{id, userId}` scoping idiom.
  - Blind spot: The existing "different user deletes the book" spec passed only because its fixture book had no loans, so this path was never exercised.
- **Decision**: FIXED — ownership check added ahead of the loan pre-check, plus a regression spec ("tells a non-owner only not-found, even when the book is on loan") that fails against the old ordering.

### F2 — Independent queries run sequentially, unlike nav

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/collection/page.tsx:12,15 · src/app/requests/page.tsx:17,25
- **Detail**: Both pages awaited two independent queries in sequence, paying the sum of two Neon round trips per page load, while `nav.tsx` — written in the same change — runs its two independent counts with `Promise.all`. Same problem, two different answers, with the sequential form on the slower path.
- **Fix**: Wrap each pair in `Promise.all`, matching `nav.tsx`.
- **Decision**: FIXED

### F3 — PendingReturn ships an email the UI never renders

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/requests/requests.types.ts:14
- **Detail**: `PendingReturn` carried `requester.email` into the client payload while `pending-return-row.tsx` renders only the name. Shape copied from `IncomingRequest`, which carries the same unused field from S-04.
- **Fix**: Drop `email` from `PendingReturn`; leave `IncomingRequest` to a separate cleanup.
- **Decision**: FIXED — type narrowed to `{ name: string }`, page mapping and both component spec fixtures updated. `IncomingRequest` remains outstanding debt.

### F4 — Plan contradicted its own scope guardrail

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: plan.md — "What We're NOT Doing" vs Phase 5 changes 1 and 5
- **Detail**: The guardrail excluded the inline `Book` type and missing collection component specs as S-01 debt; Phase 5 then specified creating `collection.types.ts` and adding book-row/page specs. Neither `/10x-plan` nor `/10x-plan-review` caught the contradiction, because the overlap was worded differently in each section.
- **Fix**: Record as a recurring rule; amend the plan's exclusion list to match what shipped.
- **Decision**: FIXED + ACCEPTED-AS-RULE: "Plan scope guardrails must be cross-checked against phase bodies" — appended to `context/foundation/lessons.md`; plan.md's exclusion list rewritten to scope the debt to untouched files.

## Outstanding (not findings)

- `roadmap.md` still lists S-04 as `proposed` and S-05 as `blocked`; both have shipped.
- `IncomingRequest.requester.email` (S-04) is unused by its row component — same shape as F3.
- Collection debt in files this plan did not touch: `add-book-form.tsx` specs and remaining relative imports.
