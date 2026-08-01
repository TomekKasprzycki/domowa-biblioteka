<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-05 Loan Lifecycle

- **Plan**: `context/changes/loan-lifecycle/plan.md`
- **Mode**: Deep
- **Date**: 2026-08-01
- **Verdict**: REVISE → **SOUND** after triage (all 5 findings fixed)
- **Findings**: 2 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict | After fixes |
|-----------|---------|-------------|
| End-State Alignment | PASS | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | PASS | PASS |
| Blind Spots | FAIL | PASS |
| Plan Completeness | FAIL | PASS |

Both FAILs were narrow and mechanical rather than architectural — the phase structure, sequencing, and state-machine design verified clean on first pass, which is why the overall verdict was REVISE rather than RETHINK.

## Grounding

18/18 paths ✓ (read directly), 6/6 symbols ✓, brief↔plan ✓, `docs/reference/contract-surfaces.md` absent (check skipped). `npx tsc --noEmit` verified to exit 0 today, confirming that verification command is real.

## Findings

### F1 — Delete guard misses the FK error path entirely

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Phase 5, change 4 — Delete guard
- **Detail**: The plan guarded deletion only when an *open* loan exists. But `loans.bookId` is `ON DELETE NO ACTION` (`src/migrations/1784749796897-CreateLoanTable.ts:8`), so ANY loan row blocks deletion at the DB level — including terminal `declined` and `returned` rows. That error is caught nowhere: `isDuplicateError` only matches `23505` (`src/lib/db-error.utils.ts:5`) and `deleteBookAction` has no `try/catch` (`collection/actions.ts:138-141`), so it surfaces as a 500. Pre-existing S-04 behaviour, but Phase 5 owns deletion and the open-loan-only guard made it *look* solved.
- **Fix A ⭐ Recommended**: Guard on any loan row + add `isForeignKeyViolation` backstop
  - Strength: Mirrors the pre-check + catch pairing in `requestBorrowAction` (`borrow/actions.ts:56-74`); structurally safe against races.
  - Tradeoff: A book with only closed loans becomes permanently undeletable.
  - Confidence: HIGH — FK behaviour verified in the migration; error-code gap verified in `db-error.utils.ts`.
  - Blind spot: Whether "undeletable after any loan" is acceptable UX hasn't been tested with the user.
- **Fix B**: Keep open-loan guard + `ON DELETE CASCADE` for closed loans
  - Strength: Owner keeps full control of their shelf.
  - Tradeoff: Silently destroys the borrower's "Past loans" history that Phase 3 builds — a direct conflict.
  - Confidence: MEDIUM — mechanically sound but conflicts with a feature in the same plan.
  - Blind spot: Cascade would also fire for open loans if the guard were ever bypassed.
- **Decision**: FIXED via Fix A — Phase 5 change 4 rewritten with a two-layer guard (any-loan pre-check with distinct on-loan vs history messages, plus `isForeignKeyViolation` catching `23503`); change 5 gained four delete-case specs and `db-error.utils.spec.ts` coverage; manual criteria and Progress 5.7–5.10 updated. Accepted consequence recorded in the brief.

### F2 — Phase 2 Manual bullet has no Progress entry

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Success Criteria ↔ `## Progress`
- **Detail**: Phase 2 carried a `#### Manual Verification:` heading with one bullet, but Progress for Phase 2 had only an `#### Automated` subsection. Every Success Criteria bullet must have a matching numbered checkbox. Phases 1, 3, 4, 5 all mapped correctly.
- **Fix**: Delete the heading and bullet from Phase 2; fold the "no manual step" note into the Implementation Note.
- **Decision**: FIXED

### F3 — Unresolved decision left in Phase 1

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 6
- **Detail**: The plan said `findOpenLoansForBooks` "must include the `requester` relation … verify it does, or add a relation-loading variant" — an open question handed to the implementer, when the answer was already knowable (`findActiveLoansForBooks` loads no relations, `loan.repository.ts:36-41`). It mattered beyond tidiness: S-04 recorded that the owner sees the borrower's name but other browsing friends see a generic "On loan" (`borrow-request/plan-brief.md:27`), and `/discover` + `/collection` share this reader.
- **Fix**: Split the readers — keep `findOpenLoansForBooks` relation-free for `/discover`; add `findOpenLoansForOwner(ownerId)` with the `requester` relation for `/collection`.
  - Strength: Enforces the S-04 privacy boundary structurally, not by implementer discipline; also drops the id-array round trip on `/collection`.
  - Tradeoff: One more repository function.
  - Confidence: HIGH — both call sites and current relation loading verified directly.
  - Blind spot: None significant.
- **Decision**: FIXED — Phase 1 change 6 now specifies both readers with the rationale; Phase 5 change 2 updated to call `findOpenLoansForOwner`.

### F4 — Rename blast radius on specs is under-specified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 4
- **Detail**: "Update the two call sites … plus their specs" undercounted. Three spec files reference the old names by string: `test/server/loan/loan.repository.spec.ts:4,5,118,123,208,230,238,243`, `test/app/borrow/actions.spec.ts:9,217`, and `test/app/discover/page.spec.tsx:13,29,38`. The last is the trap — the name is a key inside a `jest.mock` factory, so a stale key yields `undefined` at call time rather than a clean import error.
- **Fix**: Enumerate the three spec files by path, flagging the `jest.mock` factory case.
- **Decision**: FIXED

### F5 — migration:revert leaves the DB reverted

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Success Criteria, item 1.2
- **Detail**: `npm run migration:revert` as a standalone criterion drops the new index and leaves the database on the old one, so every subsequent criterion in the phase runs without the invariant under test.
- **Fix**: Restate as `npm run migration:revert && npm run migration:run`.
- **Decision**: FIXED
