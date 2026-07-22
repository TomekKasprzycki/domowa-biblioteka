# Borrow Request (S-04) Implementation Plan

## Overview

Deliver the full borrow loop (roadmap's ★ North Star): a signed-in user browsing a confirmed friend's collection can request to borrow a specific book; the book's owner sees the request, and approves or declines it; an approval creates an active loan that marks the book unavailable to every other friend. This is the first slice to introduce a loan/borrow data model and the first with a hard concurrency invariant — a book may never be on two active loans at once.

## Current State Analysis

- **No loan/borrow entity exists.** Only `UserEntity`, `BookEntity`, `FriendConnectionEntity` are defined and registered (`src/lib/data-source.ts:18`). S-04 introduces the first one.
- **S-03 left the integration seam.** `src/app/discover/_components/discover-book-row.tsx` renders a static `"Available"` badge with no backing data — an explicit stub for this slice to replace with real loan state. `DiscoverBook` (`src/app/discover/discover.types.ts`) carries no availability field yet.
- **The access gate is already built.** `isConfirmedFriend(userA, userB)` was added in S-03 (`src/server/friend-connection/friend-connection.repository.ts`) specifically as S-04's borrow-request gate — it is currently unused by any page.
- **`synchronize: true` in development** (`src/lib/data-source.ts:16`) auto-syncs entity columns once an entity is registered — but it does **not** create partial indexes. The repo already has a **TypeORM migration framework** for exactly this case: `src/migrations/`, `src/lib/data-source-cli.ts`, and `package.json` scripts (`migration:generate` / `migration:run` / `migration:revert`). `src/migrations/1784146760613-CreateFriendConnectionTable.ts` is a direct precedent — it creates a table + FKs + a special **expression unique index** (`UQ_friend_connections_pair`) via `queryRunner.query`, with `up`/`down`. The loans partial unique index follows the same path (see Migration Notes), not a hand-applied SQL file.
- **Strong patterns to mirror**: the `FriendConnectionStatus` const-object + `type` status machine (`src/server/friend-connection/friend-connection.types.ts`); plain-function repositories using `ds.getRepository<T>("table")` + `generateId()` (`src/server/**/**.repository.ts`); the `"use server"` action shape — zod validate → `auth()` guard → repo call → `revalidatePath` → return `string | null` (`src/app/friends/actions.ts`); `isDuplicateError(error)` for Postgres `23505` mapping (`src/lib/db-error.utils.ts`).
- **Test conventions**: repository specs are real-DB integration tests (`getDataSource()`, fixture users, `afterAll` cleanup, given/when/then). Action specs are real-DB too, mocking `@/auth` and `next/cache`'s `revalidatePath` (`test/app/friends/actions.spec.ts`). Component/page specs use the jsdom docblock pattern from `lessons.md`.

### Key Discoveries:

- `src/server/friend-connection/friend-connection.repository.ts` (`isConfirmedFriend`, `findFriendUsers`) is the access-gate + friend-projection layer this slice consumes directly — no new friendship logic needed.
- `src/server/book/book.repository.ts:findByOwnerIds` (S-03) is the discover data source whose result must be joined with active-loan state in Phase 3.
- `src/app/friends/page.tsx` + `_components/received-invites-list.tsx` + `received-invite-row.tsx` are the exact shape to mirror for the owner `/requests` inbox (a list of incoming items each with two action buttons).
- `src/app/_components/nav.tsx` is where the `/requests` and `/borrowing` links (and the pending-count badge) go, in the authenticated branch.
- `test/app/friends/actions.spec.ts:19-34` shows the action-test harness (mock `@/auth`, mock `revalidatePath`, `formData()` helper, real DB) to reuse verbatim for borrow actions.

## Desired End State

Ania, browsing Marta's collection at `/discover`, sees each available book with a **Borrow** button and each already-lent book as **"On loan"** (no borrower name shown to her). She clicks Borrow on an available book; the request is recorded. Marta opens **`/requests`** (surfaced by a pending-count badge in her nav), sees Ania's request, and clicks **Approve** — the book becomes an active loan starting today, and immediately reads as unavailable to every friend. Ania sees it on her **`/borrowing`** page as "Borrowed from Marta." Marta could instead **Decline**, after which Ania may request again later. Two friends approving the same book at the same instant results in exactly one active loan; the loser sees "already borrowed," never a second loan or a crash.

**Verification**: `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass (including a dedicated concurrent-approval integration test); manual walkthrough of borrow-request → approve → availability-flip → decline → re-request → logged-out-redirect succeeds (see per-phase Manual Verification).

## What We're NOT Doing

- **No return / loan-close flow** — borrower "I returned it" + owner "I received it back" is S-05. This slice's `LoanStatus` only spans `requested → active / declined`; S-05 adds the return states to the same entity.
- **No owner collection-page loan-state view (FR-010)** — showing "borrowed by Ania" inside Marta's own `/collection` list is S-05. In S-04 the owner learns loan state via `/requests` (the request they approved). The discover availability integration here is the browsing-friend's view, not the owner's collection view.
- **No push or email notifications** (PRD Non-Goal) — the owner discovers requests via the in-app `/requests` page + nav badge only.
- **No optional message on a borrow request** — a request is just (book, requester); minimal per FR-008.
- **No borrower-name exposure to non-owner friends** — a book on loan reads as generic "On loan" to a browsing third friend; the owner-facing surfaces (`/requests`) name the requester inherently.
- **No pagination / search changes** to discover beyond adding availability — S-03's client filter is untouched.
- **No new migration tooling** — the repo's existing TypeORM migration framework carries the `loans` table + partial index; dev also auto-syncs columns via `synchronize: true`. No hand-applied SQL, no new runner.

## Implementation Approach

Build bottom-up as a vertical slice: (1) a single `LoanEntity` status machine + repository with the concurrency invariant enforced at the DB layer, (2) the three Server Actions (request / approve / decline) carrying every access and integrity guard, (3) the discover-side Borrow button and real availability rendering that lets a friend *create* a request end-to-end, then (4) the owner `/requests` inbox + borrower `/borrowing` view + nav badge that *resolve* requests and close the US-01 loop. Each phase is independently testable; phases 3 and 4 both depend only on the actions from phase 2 and the repository from phase 1.

## Critical Implementation Details

**The exactly-one-active-loan invariant is enforced by a partial unique index, not by application code.** `CREATE UNIQUE INDEX "loans_one_active_per_book" ON "loans" ("bookId") WHERE "status" = 'active';` — Postgres allows at most one `active` row per `bookId` while permitting many `requested`/`declined` rows. `synchronize: true` does **not** create partial indexes, so this ships as a **TypeORM migration** (mirroring `CreateFriendConnectionTable`) applied via `npm run migration:run` (see Migration Notes); the concurrency test asserts it exists by observing the `23505` on a second concurrent approval — exactly as the friend-connection spec's existing `UQ_friend_connections_pair` 23505 test does today. The approve action wraps its status flip so that a losing concurrent approval surfaces as `isDuplicateError` → an "already borrowed" message, never a thrown 500.

**`ownerId` is denormalized onto the loan.** The book already carries `userId`, but storing `ownerId` on the loan row makes "incoming requests for me" a direct `where: { ownerId, status: 'requested' }` filter (no join) and fixes the owner at request time. Books never change owner in this app, so there is no staleness risk. It is set from the book's `userId` at request creation.

**Request-time vs approval-time guards differ.** At *request* creation, validate: requester is signed in, the book exists, the requester is not the book's owner, requester `isConfirmedFriend` of the owner, the book has no current `active` loan, and the requester has no existing non-terminal (`requested`) loan for that book. At *approval*, re-validate: the acting user owns the loan's book and the loan is still `requested`; the partial index is the final arbiter of the availability race. A declined loan is terminal, so re-request works because the dedup check only looks at non-terminal rows.

## Phase 1: Loan Data Layer

### Overview

Introduce the `LoanEntity` status machine, register it, apply the concurrency-critical partial unique index, and build the repository functions with real-DB integration tests — including the headline exactly-one-active-loan concurrency test.

### Changes Required:

#### 1. Loan status type

**File**: `src/server/loan/loan.types.ts`

**Intent**: Define the loan status machine and any shared result shapes, mirroring `friend-connection.types.ts`'s const-object + `type` idiom.

**Contract**: `LoanStatus = { REQUESTED: "requested", ACTIVE: "active", DECLINED: "declined" } as const` plus the derived `type LoanStatus`. (S-05 will extend with return states.) Export a `LoanBookAvailability` type used by the discover integration in Phase 3 if convenient, or defer it to `discover.types.ts` — decided in Phase 3.

#### 2. Loan entity

**File**: `src/server/loan/loan.entity.ts`

**Intent**: The single row that represents a borrow request and its resulting loan across its whole lifecycle.

**Contract**: `@Entity("loans")` class `LoanEntity` with: `@PrimaryColumn({ type: "uuid" }) id`; `@Column({ type: "uuid" }) bookId` + `@ManyToOne(() => BookEntity) @JoinColumn({ name: "bookId" }) book`; `@Column({ type: "uuid" }) requesterId` + `@ManyToOne(() => UserEntity) @JoinColumn({ name: "requesterId" }) requester`; `@Column({ type: "uuid" }) ownerId` + `@ManyToOne(() => UserEntity) @JoinColumn({ name: "ownerId" }) owner`; `@Column({ type: "varchar" }) status: LoanStatus`; `@Column({ type: "timestamptz", nullable: true }) startedAt: Date | null`; `@CreateDateColumn() createdAt`; `@UpdateDateColumn() updatedAt`. Per `lessons.md`, every `@Column()` carries an explicit `type:`; the specialized date decorators do not. `import "reflect-metadata"` at top like sibling entities.

#### 3. Register the entity

**File**: `src/lib/data-source.ts`

**Intent**: Make TypeORM aware of `LoanEntity` so `synchronize` creates the table and relations in development.

**Contract**: Import `LoanEntity` and add it to the `entities: [...]` array.

#### 4. Loan repository

**File**: `src/server/loan/loan.repository.ts`

**Intent**: All loan data access as plain functions, in the established `ds.getRepository<LoanEntity>("loans")` style — including the guarded approval that relies on the partial index.

**Contract**:
- `createLoanRequest(data: { bookId; requesterId; ownerId }): Promise<LoanEntity>` — creates a `status: "requested"` row with `generateId()`.
- `findActiveLoanForBook(bookId): Promise<LoanEntity | null>` — the single `active` row for a book, if any.
- `findActiveLoansForBooks(bookIds: string[]): Promise<LoanEntity[]>` — `where: { bookId: In(bookIds), status: "active" }`, `relations: { requester: true }`; empty-array short-circuit returns `[]` (mirror `findByOwnerIds`).
- `findExistingRequest(bookId, requesterId): Promise<LoanEntity | null>` — a non-terminal (`requested`) row for that pair, for the dedup guard.
- `findIncomingRequests(ownerId): Promise<LoanEntity[]>` — `where: { ownerId, status: "requested" }`, `relations: { book: true, requester: true }`, ordered `createdAt DESC`.
- `findOutgoingLoans(requesterId): Promise<LoanEntity[]>` — the borrower's `requested` + `active` + `declined` rows (declined included so the borrower sees a request was turned down rather than having it silently vanish — see F3), `relations: { book: true, owner: true }`, ordered `updatedAt DESC` so recent outcomes surface first.
- `countIncomingRequests(ownerId): Promise<number>` — count of `requested` rows for the nav badge.
- `approveLoan(loanId, ownerId): Promise<LoanEntity | "not-found" | "already-borrowed">` — update `{ id: loanId, ownerId, status: "requested" }` → `{ status: "active", startedAt: new Date() }`; `"not-found"` when no row matched; catch `isDuplicateError` (partial-index collision from a concurrent approval) → `"already-borrowed"`.
- `declineLoan(loanId, ownerId): Promise<boolean>` — update `{ id: loanId, ownerId, status: "requested" }` → `{ status: "declined" }`; boolean from `affected`.

#### 5. Loan table + partial unique index migration

**File**: `src/migrations/<timestamp>-CreateLoanTable.ts`

**Intent**: Create the `loans` table (+ FKs) and the exactly-one-active-loan partial unique index through the repo's existing migration mechanism — the invariant needs a reproducible, versioned application path across dev/test/prod, not a hand-run SQL file.

**Contract**: A `MigrationInterface` mirroring `1784146760613-CreateFriendConnectionTable.ts` — `up()` creates the `loans` table + FK constraints (to `books` and `users`) and runs `CREATE UNIQUE INDEX "loans_one_active_per_book" ON "loans" ("bookId") WHERE "status" = 'active'`; `down()` drops the index, FKs, and table. Prefer `npm run migration:generate` to scaffold the table/FK DDL from `LoanEntity`, then hand-add the partial-index statement (generate won't emit the `WHERE` clause). Applied with `npm run migration:run`. Mirror how `UQ_friend_connections_pair` coexists with `synchronize: true` in dev (the precedent already resolves this interplay).

#### 6. Repository tests

**File**: `test/server/loan/loan.repository.spec.ts`

**Intent**: Cover every repository function against the real DB in the existing integration style, and prove the concurrency invariant.

**Contract**: given/when/then specs for: create request; find active loan (present/absent); `findActiveLoansForBooks` across multiple books with `requester` populated + empty-array `[]` short-circuit; dedup lookup finds a `requested` row but not a `declined` one; incoming/outgoing queries return the right rows with relations (outgoing includes a `declined` row per F3); `countIncomingRequests`; approve flips to `active` + stamps `startedAt`; decline flips to `declined`; approve returns `"not-found"` for a wrong owner. **Concurrency test**: seed one `requested` loan and a second `requested` loan for the *same book* by a different requester, fire both `approveLoan` calls with `Promise.allSettled`, assert exactly one resolves `active` and the other resolves `"already-borrowed"` (proving the partial index is live).

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Loan repository tests pass: `npm test -- loan.repository`

#### Manual Verification:

- [ ] `npm run migration:run` applied the `CreateLoanTable` migration; the `loans_one_active_per_book` partial unique index exists on the Neon DB (verify via `\d loans`) — the concurrency test depends on it.

---

## Phase 2: Borrow Request & Approval Server Actions

### Overview

Add the three Server Actions that drive the loop, each carrying its full access-control and integrity guard set, mapping the concurrency race to a clean user-facing message, with real-DB action tests.

### Changes Required:

#### 1. Borrow actions

**File**: `src/app/borrow/actions.ts` — a single actions module houses all three (a bare colocated actions module, no route/page under `/borrow`; the test mocks in Phases 3–4 target `@/app/borrow/actions`)

**Intent**: Encapsulate request / approve / decline with `"use server"`, following `friends/actions.ts` exactly (zod validate → `auth()` guard → repo → `revalidatePath` → `string | null`).

**Contract**:
- `requestBorrowAction(_prev, formData): Promise<string | null>` — zod-parse `bookId` (uuid); require session; load the book (via a `findBookById` lookup — add to `book.repository.ts` if absent); reject when book missing, when `book.userId === session.user.id` (own book), when `!isConfirmedFriend(session.user.id, book.userId)`, when an `active` loan already exists (`findActiveLoanForBook`), or when `findExistingRequest` returns a row (duplicate pending). Otherwise `createLoanRequest({ bookId, requesterId: session.user.id, ownerId: book.userId })`, `revalidatePath("/discover")`, return `null`. Map a concurrent `23505` via `isDuplicateError` to the "already requested/borrowed" message.
- `approveRequestAction(_prev, formData): Promise<string | null>` — zod-parse `loanId`; require session; call `approveLoan(loanId, session.user.id)`; map `"not-found"` → not-found message, `"already-borrowed"` → "This book is already on loan.", success → `revalidatePath("/requests")` + `revalidatePath("/discover")`, return `null`.
- `declineRequestAction(_prev, formData): Promise<string | null>` — zod-parse `loanId`; require session; `declineLoan(loanId, session.user.id)`; false → not-found message; success → `revalidatePath("/requests")`, return `null`.

Define user-facing message constants at the top as `friends/actions.ts` does.

#### 2. Book lookup helper (if absent)

**File**: `src/server/book/book.repository.ts`

**Intent**: The request action needs to load a single book by id (to read its `userId` owner and confirm existence) — there is currently only `findByUserId` / `findByOwnerIds`.

**Contract**: `findBookById(id: string): Promise<BookEntity | null>` — `repo.findOne({ where: { id } })`. No owner relation needed (only `userId` is read).

#### 3. Action tests

**File**: `test/app/borrow/actions.spec.ts`

**Intent**: Cover the guard matrix and the happy paths against the real DB, in the `friends/actions.spec.ts` harness.

**Contract**: mock `@/auth` + `next/cache`; fixture users with a confirmed friendship and a book. Assert: request succeeds for a confirmed friend on an available book (a `requested` row appears); request is rejected (returns a message, no row) for — not signed in, own book, non-friend, already-active book, duplicate pending. Approve flips to `active` + `startedAt` set; approve of an already-active book returns the already-borrowed message; approve by a non-owner returns not-found. Decline flips to `declined` and enables a subsequent successful re-request by the same borrower.

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Borrow action tests pass: `npm test -- borrow`
- [ ] Book repository tests still pass: `npm test -- book.repository`

#### Manual Verification:

- [ ] None — no user-facing surface yet; covered by automated action tests. (Wired into UI in Phases 3–4.)

---

## Phase 3: Discover Availability & Borrow Button

### Overview

Replace S-03's static "Available" stub with real loan state, and add the Borrow button that lets a browsing friend create a request end-to-end.

### Changes Required:

#### 1. Extend the discover book shape

**File**: `src/app/discover/discover.types.ts`

**Intent**: Carry each book's availability and (viewer-scoped) borrow state to the client row.

**Contract**: Add an `availability` field to `DiscoverBook`, e.g. `availability: { status: "available" | "on_loan"; borrowedByViewer: boolean }`. `borrowedByViewer` marks the case where the browsing user is themselves the active borrower (render "Borrowed by you"). No borrower name is carried — non-owner friends never see it (privacy decision). A `requestedByViewer: boolean` may be added to render "Requested" when the viewer already has a pending request.

#### 2. Compute availability in the discover page

**File**: `src/app/discover/page.tsx`

**Intent**: Join the fetched friend books with their active-loan state and the viewer's own pending requests before handing plain objects to the client.

**Contract**: After `findByOwnerIds(...)`, call `findActiveLoansForBooks(bookIds)` (and, for `requestedByViewer`, a lookup of the viewer's `requested` loans over those books) and fold the results into each `DiscoverBook.availability`. `on_loan` when an active loan exists; `borrowedByViewer` when that active loan's `requesterId === session.user.id`. Ordering/filtering behavior is unchanged.

#### 3. Borrow button + real availability in the row

**File**: `src/app/discover/_components/discover-book-row.tsx`

**Intent**: Show the true state and let an available book be requested; this row becomes a client component with a Server-Action form (like `book-row.tsx` / `friend-row.tsx`).

**Contract**: `"use client"`; `useActionState(requestBorrowAction, null)`. Render: **Borrow** submit button (hidden `bookId`) when `status === "available"` and not `requestedByViewer`; **"Requested"** disabled state when `requestedByViewer`; **"Borrowed by you"** when `borrowedByViewer`; **"On loan"** (generic, no name) otherwise. Surface the action's error string via `role="alert"` as sibling rows do.

#### 4. Component & page tests

**Files**: `test/app/discover/_components/discover-book-row.spec.tsx` (extended), `test/app/discover/page.spec.tsx` (extended), `test/app/discover/_components/discover-search.spec.tsx` (fixture update)

**Intent**: Cover the new availability rendering and that Borrow fires the action; cover the page's availability folding; keep the search spec typechecking after the `DiscoverBook` shape change.

**Contract**: row spec — mock `@/app/borrow/actions`; assert Borrow button shows for available and fires `requestBorrowAction`; "On loan" (no borrower name) shows for `on_loan`; "Borrowed by you" and "Requested" states render for their flags. page spec — extend the existing mocks with `findActiveLoansForBooks`; assert an on-loan book renders unavailable and an available one renders the Borrow affordance. **discover-search.spec** — add `availability` to its `DiscoverBook[]` fixtures (lines ~19-35) so `npx tsc --noEmit` (3.1) stays green once the field is required; this is the same fixture-break class `lessons.md` records from S-03, so it must land in this phase, not surface as a surprise tsc failure.

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Discover tests pass: `npm test -- discover`

#### Manual Verification:

- [ ] On `/discover`, an available friend book shows a Borrow button; clicking it records a request (verify it appears in the owner's `/requests` in Phase 4 / via DB)
- [ ] A book already on loan shows "On loan" with no borrower name
- [ ] After requesting, the same book shows "Requested" and cannot be re-requested
- [ ] A book the viewer currently borrows shows "Borrowed by you"

---

## Phase 4: Owner /requests Inbox, Borrower /borrowing View & Nav

### Overview

Add the surfaces that resolve requests and close the US-01 loop: the owner's approve/decline inbox, the borrower's outgoing/active list, and the nav links with a pending-request count badge.

### Changes Required:

#### 1. Owner requests page

**File**: `src/app/requests/page.tsx`

**Intent**: Server Component listing the signed-in owner's pending incoming requests, each with Approve/Decline — mirroring `friends/page.tsx` + `received-invites-list`.

**Contract**: `await auth()`; `if (!session?.user) return null`. Fetch `findIncomingRequests(session.user.id)`, map to a plain `IncomingRequest[]` (book title/author, requester name, loan id, createdAt) in a `requests.types.ts`. Render an empty state and a list of request rows.

#### 2. Request row + list components

**Files**: `src/app/requests/_components/request-row.tsx`, `src/app/requests/_components/requests-list.tsx`, `src/app/requests/requests.types.ts`

**Intent**: One incoming request with Approve/Decline forms (client, `useActionState`), and the list wrapper — mirroring `received-invite-row.tsx` / `received-invites-list.tsx`.

**Contract**: `RequestRow` renders book title/author + requester name + two Server-Action forms (`approveRequestAction`, `declineRequestAction`, hidden `loanId`), error via `role="alert"`. `RequestsList` renders empty-state text or a `<ul>` of rows. Shared `IncomingRequest` type in `requests.types.ts` per `lessons.md` (exported prop type → `*.types.ts`).

#### 3. Borrower borrowing page

**Files**: `src/app/borrowing/page.tsx`, `src/app/borrowing/_components/borrowing-list.tsx`, `src/app/borrowing/borrowing.types.ts`

**Intent**: Borrower-facing list of their outgoing requests and active borrows ("Borrowed from Marta"), serving US-01's borrower side and seeding S-05's return action.

**Contract**: `await auth()` guard; fetch `findOutgoingLoans(session.user.id)`; map to plain objects (book title/author, owner name, status, startedAt). Render each with a status label: "Requested" (pending) / "Borrowed from {owner}" (active) / "Declined" (declined — so the borrower sees the outcome, per F3). Read-only in S-04 (the return action arrives in S-05). Empty state when none.

#### 4. Nav links + pending-request badge

**File**: `src/app/_components/nav.tsx`

**Intent**: Reach both new pages, and surface pending incoming requests without push notifications.

**Contract**: Add authenticated-branch links ordered Collection → Discover → Friends → **Requests** → **Borrowing**. On the Requests link, render a count badge from `countIncomingRequests(session.user.id)` (Nav is already an async Server Component calling `auth()`); show the badge only when count > 0. Badge is the designated cut-first item if time is tight — the link itself must ship regardless.

#### 5. Page & component tests

**Files**: `test/app/requests/page.spec.tsx`, `test/app/requests/_components/request-row.spec.tsx`, `test/app/borrowing/page.spec.tsx`, `test/app/_components/nav.spec.tsx` (extended)

**Intent**: Cover the inbox rendering + action wiring, the borrowing list, and the nav links/badge, reusing the S-03 page/component-spec patterns.

**Contract**: `request-row.spec` — mock `@/app/borrow/actions`; assert Approve/Decline fire with the right `loanId`. `requests/page.spec` — mock `@/auth` + `findIncomingRequests`; renders rows for pending requests, empty state when none. `borrowing/page.spec` — mock `@/auth` + `findOutgoingLoans`; renders "Borrowed from {owner}" for active, "Requested" for pending, and "Declined" for a declined row. `nav.spec` — assert Requests + Borrowing links appear for a signed-in user, and the badge shows the mocked pending count (mock `countIncomingRequests`).

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Requests tests pass: `npm test -- requests`
- [ ] Borrowing tests pass: `npm test -- borrowing`
- [ ] Nav tests pass: `npm test -- nav`

#### Manual Verification:

- [ ] Owner sees a pending count badge in nav and the request on `/requests`
- [ ] Approve flips the book to unavailable in `/discover` and creates the loan; borrower sees "Borrowed from {owner}" on `/borrowing`
- [ ] Decline removes the request from the inbox; the borrower can request the same book again afterward
- [ ] Two simultaneous approvals of the same book yield exactly one active loan (the second shows "already on loan")
- [ ] Logged-out visits to `/requests` and `/borrowing` redirect to `/login`

---

## Testing Strategy

### Unit Tests:

- None distinct from the integration/component tests below — matches this project's existing test style.

### Integration Tests:

- `test/server/loan/loan.repository.spec.ts` (Phase 1) — every repository function + the exactly-one-active-loan concurrency test against the real DB.
- `test/app/borrow/actions.spec.ts` (Phase 2) — the guard matrix and happy paths, mocked auth/cache, real DB.

### Component / Page Tests:

- `test/app/discover/**` (Phase 3, extended) — availability rendering + Borrow action wiring.
- `test/app/requests/**`, `test/app/borrowing/**`, `test/app/_components/nav.spec.tsx` (Phase 4) — inbox, borrowing list, nav links + badge.

### Manual Testing Steps:

1. As Ania (confirmed friend of Marta), open `/discover` → available books show Borrow, lent books show "On loan" (no name).
2. Click Borrow → the book shows "Requested"; Marta's nav shows a pending badge and the request on `/requests`.
3. Marta approves → book reads unavailable in discover for everyone; Ania sees "Borrowed from Marta" on `/borrowing`.
4. Marta declines a different request → it leaves her inbox; Ania can request that book again.
5. Fire two approvals for the same book near-simultaneously → exactly one active loan; the other reports "already on loan."
6. Sign out → `/requests` and `/borrowing` redirect to `/login`.

## Performance Considerations

Availability computation is one bounded `In(bookIds)` query over the already-fetched discover set (target scale small — PRD `target_scale`, roadmap "150+ books... not needed for MVP"). The nav badge is one indexed count per authenticated page render; if it proves hot it can be memoized later, but at target scale it is negligible. No caching of availability — the NFR requires it reflect real loan state at page load.

## Migration Notes

The repo has a TypeORM migration framework (`src/migrations/`, `src/lib/data-source-cli.ts`, `package.json` `migration:*` scripts). In development `synchronize: true` also auto-creates the `loans` table + FK relations once `LoanEntity` is registered, but it cannot express the partial unique index — so that ships as a migration, following the `CreateFriendConnectionTable` precedent that already carries `UQ_friend_connections_pair`:

```sql
-- inside up() of src/migrations/<timestamp>-CreateLoanTable.ts
CREATE UNIQUE INDEX "loans_one_active_per_book"
  ON "loans" ("bookId") WHERE "status" = 'active';
```

Apply with `npm run migration:run` (revert with `migration:revert`). This partial index is the sole guarantee of the exactly-one-active-loan invariant — the migration must be run against each environment's database before Phase 1's concurrency test and before any production use. This is the same mechanism by which the friend-connection unique-pair index reaches the test DB today (which is why that spec's `23505` constraint test passes).

## References

- Prior pattern: `src/server/friend-connection/friend-connection.{entity,types,repository}.ts`, `src/app/friends/{page.tsx,actions.ts,_components/*}`, `src/app/discover/*` (S-03)
- Access gate: `src/server/friend-connection/friend-connection.repository.ts:isConfirmedFriend`
- Roadmap: `context/foundation/roadmap.md` (S-04 ★ North Star)
- PRD: `context/foundation/prd.md` (FR-008, FR-009, US-01, §Business Logic, §Non-Functional)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Loan Data Layer

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 6e50d9c
- [x] 1.2 Linting passes: `npm run lint` — 6e50d9c
- [x] 1.3 Loan repository tests pass: `npm test -- loan.repository` — 6e50d9c

#### Manual

- [x] 1.4 `npm run migration:run` applied CreateLoanTable; the `loans_one_active_per_book` partial unique index exists on the Neon DB — 6e50d9c

### Phase 2: Borrow Request & Approval Server Actions

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit` — 60dc6b8
- [x] 2.2 Linting passes: `npm run lint` — 60dc6b8
- [x] 2.3 Borrow action tests pass: `npm test -- borrow` — 60dc6b8
- [x] 2.4 Book repository tests still pass: `npm test -- book.repository` — 60dc6b8

### Phase 3: Discover Availability & Borrow Button

#### Automated

- [x] 3.1 Type checking passes: `npx tsc --noEmit` — 5feff25
- [x] 3.2 Linting passes: `npm run lint` — 5feff25
- [x] 3.3 Discover tests pass: `npm test -- discover` — 5feff25

#### Manual

- [x] 3.4 Available friend book shows a Borrow button; clicking records a request — 5feff25
- [x] 3.5 A book already on loan shows "On loan" with no borrower name — 5feff25
- [x] 3.6 After requesting, the same book shows "Requested" and cannot be re-requested — 5feff25
- [x] 3.7 A book the viewer currently borrows shows "Borrowed by you" — 5feff25

### Phase 4: Owner /requests Inbox, Borrower /borrowing View & Nav

#### Automated

- [x] 4.1 Type checking passes: `npx tsc --noEmit`
- [x] 4.2 Linting passes: `npm run lint`
- [x] 4.3 Requests tests pass: `npm test -- requests`
- [x] 4.4 Borrowing tests pass: `npm test -- borrowing`
- [x] 4.5 Nav tests pass: `npm test -- nav`

#### Manual

- [x] 4.6 Owner sees a pending count badge in nav and the request on `/requests`
- [x] 4.7 Approve flips the book to unavailable in `/discover`; borrower sees "Borrowed from {owner}" on `/borrowing`
- [x] 4.8 Decline removes the request; the borrower can request the same book again
- [x] 4.9 Two simultaneous approvals of the same book yield exactly one active loan
- [x] 4.10 Logged-out visits to `/requests` and `/borrowing` redirect to `/login`
