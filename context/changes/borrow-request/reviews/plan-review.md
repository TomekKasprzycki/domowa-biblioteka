<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Borrow Request (S-04)

- **Plan**: context/changes/borrow-request/plan.md
- **Mode**: Deep
- **Date**: 2026-07-22
- **Verdict**: REVISE → SOUND (all findings fixed in triage)
- **Findings**: 1 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | FAIL → fixed (F1) |
| Blind Spots | WARNING → fixed (F3) |
| Plan Completeness | WARNING → fixed (F2, F4) |

## Grounding

10/10 paths ✓, symbols ✓ (`findBookById` correctly flagged as new), Progress↔Phase mapping ✓, brief↔plan ✓. No `docs/reference/contract-surfaces.md` (skipped).

## Findings

### F1 — Plan ignores the existing migration framework for the partial index

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Current State Analysis; Phase 1 change #5; Migration Notes
- **Detail**: The plan claimed "No migration framework — synchronize only" and prescribed a hand-applied `src/server/loan/loan.sql`. False: the repo has `src/migrations/`, `src/lib/data-source-cli.ts`, `package.json` `migration:*` scripts, and `1784146760613-CreateFriendConnectionTable.ts` — a direct precedent creating a table + FKs + an expression unique index via `queryRunner.query`. That precedent is why the friend-connection `23505` constraint test passes against Neon today. Hand-applied SQL gives the North Star's core invariant no reproducible application path.
- **Fix**: Replace change #5 with a `CreateLoanTable` migration mirroring the precedent (table + FKs + `CREATE UNIQUE INDEX ... WHERE status='active'` in `up()`, drop in `down()`); apply via `npm run migration:run`; correct Current State, Critical Implementation Details, Migration Notes, "What We're NOT Doing", and Manual 1.4.
- **Decision**: FIXED (Fix in plan) — edited all six locations.

### F2 — Required `availability` field will break discover-search.spec, not listed

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 change #4 (test contract)
- **Detail**: Phase 3 makes `availability` a required `DiscoverBook` field but listed updating only discover-book-row.spec and page.spec; `discover-search.spec.tsx` also builds `DiscoverBook[]` literals (lines ~19-35) and will fail `tsc` (3.1). Same fixture-break class `lessons.md` records from S-03.
- **Fix**: Add `discover-search.spec.tsx` to Phase 3 change #4's file list + contract (add `availability` to its fixtures).
- **Decision**: FIXED (Fix in plan).

### F3 — Borrower gets no signal a request was declined

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 (findOutgoingLoans); Phase 4 /borrowing
- **Detail**: `findOutgoingLoans` returned only requested + active, so a declined request vanished from `/borrowing` with no trace — with no notifications the borrower couldn't tell "declined" from "never sent."
- **Fix**: Include `declined` rows in `findOutgoingLoans` and render a "Declined" label on `/borrowing`; assert it in the borrowing page spec and repository spec.
- **Decision**: FIXED (Show declined on /borrowing) — updated Phase 1 contract, Phase 1 test contract, Phase 4 page + spec.

### F4 — Actions module location left as a hedge that the test mocks contradict

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change #1
- **Detail**: Phase 2 hedged "src/app/borrow/actions.ts (or src/app/discover/actions.ts …)" while Phases 3–4 test contracts hard-code `jest.mock("@/app/borrow/actions")`.
- **Fix**: Commit to `src/app/borrow/actions.ts`; drop the parenthetical and the "(mirroring…)" note on the test file.
- **Decision**: FIXED (Fix in plan).
