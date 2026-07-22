<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Borrow Request (S-04)

- **Plan**: context/changes/borrow-request/plan.md
- **Scope**: Full plan — Phases 1-4 of 4
- **Date**: 2026-07-22
- **Verdict**: NEEDS ATTENTION → all 10 findings FIXED during triage
- **Findings**: 0 critical, 7 warnings, 3 observations

Success criteria re-run at review time: `npx tsc --noEmit` exit 0 · `npm run lint` clean · `npm test` 23 suites / 142 tests passed. All 4 phases MATCH the plan; every "What We're NOT Doing" guardrail held.

**Post-triage**: all 10 findings fixed. Re-verified `npx tsc --noEmit` exit 0 · `npm run lint` clean · `npm test` **25 suites / 155 tests passed**. Two new migrations applied to Neon (`AddLoanLookupIndexes`, `AddLoanPendingRequestUniqueIndex`); `loans` now carries 4 indexes. Post-triage dimension verdicts: Safety & Quality PASS, Pattern Consistency PASS → **overall APPROVED**.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING → PASS (post-triage) |
| Architecture | PASS |
| Pattern Consistency | WARNING → PASS (post-triage) |
| Success Criteria | PASS |

## Findings

### F1 — Borrower's full user row (incl. passwordHash) loaded on the anonymity path

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/server/loan/loan.repository.ts:40
- **Detail**: `findActiveLoansForBooks` uses `relations: { requester: true }`, hydrating the full UserEntity including passwordHash. Its only caller, src/app/discover/page.tsx:59, reads just `loan.requesterId`, a column already on `loans`. Pure waste on the one path whose product purpose is borrower anonymity. No leak today (page maps narrowly to booleans), but one `...loan` spread away from credential disclosure. test/server/loan/loan.repository.spec.ts:234 asserts `loans[0].requester.email`, locking the over-fetch in. The plan specified this relation — plan flaw too.
- **Fix**: Drop `relations: { requester: true }` from findActiveLoansForBooks and the corresponding requester assertion in the spec.
- **Decision**: FIXED

### F2 — RequestsList and BorrowingList ship with no spec files

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/requests/_components/requests-list.tsx, src/app/borrowing/_components/borrowing-list.tsx
- **Detail**: lessons.md rule 4 ("New components MUST ship with a spec") violated. Verified: test/app/requests/ has only page + request-row specs; test/app/borrowing/ has only page.spec.tsx. The friends sibling has BOTH friends-list.spec.tsx and received-invites-list.spec.tsx. BorrowingList is the worse gap — `statusLabel()` at borrowing-list.tsx:3-7 branches three ways and the empty state at :10-16 is untested except indirectly. plan.md:282-286 never listed these two specs — a plan gap that propagated into the code.
- **Fix**: Add test/app/requests/_components/requests-list.spec.tsx and test/app/borrowing/_components/borrowing-list.spec.tsx, mirroring received-invites-list.spec.tsx.
- **Decision**: FIXED

### F3 — Nav's DB call sits in the root layout with no error boundary

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/_components/nav.tsx:7-9
- **Detail**: Nav renders from src/app/layout.tsx:32, so it is on every route. The signed-out guard is correct, so anonymous traffic is unaffected. But for authenticated users a `countIncomingRequests` rejection — DB outage, Neon cold-start timeout, getDataSource() failure — throws inside the root layout and 500s EVERY page, including "/" which previously rendered without touching Postgres. ETIMEDOUT errors from this DataSource were observed during Phase 3/4 manual testing, so the failure mode is not hypothetical. No try/catch, no fallback.
- **Fix**: Wrap the count in try/catch returning 0, so a badge failure degrades the badge instead of the whole app shell.
  - Strength: Restores the pre-S-04 property that "/" renders without a DB dependency; the badge is decorative, so failing open loses nothing a user would notice.
  - Tradeoff: Silently hides DB errors on this path — worth a console.error so the failure stays observable in logs.
  - Confidence: HIGH — Nav's placement in layout.tsx:32 and the absent try/catch both verified in source.
  - Blind spot: Haven't checked whether the project wants a global error.tsx boundary instead, which would cover this class more broadly.
- **Decision**: FIXED

### F4 — revalidatePath coverage is asymmetric; /borrowing is never revalidated

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/borrow/actions.ts:76, 102-103, 126
- **Detail**: Verified call sites: requestBorrowAction revalidates only /discover; approveRequestAction revalidates /requests + /discover; declineRequestAction revalidates only /requests. So a new request never refreshes the borrower's /borrowing; an approval never refreshes /borrowing; a decline leaves the stale "Requested" pill on /discover. Impact bounded (pages call auth() → dynamic, so only client router cache goes stale), but omissions look unintentional. Plan only specified the calls present — plan gap as well.
- **Fix**: Add revalidatePath("/borrowing") to all three actions and revalidatePath("/discover") to declineRequestAction.
- **Decision**: FIXED

### F5 — findRequestedLoansForBooksByRequester has no repository spec

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/server/loan/loan.repository.ts:55-65
- **Detail**: Verified: the only occurrences in test/ are three jest.fn() mock lines in test/app/discover/page.spec.tsx. Never exercised against the real DB, while the other eight repository functions all are. It is the sole source of the "Requested" badge on /discover, and its REQUESTED-only status filter is exactly the behaviour a spec should pin.
- **Fix**: Add given/when/then cases to test/server/loan/loan.repository.spec.ts covering the requested-row hit, the empty-array short-circuit, and that a declined row is excluded.
- **Decision**: FIXED

### F6 — src/server/loan/ uses relative sibling imports, against the accepted rule

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/server/loan/loan.entity.ts:14, loan.types.ts:1, loan.repository.ts:5-6
- **Detail**: lessons.md rule 2 says the written @/* rule wins "including sibling ('./x') and parent ('../x') imports within a feature folder", and explicitly warns "Do not copy the relative style into new features". The new server module copied the relative style from friend-connection.repository.ts anyway. The app layer got it right — every import under src/app/borrow/, /requests/, /borrowing/ uses @/*. Only src/server/loan/ regressed. Third slice to hit this rule.
- **Fix**: Change the four imports to @/server/loan/loan.{entity,types}.
- **Decision**: FIXED

### F7 — loans.ownerId / requesterId are unindexed; the plan's perf claim is false as shipped

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/migrations/1784749796897-CreateLoanTable.ts:7-11
- **Detail**: The migration creates only the PK and loans_one_active_per_book (on bookId). Postgres does not auto-index FK columns, so countIncomingRequests (WHERE ownerId = ? AND status = 'requested'), findIncomingRequests and findOutgoingLoans all sequential-scan loans. plan.md:335 asserts "one indexed count per authenticated page render" — that premise does not hold as shipped. Harmless at MVP scale but not free, and the plan records it inaccurately.
- **Fix**: Add a follow-up migration creating loans(ownerId, status) and loans(requesterId).
- **Decision**: FIXED

### F8 — Dead duplicate-error catch; concurrent double-click can create two pending requests

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/borrow/actions.ts:69-74
- **Detail**: The only unique index fires on status='active', which an insert of a 'requested' row can never violate — so the `catch (isDuplicateError) → DUPLICATE_REQUEST_MESSAGE` branch is unreachable dead code. That also means the findExistingRequest pre-check at actions.ts:60 is an unguarded TOCTOU: two concurrent submissions create two 'requested' rows and the owner sees the same request twice. Not a security issue (approving the second returns "already on loan") and self-heals on next render. The plan explicitly asked for this catch — gap originates in the plan.
- **Fix A ⭐ Recommended**: Add a partial unique index on (bookId, requesterId) WHERE status = 'requested'
  - Strength: Makes the existing catch live and correct rather than deleting working error-handling; closes the duplicate-row window at the DB layer, exactly as the active-loan invariant is already enforced.
  - Tradeoff: Another migration to write and run against Neon; per F1's lesson it must be declared on LoanEntity too or synchronize will drop it.
  - Confidence: MEDIUM — mechanism proven by loans_one_active_per_book, but existing rows not checked for violations.
  - Blind spot: Whether re-requesting after a decline could collide — the predicate excludes declined rows, so it should be fine, but that path deserves a test.
- **Fix B**: Delete the dead catch and knowingly accept duplicate pending rows
  - Strength: Smallest possible change; removes misleading code implying a protection that does not exist.
  - Tradeoff: Owner-visible duplicate requests remain possible.
  - Confidence: HIGH — the branch is provably unreachable today.
  - Blind spot: None significant.
- **Decision**: FIXED

### F9 — "Requested" badge can mask a book that is actually on loan

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/discover/_components/discover-book-row.tsx:28
- **Detail**: `requestedByViewer` is tested before `status === "on_loan"`. If friend A and friend B both request a book and the owner approves A, B's leftover 'requested' row makes B's row render "Requested" for a book already on loan. No privacy leak and the action still rejects correctly — just a misleading label. The plan's ordering was ambiguous.
- **Fix**: Test `status === "on_loan"` before `requestedByViewer` in the badge ladder.
- **Decision**: FIXED

### F10 — Two inaccuracies left in the change record

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/server/loan/loan.entity.ts:17-20, plan.md
- **Detail**: (a) The comment above the @Index decorator is factually wrong. It claims TypeORM "does not compare a `where`-less index the same way". Verified against node_modules/typeorm/schema-builder/RdbmsSchemaBuilder.js: shouldDropIndices returns true for ANY DB index whose name is absent from entity metadata — `where` is never compared. A future maintainer could wrongly conclude a plain index would have survived. The fix itself is correct; only the explanation is wrong. (b) The Phase 4 borrowing-label change ("Requested from {owner}" / "Declined by {owner}") is a deliberate user-requested deviation recorded only in the commit body — plan.md still shows the old labels.
- **Fix**: Correct the entity comment to state the real mechanism, and add a one-line deviation note to plan.md for the borrowing labels.
- **Decision**: FIXED
