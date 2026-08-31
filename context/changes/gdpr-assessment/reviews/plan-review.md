<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-10 Privacy Notice & Account Deletion (RODO)

- **Plan**: `context/changes/gdpr-assessment/plan.md`
- **Mode**: Deep
- **Date**: 2026-08-22
- **Verdict**: REVISE → SOUND (all findings fixed)
- **Findings**: 3 critical, 3 warnings, 2 observations — all 8 fixed

## Verdicts

| Dimension | Verdict (at review) |
|-----------|---------------------|
| End-State Alignment | PASS |
| Lean Execution | WARNING |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

8/8 existing paths ✓, 3/3 new paths correctly absent ✓, 6/6 symbols ✓, brief↔plan ✓

## Findings

### F1 — `npm run typecheck` does not exist

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Desired End State; Phases 1/2/3 Success Criteria; Progress 1.3, 2.3, 3.4
- **Detail**: `package.json` has no `typecheck` script. This plan was the only one in `context/changes/*/plan.md` referencing it; the established convention is `npm test` (17×), `npm run lint` (17×), `npm run build` (7×), where `next build` performs type checking.
- **Fix**: Replaced all seven occurrences with `npm run build`.
- **Decision**: FIXED

### F2 — The transaction cannot work as specified; repository functions can't join it

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 changes 4 & 5; Critical Implementation Details
- **Detail**: Every repository function calls `getDataSource().getRepository(...)` itself and none accepts an `EntityManager`; there is zero precedent in `src/` for passing one. As written, `hasOpenLoanForUser` (placed in `loan.repository.ts`) would read outside the transaction, and reusing `deleteBook()`/`deleteConnection()` inside the callback would run those deletes on a different pooled connection — silently defeating atomicity.
- **Fix A ⭐ Recommended**: Specify all deletes inline in the orchestrator via the transaction's own manager.
  - Strength: Zero blast radius on existing call sites; the orchestrator is the only transactional consumer.
  - Tradeoff: Slight duplication of query logic.
  - Confidence: HIGH — verified no existing caller needs transactional variants.
  - Blind spot: None significant.
- **Fix B**: Add an optional `manager?: EntityManager` parameter to the repository functions the cascade needs.
  - Strength: Reusable for future transactional features.
  - Tradeoff: Touches shared functions used across three flows for one caller; new codebase-wide convention.
  - Confidence: MEDIUM.
  - Blind spot: Whether other planned slices would use it.
- **Decision**: FIXED via Fix A — added a "do not reuse existing repository functions" rule to Critical Implementation Details and relocated the active-loan predicate into the orchestrator as a manager-bound private helper.

### F3 — Phase 1's automated criteria can't pass in the order given

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Success Criteria (1.1 automated vs 1.5 manual)
- **Detail**: `synchronize` is gated on `NODE_ENV === "development"` (`src/lib/data-source.ts:17`) and Jest runs with `NODE_ENV=test`; the runtime data source registers no `migrations:` key. The new table is therefore not created for tests, so the integration test fails until the migration runs — which was listed after the automated block and named no command. Tests also need the local Postgres container (`npm run db:start`, port 54729), and `data-source-cli.ts:9` uses `DATABASE_URL_UNPOOLED` while tests use `DATABASE_URL`.
- **Fix**: Added an explicit prerequisite block before Phase 1's automated criteria naming `npm run db:start` → `npm run migration:generate` → `npm run migration:run` → `npm test`, plus the two-connection-string caveat.
- **Decision**: FIXED

### F4 — A deleted user's JWT stays valid in other tabs and devices

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 — deleteAccountAction
- **Detail**: JWT-strategy sessions with no DB session table; `authorized` only checks `!!session?.user`. `signOut()` clears the acting browser's cookie only, so another tab keeps passing middleware after the user row is gone — reads render empty, writes 500 on FK violation.
- **Fix A ⭐ Recommended**: Document as an accepted limitation.
  - Strength: Free and honest; bounded failure mode — queries are userId-scoped, so no cross-user exposure.
  - Tradeoff: A stale tab shows a confusing empty app until the JWT expires.
  - Confidence: HIGH.
  - Blind spot: JWT max-age isn't explicitly configured (Auth.js default, 30 days).
- **Fix B**: Add a user-exists check in the `(app)` layout.
  - Strength: Bounces stale sessions immediately.
  - Tradeoff: A DB round-trip on every authenticated page render for a rare event.
  - Confidence: MEDIUM.
  - Blind spot: Layout vs middleware placement.
- **Decision**: FIXED via Fix A — added to "What We're NOT Doing" and to the brief's Open Risks.

### F5 — No error path for a concurrent write; "closes the race" claim is inaccurate

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details step 2; `deleteAccount` contract
- **Detail**: Under READ COMMITTED the in-transaction re-check cannot see a loan inserted after its SELECT. The real protection is the `ON DELETE NO ACTION` FK forcing a rollback — safe, but the `"blocked" | "deleted"` contract had no state for it, so the user would get a 500.
- **Fix A ⭐ Recommended**: Correct the rationale and add a third result state mapping the FK violation to a friendly retry message.
  - Strength: Preserves the friendly-message guarantee; mirrors `approveLoan` → `"already-borrowed"` via `isDuplicateError`.
  - Tradeoff: Needs an FK-violation predicate and a third action branch.
  - Confidence: HIGH.
  - Blind spot: The exact Postgres error code path isn't exercised by an existing test.
- **Fix B**: Correct the wording only; accept the rare 500.
- **Decision**: FIXED via Fix A — contract widened to `"blocked" | "conflict" | "deleted"`, rationale corrected in the plan and the brief.

### F6 — Null-equality could bypass the type-to-confirm check

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 change 1 — confirmEmail validation
- **Detail**: `session.user.email` is typed `string | null | undefined` (`src/auth.config.ts:3-7`) and `formData.get()` returns `null` when absent — a bare `===` evaluates `null === null` as a match and would delete the account with nothing typed.
- **Fix**: Specify Zod non-empty-string parsing for the field plus an explicit non-empty guard on the session email before comparing; added a test case for a missing `confirmEmail` field.
- **Decision**: FIXED

### F7 — The `bookId` predicate is redundant today

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 1 change 4 — active-loan predicate
- **Detail**: `loan.ownerId` is written once from `book.userId` (`src/app/borrow/actions.ts:88-92`, sole caller of `createLoanRequest`) and no ownership-transfer path exists — `updateBook` cannot write `userId` (`src/server/book/book.repository.ts:50-60`). The third clause can never match a row `ownerId = U` misses.
- **Fix**: Kept as a deliberate backstop with a documented invariant note, so a future ownership-transfer feature cannot silently orphan loans.
- **Decision**: FIXED

### F8 — `/privacy` strands a signed-in user with no navigation

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 change 2
- **Detail**: The page sits outside the `(app)` route group and the root layout (`src/app/layout.tsx`) renders no nav chrome, so the sidebar's Privacy link leads to a dead end.
- **Fix**: Added a "← Back" link to the privacy page spec.
- **Decision**: FIXED

## Verified clean

- **Blast radius is effectively zero**: no test asserts `NAV_ROUTES` contents (only individual links by name), `publicPaths`, the `entities:` array, or imports `Home`.
- **`session.user.email` is populated at runtime**: Auth.js fills `name`/`email` into the session before the custom `session` callback runs; proven in-repo at `src/app/page.tsx:17`.
