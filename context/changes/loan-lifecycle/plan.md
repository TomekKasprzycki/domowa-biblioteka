# S-05: Loan Lifecycle Implementation Plan

## Overview

S-04 shipped a one-way borrow: a friend requests a book, the owner approves, and the book goes on loan forever. This slice closes the loop. It extends the existing `LoanEntity` state machine with a two-sided return handshake — the borrower marks "I returned it", the book stays unavailable, and the owner confirms "I received it back", which closes the loan and frees the book (FR-011). It also gives the owner a standing view of who has what and since when (FR-010), completing the US-01 loop end to end.

## Current State Analysis

The loan data model exists and works, but only covers the outbound half of the lifecycle.

- `LoanStatus` has three values — `requested`, `active`, `declined` (`src/server/loan/loan.types.ts:3-9`). There is no state for "returned but unconfirmed" and no terminal success state.
- Book unavailability is enforced by a Postgres **partial unique index**, `loans_one_active_per_book` = `UNIQUE (bookId) WHERE status = 'active'` (`src/server/loan/loan.entity.ts:26-29`, created in `src/migrations/1784749796897-CreateLoanTable.ts:11`). This is the single guarantee behind the PRD's "never both available and borrowed" guardrail.
- Three read paths hard-code `status = ACTIVE` as a proxy for "unavailable": `findActiveLoanForBook` (`loan.repository.ts:29`), `findActiveLoansForBooks` (`:39`), and the discover availability fold (`src/app/discover/page.tsx:37,49-62`). `findOutgoingLoans` enumerates the three statuses explicitly (`loan.repository.ts:86-90`).
- `/requests` is the owner's action inbox, listing only `requested` loans (`src/app/requests/page.tsx:10`), surfaced by a nav badge driven by `countIncomingRequests` (`src/app/_components/nav.tsx:3,19-21,54-58`).
- `/borrowing` is the borrower's read-only list with no actions at all (`src/app/borrowing/_components/borrowing-list.tsx` renders a status label and nothing else).
- **FR-010 has no surface.** `/collection` maps books with zero loan data (`src/app/collection/page.tsx:11-17`) and `book-row.tsx` renders only title, author and notes.
- **A consistency hole exists today:** `deleteBook` (`src/server/book/book.repository.ts:55-63`) and `deleteBookAction` (`src/app/collection/actions.ts:124-145`) have no loan check, so an owner can delete a book that is currently out on loan, orphaning the borrower's `/borrowing` row.

Policy that is already settled and must not be re-litigated: if the owner never confirms receipt, the book stays unavailable permanently — **no timeout, no override** (`context/foundation/roadmap.md:6,148`).

## Desired End State

A borrower opens `/borrowing`, sees a book they hold, clicks **I returned it**, and confirms the browser dialog. The loan moves to `return_pending`; the book remains unavailable to every friend on `/discover`, and the owner sees it on `/collection` as "Return pending". The owner opens `/requests` — where a separate nav badge has been counting pending returns — sees the book in a **Awaiting your confirmation** section, and clicks **I received it back**. The loan closes as `returned`, the book becomes available again on `/discover`, and it drops off `/collection`'s lent-out display. The borrower now sees it under a collapsed **Past loans** section on `/borrowing`. The same borrower can request the same book again afterwards.

Verify by: running the full borrow→return cycle in the UI across two accounts, then confirming the book is borrowable again; and by the automated invariant test proving a `return_pending` book cannot receive a second active loan.

### Key Discoveries:

- **The index predicate is invisible to TypeORM's synchronizer.** `RdbmsSchemaBuilder.shouldDropIndices` compares an index's *name*, columns, uniqueness and type — never its `where` clause (`src/server/loan/loan.entity.ts:17-25`). A migration-only index change is therefore silently unreconciled in dev, where `synchronize: process.env.NODE_ENV === "development"` is on (`src/lib/data-source.ts:17`). This already cost the team the index once during S-04.
- **`synchronize` cannot create this index at all** — S-04 recorded that the partial unique index ships only via migration (`context/changes/borrow-request/plan-brief.md:47,57`).
- **S-04 anticipated this slice's data model.** Its recorded decision was "Single `LoanEntity` status machine (requested→active/declined) … **S-05 adds return states in place**" (`plan-brief.md:21`), and it stamps `startedAt` on approval explicitly "for S-05 duration logic" (`:24`).
- **The pending-request index needs no change.** `loans_one_pending_per_book_requester` is scoped `WHERE status = 'requested'` (`loan.entity.ts:40-43`), so re-borrowing after a closed loan works without modification.
- Pattern to follow: entity → migration → `src/server/<feature>/*.repository.ts` → `"use server"` action returning `string | null` with `revalidatePath` → Server Component page → client `_components/*` → spec in `test/` mirroring `src/`.
- Constraints from `context/foundation/lessons.md`: every `@Column()` needs an explicit `type:` (specialized decorators do not); all imports under `src/` use the `@/*` alias, including siblings; exported prop types live in `<feature>.types.ts`; **every new component ships with a spec** (`/** @jest-environment jsdom */` docblock, mock the actions module).

## What We're NOT Doing

- **No loan period, due dates, or overdue concept.** The PRD's secondary overdue-notification criterion stays unmet in v1 — it is already blocked by the notifications Non-Goal. We show elapsed duration only.
- **No notifications** (push or email) — PRD Non-Goal. Discovery is via in-app badges only.
- **No undo of "I returned it."** A `window.confirm` prevents the mis-click; there is no reverse transition.
- **No owner-side override or timeout** for an unconfirmed return — settled in the roadmap.
- **No owner-initiated return.** The borrower always initiates; the owner only confirms.
- **No loan history for the owner.** `/requests` stays a strictly actionable inbox; closed loans are visible to the borrower on `/borrowing` only.
- **No blocking of book *edits* during a loan** — only deletion is guarded. Editing a title causes no referential inconsistency.
- **No backfill of S-01 lessons debt** (collection's relative imports, inline `Book` type, missing component specs). Files this plan touches follow the written rules; the standalone cleanup stays separate.
- **No `/discover` changes beyond the widened availability read** — the existing "On loan" rendering already covers a return-pending book once the query includes it.

## Implementation Approach

Bottom-up, mirroring S-04's shape: make the database enforce the new invariant first, then the actions that carry the guards, then each side of the handshake as its own verifiable UI phase, then the owner's standing view.

The organising idea is that **"unavailable" stops being a synonym for `status = 'active'`**. It becomes "an open loan exists", where open = `active | return_pending`. That single semantic shift is expressed in exactly three places — the partial unique index predicate, the repository's `findOpen*` readers, and nowhere else — so no caller has to remember to include the new state.

## Critical Implementation Details

**Timing & lifecycle — the index rename is load-bearing and must be applied per environment.** Widening the predicate while keeping the name `loans_one_active_per_book` would leave dev databases holding the old `WHERE status = 'active'` index with no mechanism to notice: the synchronizer matches on name and would consider it correct, so a return-pending book would be re-borrowable in dev only. The migration must therefore `DROP` the old name and `CREATE` the new name `loans_one_open_per_book`, and the entity's `@Index` declaration must use the new name and the new predicate. Because `synchronize` cannot create a partial index, `npm run migration:run` must be applied to **every** environment including local dev after pulling this change — otherwise dev runs with no uniqueness guarantee at all.

---

## Phase 1: Loan State Machine & DB Invariant

### Overview

Add the two new loan states, move the DB-enforced unavailability invariant from "active" to "open", and give the repository the reads and writes the return handshake needs.

### Changes Required:

#### 1. Loan status vocabulary

**File**: `src/server/loan/loan.types.ts`

**Intent**: Add the two states the return handshake needs — one non-terminal (`return_pending`) and one terminal success state (`returned`) — so the whole lifecycle remains a single status column.

**Contract**: `LoanStatus` const gains `RETURN_PENDING: "return_pending"` and `RETURNED: "returned"`, following the existing as-const + keyof pattern (AGENTS.md enum rule). Add a `ConfirmReturnResult`/`MarkReturnedResult` alias only if the actions need to distinguish failure modes beyond a boolean; a boolean is sufficient where the only outcomes are "changed" and "not found or not permitted".

#### 2. Loan entity index

**File**: `src/server/loan/loan.entity.ts`

**Intent**: Retire `loans_one_active_per_book` in favour of `loans_one_open_per_book`, whose predicate covers both open states, so a book with a return awaiting confirmation cannot be borrowed by someone else.

**Contract**: The `@Index` declaration is renamed and its predicate widened. The name change is deliberate — see Critical Implementation Details. Extend the existing explanatory comment block to record why the name changed, so the next reader does not "simplify" it back.

```ts
@Index("loans_one_open_per_book", ["bookId"], {
  unique: true,
  where: "\"status\" IN ('active', 'return_pending')",
})
```

#### 3. Index migration

**File**: `src/migrations/<timestamp>-RenameLoanOpenIndex.ts`

**Intent**: Replace the index in every database. Generated via `npm run migration:generate`, then hand-checked — TypeORM will not infer the predicate change on its own.

**Contract**: `up` drops `loans_one_active_per_book` and creates `loans_one_open_per_book` with the widened predicate; `down` reverses both. No table or column changes. Mirror the raw-SQL style of `1784749796897-CreateLoanTable.ts:11,15`.

#### 4. Repository reads: active → open

**File**: `src/server/loan/loan.repository.ts`

**Intent**: Rename the two availability readers and widen them to both open states, so every existing caller inherits the correct semantics without a per-call-site change. Extend `findOutgoingLoans` to include the new statuses so the borrower's page can show them.

**Contract**: `findActiveLoanForBook` → `findOpenLoanForBook`; `findActiveLoansForBooks` → `findOpenLoansForBooks`; both filter `status: In([ACTIVE, RETURN_PENDING])`. `findOutgoingLoans` widens its `In([...])` list to all five statuses.

The rename has a wider blast radius than the two source call sites. Update all of these:

- `src/app/borrow/actions.ts:10,56` — import and availability guard
- `src/app/discover/page.tsx:6,37` — import and availability fold
- `test/server/loan/loan.repository.spec.ts:4,5,118,123,208,230,238,243` — imports, call sites, and two test titles naming the old function
- `test/app/borrow/actions.spec.ts:9,217`
- `test/app/discover/page.spec.tsx:13,29,38` — **the one to watch**: the old name is a key inside a `jest.mock` factory, so leaving it stale does not raise an import error; the mocked module simply returns `undefined` for the new name and the failure surfaces later as a confusing runtime error inside the page.

#### 5. Repository writes: the handshake

**File**: `src/server/loan/loan.repository.ts`

**Intent**: Add the two guarded transitions. Each is a conditional update keyed on both the actor and the expected current status, so authorisation and state validity are enforced in one atomic statement — the pattern `approveLoan`/`declineLoan` already use (`loan.repository.ts:110-113,131-134`).

**Contract**: `markReturned(loanId, requesterId): Promise<boolean>` updates `{id, requesterId, status: ACTIVE}` → `{status: RETURN_PENDING}`. `confirmReturn(loanId, ownerId): Promise<boolean>` updates `{id, ownerId, status: RETURN_PENDING}` → `{status: RETURNED}`. Both return whether a row was affected. Note the actor asymmetry: the borrower is matched on `requesterId`, the owner on `ownerId`.

#### 6. Repository reads: owner-side pending returns and counts

**File**: `src/server/loan/loan.repository.ts`

**Intent**: Feed the owner's confirmation inbox and the second nav badge, and give `/collection` the loan state for a set of books.

**Contract**: `findPendingReturnsForOwner(ownerId)` returns `return_pending` loans with `book` + `requester` relations, ordered like `findIncomingRequests`. `countPendingReturns(ownerId)` returns a count of the same.

For `/collection`'s FR-010 display, add a **separate** reader — `findOpenLoansForOwner(ownerId)` — returning that owner's open loans with the `requester` relation loaded. Do **not** widen `findOpenLoansForBooks` to load relations: it is `/discover`'s reader, `findActiveLoansForBooks` loads no relations today (`loan.repository.ts:36-41`), and S-04 recorded that the borrower's name is visible to the owner but never to other browsing friends (`context/changes/borrow-request/plan-brief.md:27`). Two readers scoped to two audiences keeps that privacy boundary structural rather than dependent on every future `map()` being careful. Scoping by `ownerId` rather than by book ids also drops the id-array round trip on `/collection`.

#### 7. Repository specs

**File**: `test/server/loan/loan.repository.spec.ts`

**Intent**: Prove the widened invariant and the two new transitions, including the guard cases where the wrong actor attempts a transition.

**Contract**: New cases — a `return_pending` loan blocks a second `active` loan on the same book (the headline invariant, extending S-04's concurrency test); `markReturned` succeeds for the requester and is a no-op for anyone else or for a non-`active` loan; `confirmReturn` succeeds for the owner and is a no-op for anyone else or for a non-`return_pending` loan; a book with a `returned` loan can receive a fresh `requested` loan from the same borrower. Follow the given/when/then + `it.each` conventions in AGENTS.md.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `npm run migration:run`
- Migration reverts and re-applies cleanly: `npm run migration:revert && npm run migration:run`
- Loan repository specs pass: `npm test -- loan.repository`
- Full test suite passes: `npm test`
- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- `\d loans` in psql shows `loans_one_open_per_book` present and `loans_one_active_per_book` absent
- After a dev-server request with `synchronize: true` active, the new index still exists (it is not dropped by the synchronizer)
- A book with an existing `active` loan still cannot be double-approved via the UI (no S-04 regression)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Return Server Actions

### Overview

Expose the two transitions as guarded Server Actions with the full authorisation matrix and cache invalidation.

### Changes Required:

#### 1. Return actions

**File**: `src/app/borrow/actions.ts`

**Intent**: Add `markReturnedAction` and `confirmReturnAction` alongside the existing borrow actions, so the whole loan lifecycle lives in one action module.

**Contract**: Both follow the established signature `(_prevState: string | null, formData: FormData) => Promise<string | null>`, returning `null` on success and a user-facing message on failure. Both read `loanId`, validate with `loanIdSchema`, require a session, and delegate authorisation to the repository's conditional update rather than pre-checking ownership — a `false` return maps to the existing `LOAN_NOT_FOUND_MESSAGE`, which deliberately does not distinguish "missing" from "not yours". Add sign-in messages in the module's existing const style.

**Note on cache invalidation**: both actions must `revalidatePath` all four affected surfaces — `/borrowing`, `/requests`, `/collection`, `/discover`. `/collection` is new to this fan-out (it had no loan data before) and `/discover` matters because confirming a return makes the book available again.

#### 2. Action specs

**File**: `test/app/borrow/actions.spec.ts`

**Intent**: Cover the guard matrix for both new actions, matching the depth of the existing borrow-action specs.

**Contract**: Per action — unauthenticated returns the sign-in message; malformed `loanId` returns the not-found message; repository returning `false` surfaces the not-found message; success returns `null` and triggers the four `revalidatePath` calls. One behaviour per `it` block.

### Success Criteria:

#### Automated Verification:

- Borrow action specs pass: `npm test -- borrow/actions`
- Full test suite passes: `npm test`
- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

**Implementation Note**: This phase has no manual step — the actions have no UI yet, and their behaviour is confirmed in Phases 3 and 4. Proceed to Phase 3 once automated verification passes.

---

## Phase 3: Borrower Return Flow

### Overview

Give the borrower the "I returned it" control on `/borrowing`, and split the page into current loans and a collapsed history.

### Changes Required:

#### 1. Borrower loan type

**File**: `src/app/borrowing/borrowing.types.ts`

**Intent**: Widen the status union to the full lifecycle so the new states can be rendered.

**Contract**: `OutgoingLoan.status` becomes the five-value union. Prefer importing the `LoanStatus` type from `@/server/loan/loan.types` over restating the literals, so the two cannot drift.

#### 2. Return button row

**File**: `src/app/borrowing/_components/borrowing-row.tsx` *(new)*

**Intent**: Extract a per-loan row as a Client Component that owns the "I returned it" form — the current `borrowing-list.tsx` is a Server Component with no interactivity, and AGENTS.md requires one component per file.

**Contract**: `BorrowingRow({ loan }: { loan: OutgoingLoan })`, `"use client"`, using `useActionState(markReturnedAction, null)` and a hidden `loanId` input — the shape `request-row.tsx:10-19,31-40` already uses. The button renders only when `status === "active"`, and its `onClick` calls `window.confirm` and `preventDefault()`s on cancel, exactly as `collection/_components/book-row.tsx:42-46` does for delete. Errors render in a `role="alert"` paragraph.

#### 3. Borrowing list with history

**File**: `src/app/borrowing/_components/borrowing-list.tsx`

**Intent**: Partition loans into current (`requested`, `active`, `return_pending`) and past (`returned`, `declined`), rendering past ones inside a collapsed disclosure so the actionable items stay prominent.

**Contract**: Renders `BorrowingRow` for current loans, and a native `<details>`/`<summary>` "Past loans (N)" block for terminal ones. Extend `statusLabel` for the two new statuses — `return_pending` → "Return pending — waiting for {owner} to confirm", `returned` → "Returned to {owner}". Keep the existing empty state. Using `<details>` avoids adding client state to what can stay a Server Component wrapper.

#### 4. Component specs

**Files**: `test/app/borrowing/_components/borrowing-row.spec.tsx` *(new)*, `test/app/borrowing/_components/borrowing-list.spec.tsx`

**Intent**: Cover the new interactive row and the current/past partitioning.

**Contract**: Row spec mocks `@/app/borrow/actions`, asserts the button appears only for `active` loans, that a cancelled `window.confirm` does not fire the action, and that a confirmed one does. List spec asserts partitioning, the two new status labels, and the past-loans disclosure count. Both start with the `/** @jest-environment jsdom */` docblock and import `@testing-library/jest-dom`.

### Success Criteria:

#### Automated Verification:

- Borrowing component specs pass: `npm test -- borrowing`
- Full test suite passes: `npm test`
- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- As a borrower with an active loan, "I returned it" appears; cancelling the dialog leaves the loan untouched
- Confirming flips the row to "Return pending" and the button disappears
- The book still reads as unavailable on `/discover` for all friends while the return is pending
- "Past loans" is collapsed by default and contains previously declined requests
- Layout holds at mobile width (base Tailwind classes first, per AGENTS.md)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Owner Confirm Flow

### Overview

Give the owner the "I received it back" control in a dedicated section of `/requests`, and split the nav badge so the two kinds of pending action are distinguishable before clicking.

### Changes Required:

#### 1. Pending-return type

**File**: `src/app/requests/requests.types.ts`

**Intent**: Add the shape for a return awaiting confirmation, kept separate from `IncomingRequest` because the two render different actions.

**Contract**: `PendingReturn` with `id`, `book` (title, author), `requester` (name, email), and `startedAt` — the start date lets the owner see how long the book was out.

#### 2. Pending-return row and list

**Files**: `src/app/requests/_components/pending-return-row.tsx` *(new)*, `src/app/requests/_components/pending-returns-list.tsx` *(new)*

**Intent**: Render the confirmation control, mirroring the existing `request-row` / `requests-list` pair so the inbox reads as one consistent surface.

**Contract**: Row is `"use client"` with `useActionState(confirmReturnAction, null)`, a hidden `loanId` input, an "I received it back" submit button, and a `role="alert"` error paragraph. List renders the section heading and an empty state, returning nothing when the list is empty so the page shows no empty section.

#### 3. Requests page composition

**File**: `src/app/requests/page.tsx`

**Intent**: Load pending returns alongside incoming requests and render both sections, keeping the page a strictly actionable inbox.

**Contract**: Adds a `findPendingReturnsForOwner(session.user.id)` call and maps entities to `PendingReturn`. Two headed sections — "Borrow requests" and "Awaiting your confirmation". The page-level `<h1>` stays "Requests".

#### 4. Separate nav badges

**File**: `src/app/_components/nav.tsx`

**Intent**: Show the two pending counts distinctly, so the owner knows which kind of action waits. Without a return-side signal, an unconfirmed return can sit unnoticed forever and the book stays permanently locked — the roadmap's named risk.

**Contract**: Add a `countPendingReturns` call wrapped in the same fail-soft helper as the existing count. Nav renders in the root layout, so a rejection here would 500 every page — the existing `safePendingRequestCount` try/catch pattern (`nav.tsx:8-15`) must be applied to the new count too, degrading to "no badge". Render two visually distinct badges on the Requests link (the existing red count plus a differently-coloured return count) with `aria-label`s naming what each counts.

#### 5. Component specs

**Files**: `test/app/requests/_components/pending-return-row.spec.tsx` *(new)*, `test/app/requests/_components/pending-returns-list.spec.tsx` *(new)*, `test/app/requests/page.spec.tsx`, `test/app/_components/nav.spec.tsx`

**Intent**: Cover the new components and the extended page/nav behaviour.

**Contract**: Row spec mocks the actions module and asserts the confirm action fires with the right `loanId`. List spec asserts the empty case renders nothing. Page spec asserts both sections render from mocked repository calls. Nav spec asserts both badges render with their counts, that each is absent at zero, and that a throwing count degrades to no badge rather than propagating.

### Success Criteria:

#### Automated Verification:

- Requests and nav specs pass: `npm test -- requests nav`
- Full test suite passes: `npm test`
- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- With a return pending, the owner sees a distinct badge count in the nav and the "Awaiting your confirmation" section on `/requests`
- Clicking "I received it back" closes the loan; the section empties and the badge clears
- The book becomes available again on `/discover` and can be requested by the same borrower a second time
- A user who is not the owner cannot confirm the return (verify by attempting the action while signed in as the borrower)
- The full US-01 loop — request → approve → return → confirm — completes across two accounts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Collection Loan State & Delete Guard

### Overview

Deliver FR-010 — the owner's standing view of which books are out, to whom, and since when — and close the delete hole that lets an owner remove a book that is currently on loan.

### Changes Required:

#### 1. Collection book type

**File**: `src/app/collection/collection.types.ts` *(new)*

**Intent**: Give the collection feature a types file for the loan-augmented book shape. The existing `Book` type is exported inline from `book-list.tsx` and imported by siblings — the exact drift `lessons.md` records; new exported types must not repeat it.

**Contract**: Exports the book shape plus an optional `loan: { status, borrowerName, startedAt } | null` field. Per AGENTS.md, optional fields use `| null`, not `| undefined`. Moving the existing inline `Book` type here is in scope only if it is free; otherwise leave the S-01 debt for its standalone cleanup and have the new type stand alongside.

#### 2. Collection page loan join

**File**: `src/app/collection/page.tsx`

**Intent**: Load open loans for the owner's books and fold loan state into each row, so FR-010 is answered where the owner already looks.

**Contract**: After `findByUserId`, call `findOpenLoansForOwner(session.user.id)` (the owner-scoped reader from Phase 1, change 6 — *not* `findOpenLoansForBooks`, which is `/discover`'s relation-free reader) and build a `Map` keyed by `bookId`, mirroring the fold in `discover/page.tsx:43-63`. Each mapped book carries `loan: null` when free.

#### 3. Book row loan display

**File**: `src/app/collection/_components/book-row.tsx`

**Intent**: Show the loan state inline and hide the Delete control while a book is out, so the guard is visible before it is enforced.

**Contract**: Renders "Lent to {name} · since {date}" for `active` and "Return pending · {name}" for `return_pending`, using the same muted text style as the notes line. Duration is derived from `startedAt` — a plain elapsed-days rendering, no loan-period or overdue concept. Delete is hidden (or disabled with a title) when `loan` is non-null; the server-side guard remains the actual enforcement.

#### 4. Delete guard

**Files**: `src/app/collection/actions.ts`, `src/server/loan/loan.repository.ts`, `src/lib/db-error.utils.ts`

**Intent**: Refuse deletion of a book that has **any** loan row, and turn the database's refusal into a message instead of a crash. The `loans.bookId` foreign key is `ON DELETE NO ACTION` (`src/migrations/1784749796897-CreateLoanTable.ts:8`), so Postgres already blocks deletion for *every* loan row — including terminal `declined` and `returned` ones, not just open loans. Today that surfaces as an unhandled `23503` and a 500, because `isDuplicateError` only matches `23505` (`src/lib/db-error.utils.ts:5`) and `deleteBookAction` has no `try/catch` at all. This is pre-existing S-04 behaviour, but Phase 5 is the phase that owns deletion, so it is fixed here.

**Contract**: Two layers, mirroring the pre-check + catch pairing `requestBorrowAction` already uses (`src/app/borrow/actions.ts:56-74`):

1. **Pre-check** — `deleteBookAction` calls a new `countLoansForBook(bookId)` (or `findAnyLoanForBook`) before `deleteBook` and returns a user-facing message when a loan row exists, in the module's existing message-const style. Distinguish the two cases so the message is honest: an open loan → "This book is currently on loan and can't be deleted."; only closed loans → "This book has borrowing history and can't be deleted." Reuse `findOpenLoanForBook` to tell them apart.
2. **Backstop** — add `isForeignKeyViolation(error)` beside `isDuplicateError` in `db-error.utils.ts`, matching `QueryFailedError` with code `23503`, and wrap the `deleteBook` call so a lost race degrades to the same message rather than a 500.

The pre-check is a read-then-write and cannot close a true race on its own; the backstop is what makes the race safe. Accepted consequence of this design: **a book that has ever been borrowed can no longer be deleted.** That is a deliberate trade for preserving the borrower's "Past loans" history built in Phase 3.

#### 5. Specs

**Files**: `test/app/collection/actions.spec.ts`, `test/lib/db-error.utils.spec.ts`, `test/app/collection/_components/book-row.spec.tsx` *(new)*, `test/app/collection/page.spec.tsx` *(new)*

**Intent**: Cover both guard layers and the new FR-010 rendering.

**Contract**: Action spec covers three delete cases as separate `it` blocks — open loan refused with the on-loan message, closed-loan-only refused with the history message, no loan proceeds — plus a fourth where `deleteBook` throws `23503` and the action returns the message instead of propagating. `db-error.utils.spec.ts` gains `isForeignKeyViolation` cases mirroring the existing `isDuplicateError` ones (matches `23503`, rejects other codes and non-`QueryFailedError` values). Row spec asserts the three display states (free, lent, return-pending) and that Delete is unavailable while on loan. Page spec asserts loan state is folded onto the right book. The two component specs are the first for collection; they follow the jsdom docblock convention and do not obligate backfilling the rest of S-01's components.

### Success Criteria:

#### Automated Verification:

- Collection and db-error specs pass: `npm test -- collection db-error`
- Full test suite passes: `npm test`
- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- `/collection` shows "Lent to {name} · since {date}" for a book that is out, and "Return pending" once the borrower marks it returned
- The display clears once the owner confirms receipt
- Attempting to delete a book that is on loan is refused with a clear message
- Attempting to delete a book whose only loans are closed is refused with the history message — not a 500
- A book that has never been borrowed still deletes normally (no S-01 regression)
- Layout holds at mobile width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. This is the final phase — confirm the whole US-01 loop before closing the change.

---

## Testing Strategy

### Unit Tests:

- `markReturned` / `confirmReturn` transition guards: correct actor succeeds; wrong actor is a no-op; wrong source status is a no-op
- `findOpenLoanForBook` / `findOpenLoansForBooks` include both `active` and `return_pending`
- Status label rendering for all five statuses
- Delete guard: refuses with an open loan, permits without one

### Integration Tests:

- **The headline invariant** (real DB): a book whose loan is `return_pending` cannot receive a second `active` loan — the widened partial unique index rejects it. This extends S-04's concurrent-approval test and is the single most important test in this slice.
- Re-borrow after close: a `returned` loan does not block a fresh `requested` loan from the same borrower on the same book.

### Manual Testing Steps:

1. Sign in as owner, add a book; sign in as friend, request it; owner approves. Confirm `/collection` shows "Lent to {name} · since {date}".
2. As borrower, open `/borrowing`, click "I returned it", cancel the dialog — confirm nothing changed.
3. Click again and confirm. Verify: borrower sees "Return pending"; owner's nav shows a distinct return badge; `/collection` shows "Return pending"; `/discover` still shows the book unavailable to a third friend.
4. As owner, open `/requests`, confirm receipt. Verify the loan closes, badges clear, `/collection` shows the book free, and `/discover` offers Borrow again.
5. As borrower, confirm the closed loan now appears under the collapsed "Past loans" section.
6. Request and approve the same book again — confirm re-borrowing works.
7. With a book on loan, attempt deletion from `/collection` — confirm refusal.

## Performance Considerations

The nav renders on every authenticated page and now issues **two** count queries instead of one. Both are indexed by `loans_owner_status` (`loan.entity.ts:34`), which covers `(ownerId, status)` and serves both counts. S-04 already flagged the badge query as the cut-first candidate if this path proves hot; that judgement now applies to the pair. `/collection` gains one additional query (open loans for the owner's books), which is a single indexed `IN` lookup — the same shape `/discover` already performs.

## Migration Notes

One migration, index-only, no data changes. Existing `active` loans keep their status and are covered by the new predicate, so no backfill is required and no in-flight loan is disturbed.

Rollback is the `down` migration, which restores `loans_one_active_per_book`. **Reverting is only safe while no loan is in `return_pending`** — the narrower predicate would let a return-pending book be borrowed again. If a revert is needed after the feature has been used, move any `return_pending` rows back to `active` first.

Every environment — including local development — must run `npm run migration:run` after pulling this change. See Critical Implementation Details.

## References

- Change identity: `context/changes/loan-lifecycle/change.md`
- Prior slice (data model, invariant, surfaces this extends): `context/changes/borrow-request/plan.md`, `context/changes/borrow-request/plan-brief.md`
- Roadmap item and settled policy: `context/foundation/roadmap.md:139-149`
- Project rules: `context/foundation/lessons.md`, `AGENTS.md`
- Index synchroniser gotcha: `src/server/loan/loan.entity.ts:17-25`
- Transition pattern to mirror: `src/server/loan/loan.repository.ts:103-136`
- Availability fold to mirror: `src/app/discover/page.tsx:43-63`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Loan State Machine & DB Invariant

#### Automated

- [x] 1.1 Migration applies cleanly: `npm run migration:run` — 618d2f8
- [x] 1.2 Migration reverts and re-applies cleanly: `npm run migration:revert && npm run migration:run` — 618d2f8
- [x] 1.3 Loan repository specs pass: `npm test -- loan.repository` — 618d2f8
- [x] 1.4 Full test suite passes: `npm test` — 618d2f8
- [x] 1.5 Type checking passes: `npx tsc --noEmit` — 618d2f8
- [x] 1.6 Linting passes: `npm run lint` — 618d2f8

#### Manual

- [x] 1.7 `\d loans` shows `loans_one_open_per_book` present and `loans_one_active_per_book` absent — 618d2f8
- [x] 1.8 New index survives a dev-server request with `synchronize: true` active — 618d2f8
- [ ] 1.9 No S-04 regression: a book with an active loan still cannot be double-approved

### Phase 2: Return Server Actions

#### Automated

- [x] 2.1 Borrow action specs pass: `npm test -- borrow/actions` — 7e3875e
- [x] 2.2 Full test suite passes: `npm test` — 7e3875e
- [x] 2.3 Type checking passes: `npx tsc --noEmit` — 7e3875e
- [x] 2.4 Linting passes: `npm run lint` — 7e3875e

### Phase 3: Borrower Return Flow

#### Automated

- [x] 3.1 Borrowing component specs pass: `npm test -- borrowing`
- [x] 3.2 Full test suite passes: `npm test`
- [x] 3.3 Type checking passes: `npx tsc --noEmit`
- [x] 3.4 Linting passes: `npm run lint`

#### Manual

- [ ] 3.5 "I returned it" appears for active loans; cancelling the dialog changes nothing
- [x] 3.6 Confirming flips the row to "Return pending" and hides the button
- [ ] 3.7 Book still reads unavailable on `/discover` while the return is pending
- [ ] 3.8 "Past loans" is collapsed by default and contains declined requests
- [ ] 3.9 Layout holds at mobile width

### Phase 4: Owner Confirm Flow

#### Automated

- [ ] 4.1 Requests and nav specs pass: `npm test -- requests nav`
- [ ] 4.2 Full test suite passes: `npm test`
- [ ] 4.3 Type checking passes: `npx tsc --noEmit`
- [ ] 4.4 Linting passes: `npm run lint`

#### Manual

- [ ] 4.5 Distinct return badge and "Awaiting your confirmation" section appear for the owner
- [ ] 4.6 "I received it back" closes the loan; section empties and badge clears
- [ ] 4.7 Book becomes available on `/discover` and can be re-requested by the same borrower
- [ ] 4.8 A non-owner cannot confirm the return
- [ ] 4.9 Full US-01 loop completes across two accounts

### Phase 5: Collection Loan State & Delete Guard

#### Automated

- [ ] 5.1 Collection and db-error specs pass: `npm test -- collection db-error`
- [ ] 5.2 Full test suite passes: `npm test`
- [ ] 5.3 Type checking passes: `npx tsc --noEmit`
- [ ] 5.4 Linting passes: `npm run lint`

#### Manual

- [ ] 5.5 `/collection` shows "Lent to {name} · since {date}", then "Return pending"
- [ ] 5.6 Display clears once the owner confirms receipt
- [ ] 5.7 Deleting a book that is on loan is refused with a clear message
- [ ] 5.8 Deleting a book whose only loans are closed is refused with the history message, not a 500
- [ ] 5.9 A book that has never been borrowed still deletes normally
- [ ] 5.10 Layout holds at mobile width
