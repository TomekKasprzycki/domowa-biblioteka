# S-10: Privacy Notice & Account Deletion (RODO) Implementation Plan

## Overview

Domowa Biblioteka currently has no privacy notice and no way for a user to delete their account. `context/changes/gdpr-assessment/research.md` established that GDPR/RODO applies (Polish/EU persona, real personal data already flowing through `UserEntity`, `BookEntity`, `FriendConnectionEntity`, `LoanEntity`) and that neither right exists anywhere in the codebase. This plan builds the first cut: a public privacy notice page, and a self-service "delete my account" flow that permanently and atomically removes a user's row along with everything that references it.

## Current State Analysis

- No cascade deletes exist anywhere. Every FK from `books.userId`, `friend_connections.requesterId`/`addresseeId`, and `loans.requesterId`/`ownerId`/`bookId` is `ON DELETE NO ACTION` (confirmed in every `CreateXTable` migration). Deleting a `UserEntity` row today throws a raw FK-violation error the moment any child row exists.
- `LoanEntity` is the tricky one: a user can appear on a loan as `requesterId` (borrower), `ownerId` (book owner), or transitively via `bookId → books.userId` (they own the book being loaned). Deleting a user who is any of these three requires resolving what happens to the loan.
- No repository/service layer beyond plain per-entity async functions (`src/server/*/​*.repository.ts`) calling `getDataSource().getRepository(...)` directly. No transaction has ever been used in application code — multi-step loan operations (`approveLoan`, `markReturned`, `confirmReturn`) rely on single conditional `UPDATE ... WHERE` statements plus partial unique indexes, not `dataSource.transaction()`/`QueryRunner`. This plan introduces the first real transaction.
- The destructive-action pattern is established and will be reused as-is: `src/app/(app)/friends/actions.ts` — `auth()` session check → Zod-validated input → scoped repository call → `revalidatePath`. Sign-out is already a working server action (`signOutAction` in `src/app/_components/sidebar.actions.ts`, calling `signOut({ redirectTo: "/" })`).
- Route protection is middleware-level, not per-page: `src/middleware.ts` wraps `src/auth.config.ts`'s `authorized` callback, which allow-lists `["/", "/login", "/register"]` plus `/api/auth/*` and requires a session everywhere else.
- No `/account`, `/settings`, or `/privacy` route exists today. The sidebar nav (`src/app/_components/sidebar-nav.tsx`) is a flat `NAV_ROUTES` array plus a manually-appended sign-out `<form>` — both are trivial to extend.
- Test convention: a mirrored `test/` tree, real DB (not mocked), `jest.mock("@/auth", ...)` for session, `jest.mock("next/cache", ...)` for `revalidatePath`, seed-then-clean-up in `beforeAll`/`afterAll` (see `test/app/(app)/friends/actions.spec.ts`).

### Key Discoveries:

- `src/server/loan/loan.entity.ts:16-51` — three separate FK columns to `UserEntity` (`requesterId`, `ownerId`) plus a transitive one via `bookId`, and a code comment already warning that TypeORM's `synchronize: true` dev mode can silently drop an index whose predicate diverged from its migration — the same class of risk applies if cascade behavior is ever added only at the migration level without mirroring it in entity decorators (this plan avoids that entirely by keeping FKs as `NO ACTION` and doing cascade in application code).
- `src/server/friend-connection/friend-connection.repository.ts:133-144` (`deleteConnection`) and `src/server/loan/loan.repository.ts` — deletes and multi-condition lookups already use the "array of OR'd where-conditions" idiom (`repo.delete([{...}, {...}])`); the new cascade function reuses this idiom rather than inventing a new query style.
- `src/lib/data-source.ts:19` — the runtime data source lists entities explicitly (`[UserEntity, BookEntity, FriendConnectionEntity, LoanEntity]`); a new entity must be added here manually. `src/lib/data-source-cli.ts:11` globs `src/server/**/*.entity.ts`, so the migration-generation CLI picks up a new entity automatically.
- `src/server/loan/loan.repository.ts:211-213` — an existing comment confirms deleting a book with any loan history (not just open loans) is already rejected by the FK today; the account-deletion cascade must delete all of a user's loan rows (open and closed) before their books, which is a stronger requirement than the existing `deleteBook` function handles.
- `src/app/_components/modal.tsx` and `src/app/_components/button.tsx` (variant `"decline"`) are the closest existing destructive-styling primitives; no new design-system variant is introduced by this plan.

## Desired End State

A signed-out visitor can read `/privacy` — a concise notice naming what data is collected, why, its legal basis, and the processors involved (Vercel, Neon) — linked from `/login`, `/register`, and the in-app sidebar. A signed-in user can reach `/account`, type their email to confirm, and permanently delete their account; on success, every `books`, `friend_connections`, and `loans` row referencing them is gone, a minimal deletion-audit row is kept, they are signed out, and redirected to a confirmation banner on `/`. If the user is party to any open loan (as borrower, owner, or via their own book on loan), deletion is refused with a clear message instead of silently breaking the other party's loan state.

**Verification:** `npm test`, `npm run build`, and `npm run lint` all pass; the new integration test seeds a user with rows in every relational role and asserts zero orphaned rows survive deletion; manual click-through confirms the notice, the account page, the blocking message, and the post-deletion redirect all work end to end.

## What We're NOT Doing

- **Data export / access (GDPR Art. 15/20).** Explicitly deferred per `context/changes/gdpr-assessment/change.md` — this slice ships notice + deletion only.
- **Migrating the Neon database out of `us-east-1`.** The data-residency gap is *documented* (in the privacy notice and the infrastructure risk register), not resolved at the infrastructure level — an actual region migration is a separate, larger infra change.
- **A general "account settings" / profile-update page.** `/account` in this plan contains only the delete-account section. Name/profile editing (`context/design/todo.md`'s "update ale nie email") is not part of S-10's scope and is not stubbed here.
- **Re-authentication via password before deletion.** The confirmation UX is type-your-email, not a password re-check; no new password-verification action is introduced.
- **A deadlock-breaking mechanism for stuck loans.** If deletion is blocked by an active loan and the counterparty won't complete the return handshake, there is no admin override, timeout, or force-close path in this plan.
- **Verifying or negotiating DPAs with Vercel/Neon.** The notice states processing occurs on these processors; confirming their DPA terms is a legal task outside this implementation plan.
- **A general data-retention policy** (how long to keep closed loans, rejected invites, etc.) beyond the one new deletion-audit row this plan adds. Research gap #7 remains open for a future slice.
- **A new "danger" button variant.** The existing `"decline"` button variant is reused for the delete action rather than adding a new design-system color.
- **Invalidating a deleted user's other sessions.** Sessions are JWT-strategy with no database session table (`src/auth.config.ts:11`), and `authorized` only checks `!!session?.user` (`:14-22`), so `signOut()` clears the cookie on the acting browser only. Another tab or device holding a valid JWT keeps passing middleware after the user row is gone: reads render as empty collections and any write fails on a foreign-key violation. This is accepted, not mitigated — the failure mode is bounded (every query is already scoped by a `userId` that now matches nothing, so there is no cross-user data exposure), and the alternative is a database round-trip on every authenticated page render to defend against a rare event.

## Implementation Approach

Account deletion is implemented as one new transactional orchestrator (`deleteAccount`) that owns the entire cascade order, rather than adding `onDelete: CASCADE` at the database level. This is deliberate: the active-loan blocking rule needs application logic to run *before* any row is touched, which a blind DB cascade can't express, and keeping the existing `ON DELETE NO ACTION` constraints turns "a future entity was added but not wired into the cascade" into a hard, transaction-rolling-back FK error instead of a silent partial delete. The privacy notice and account page are new, simple Server Components following the codebase's existing page/action/nav conventions; no new libraries or design-system primitives are introduced.

## Critical Implementation Details

**Transaction mechanics — do not reuse existing repository functions here.** Every query inside `deleteAccount` must be issued through the `EntityManager` passed to the `dataSource.transaction(async (manager) => …)` callback. No existing repository function can participate in a transaction: each one calls `getDataSource().getRepository(...)` itself (`src/server/book/book.repository.ts:62-70`, `src/server/friend-connection/friend-connection.repository.ts:133-144`, all 16 sites in `loan.repository.ts`), and there is no precedent anywhere in `src/` for passing a manager or query runner into one. Calling `deleteBook()` or `deleteConnection()` from inside the callback would run those deletes on a different pooled connection, outside the transaction — silently defeating the atomicity this phase exists to provide. Write the deletes inline against `manager`.

**State sequencing (account deletion transaction):** Within a single `dataSource.transaction()` call, all steps via `manager`: (1) fetch the user's owned book ids; (2) run the open-loan check and return `"blocked"` if any open loan involves the user in any role; (3) delete `loans` rows where `requesterId`, `ownerId`, or `bookId` (via the owned-book-ids list) match; (4) delete `friend_connections` rows where `requesterId` or `addresseeId` match; (5) delete `books` rows for the user; (6) insert one `account_deletion_log` row containing a SHA-256 hash of the user id and a timestamp; (7) delete the `users` row last, after every child row is gone. This order is load-bearing: reversing steps 3–5 re-triggers the exact FK violations the transaction is designed to convert into a clean rollback instead of a partial, half-deleted account.

**What the in-transaction check does and does not guarantee.** Step (2) is not a race-closing mechanism. Under Postgres's default READ COMMITTED isolation it cannot see a loan inserted by another user *after* its SELECT. The actual protection is the `ON DELETE NO ACTION` foreign key: a concurrently-inserted loan makes step (5) or (7) fail, and the whole transaction rolls back — data integrity holds, but the failure arrives as a driver-level FK-violation error, not as a return value. That error must be caught and mapped to a `"conflict"` result rather than thrown, following the precedent of `approveLoan` mapping a constraint violation to `"already-borrowed"` via `isDuplicateError` (`src/lib/db-error.utils.ts`, used at `src/server/loan/loan.repository.ts:134-139`). Without this, a user who happens to race a friend's borrow request gets an unexplained 500 on an emotionally loaded action.

## Phase 1: Data Layer — Cascade Delete & Audit Log

### Overview

Add the audit-log entity and migration, the active-loan predicate, and the transactional cascade-delete orchestrator. No UI or actions yet — this phase is verified entirely through integration tests against the real DB.

### Changes Required:

#### 1. Account-deletion audit log entity

**File**: `src/server/account-deletion/account-deletion-log.entity.ts`

**Intent**: A durable, minimal record that an account was deleted and when — without retaining any personal data that could itself become a future erasure request.

**Contract**: `AccountDeletionLogEntity` mapped to table `account_deletion_log`: `id` (uuid PK), `deletedUserIdHash` (`varchar`, SHA-256 hex digest of the former user id), `deletedAt` (`@CreateDateColumn`). No relations, no FK to `users` (the referenced row will no longer exist).

#### 2. Migration for the new table

**File**: `src/migrations/<timestamp>-CreateAccountDeletionLogTable.ts`

**Intent**: Schema for the audit table.

**Contract**: Mirror the existing raw-SQL migration style (see `src/migrations/1784146760613-CreateFriendConnectionTable.ts`) — `CREATE TABLE "account_deletion_log" (...)` with no foreign key constraints, plus the matching `down()` drop.

#### 3. Register the new entity in the runtime data source

**File**: `src/lib/data-source.ts`

**Intent**: The runtime TypeORM connection only knows the entities explicitly listed here; skipping this step makes `getRepository()` calls for the new entity fail to resolve metadata at runtime.

**Contract**: Import `AccountDeletionLogEntity` and add it to the `entities: [...]` array (line 19). `src/lib/data-source-cli.ts` needs no change — it globs `src/server/**/*.entity.ts`.

#### 4. Active-loan predicate (transaction-internal)

**File**: `src/server/account-deletion/account-deletion.repository.ts`

**Intent**: A single answer to "does deleting this user leave any book physically out with someone". It lives beside the orchestrator rather than in `loan.repository.ts` because it must execute on the transaction's `EntityManager` — a function in `loan.repository.ts` would open its own connection and read outside the transaction.

**Contract**: A module-private helper taking the transaction manager plus `userId` and the user's owned book ids, returning whether any `loans` row has `status IN OPEN_LOAN_STATUSES` and (`requesterId = userId` OR `ownerId = userId` OR `bookId IN ownedBookIds`), using the same OR-array-of-conditions idiom as `deleteConnection`.

Note on the third clause: it is redundant by invariant today — `loan.ownerId` is written once from `book.userId` at `src/app/borrow/actions.ts:88-92` (the sole caller of `createLoanRequest`) and no ownership-transfer path exists, since `updateBook`'s data type is `Partial<{title, author, notes}>` and cannot write `userId` (`src/server/book/book.repository.ts:50-60`). Keep it as a deliberate backstop and say so in a code comment, so that a future ownership-transfer feature cannot silently orphan loans.

#### 5. Transactional cascade-delete orchestrator

**File**: `src/server/account-deletion/account-deletion.repository.ts`

**Intent**: The single place that knows the full deletion order and performs it atomically — see Critical Implementation Details above for the exact sequencing, the manager-only rule, and the FK-conflict path.

**Contract**: `deleteAccount(userId: string): Promise<"blocked" | "conflict" | "deleted">`. `"conflict"` is returned when the transaction rolls back on a foreign-key violation caused by a concurrent write, distinguishing it from `"blocked"` (a loan the check saw up front).

### Success Criteria:

**Prerequisite ordering — the automated checks below cannot pass until the migration has been applied.** `synchronize` is gated on `NODE_ENV === "development"` (`src/lib/data-source.ts:17`) and Jest runs with `NODE_ENV=test`, while the runtime data source registers no `migrations:` key — so the new `account_deletion_log` table is *not* created for tests. Run, in order: `npm run db:start` (local Postgres on port 54729) → `npm run migration:generate -- src/migrations/CreateAccountDeletionLogTable` → `npm run migration:run` → `npm test`. Note `src/lib/data-source-cli.ts:9` uses `DATABASE_URL_UNPOOLED` while the runtime and tests use `DATABASE_URL`; both must point at the same local database or the migration lands where the tests cannot see it.

#### Automated Verification:

- New integration test `test/server/account-deletion/account-deletion.repository.spec.ts` passes: seeds a user with a book, an accepted friend connection, a loan as requester, a loan as owner, and a loan on their own book to a third party; asserts `deleteAccount` returns `"blocked"` while any loan is open; asserts it returns `"deleted"` once loans are closed, with zero orphaned `books`/`friend_connections`/`loans` rows remaining and exactly one `account_deletion_log` row with the expected hash; asserts a forced mid-transaction failure leaves no partial deletion (atomicity).
- `npm test` passes
- `npm run build` passes (this is the project's type-check gate — there is no `typecheck` script)
- `npm run lint` passes

#### Manual Verification:

- After `npm run migration:run`, confirm the `account_deletion_log` table exists with the expected columns via a DB client

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Server Actions & Auth Wiring

### Overview

Wire the data layer to a server action with type-to-confirm validation and sign-out, and open the `/privacy` route to unauthenticated visitors.

### Changes Required:

#### 1. Delete-account server action

**File**: `src/app/(app)/account/actions.ts`

**Intent**: Session check, type-to-confirm validation, calling the cascade orchestrator, and signing the user out on success — following the exact pattern already used by `src/app/(app)/friends/actions.ts`.

**Contract**: `deleteAccountAction(prevState: string | null, formData: FormData): Promise<string | null>` (same `useActionState` shape as `sendInviteAction`). On `"blocked"`, returns a message telling the user to resolve their active loan first. On `"conflict"`, returns a short "something changed, please try again" message. On `"deleted"`, calls `signOut({ redirectTo: "/?accountDeleted=1" })` as the final statement — no code runs after it, matching how `signOut` performs its own redirect.

**Confirmation guard — must not compare raw values.** `session.user.email` is typed `string | null | undefined` (it extends `DefaultSession["user"]`, `src/auth.config.ts:3-7`) and `formData.get("confirmEmail")` returns `null` when the field is absent, so a bare `===` between them evaluates `null === null` as a match and would delete the account with nothing typed. Parse the form field through a Zod non-empty-string schema first (mirroring `emailSchema` at `src/app/(app)/friends/actions.ts:16-19`), separately guard that `session.user.email` is a non-empty string, and only then compare the two trimmed strings.

#### 2. Open the privacy notice to unauthenticated visitors

**File**: `src/auth.config.ts`

**Intent**: The privacy notice must be readable before registering, not only after signing in.

**Contract**: Add `"/privacy"` to the `publicPaths` array (line 16).

### Success Criteria:

#### Automated Verification:

- New `test/app/(app)/account/actions.spec.ts` (following `friends/actions.spec.ts`'s convention — mocked `@/auth`, real DB, `formData()` helper) passes: unauthenticated call returns an error string; a mismatched confirmation email returns an error and the user row still exists; a *missing* `confirmEmail` field returns an error and does not delete (the null-equality guard); an account with an open loan returns the blocking message and the user row still exists; a clean account is deleted and the user row is gone afterward.
- `npm test` passes
- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- Sign in as a test user with no open loans; submit a mismatched confirmation value and confirm it's rejected without deleting anything
- Submit the correct confirmation value and confirm the account is gone and the session ends
- Repeat with an account holding an active loan and confirm the blocking message appears instead

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: UI, Notice Content & Docs

### Overview

Build the account page and privacy notice page, link them from the nav and the auth pages, show a post-deletion confirmation, and document the data-residency gap in the infrastructure risk register.

### Changes Required:

#### 1. Account page + delete form

**File**: `src/app/(app)/account/page.tsx`, `src/app/(app)/account/_components/delete-account-form.tsx`

**Intent**: Explain what deletion does (cascades across books, friend connections, and loans; irreversible) and host the type-to-confirm form.

**Contract**: `page.tsx` is an async Server Component reading `auth()` for `session.user.email` to display and pass down. `delete-account-form.tsx` is a client component using `useActionState(deleteAccountAction, null)`; the submit `Button` (variant `"decline"`) stays disabled until the typed value matches the session email exactly; the returned error string renders inline.

#### 2. Privacy notice page

**File**: `src/app/privacy/page.tsx`

**Intent**: The full-but-concise GDPR notice, resolving Open Roadmap Question #3.

**Contract**: Static public Server Component enumerating, per the research findings: data categories per entity (account: email/password/name; social graph: friend connections; collection: owned books; behavioral: loan history), why each is collected (maps directly to a product feature), legal basis (performance of the contract formed at registration), named processors (Vercel for hosting/functions, Neon for the database — naming that the database currently runs in a US region pending an EU-region migration, with a transfer safeguard relied on in the interim), and the deletion right with a link to `/account`.

Include a "← Back" link to `/`. The page sits outside the `(app)` route group and the root layout renders no navigation chrome (`src/app/layout.tsx` is fonts and a bare `<body>`), so without it a signed-in user who follows the sidebar's Privacy link has no way back except the browser's back button.

#### 3. Nav links

**File**: `src/app/_components/sidebar-nav.tsx`

**Intent**: Make both new pages reachable from inside the app.

**Contract**: Add `{ href: "/account", icon: "⚙️", label: "Account" }` to `NAV_ROUTES`; add a small text link to `/privacy` near the sign-out form (not a full nav item). Update `test/app/_components/sidebar-nav.spec.tsx` for the new entries.

#### 4. Login/register links

**File**: `src/app/login/page.tsx`, `src/app/register/page.tsx`

**Intent**: The notice must be reachable before an account exists.

**Contract**: Add one `<Link href="/privacy">` per page near the existing form.

#### 5. Home page confirmation banner

**File**: `src/app/page.tsx`

**Intent**: Visible confirmation after the post-deletion redirect.

**Contract**: Extend `Home` with a `searchParams: Promise<{ accountDeleted?: string }>` prop (matching the existing pattern at `src/app/login/page.tsx:3-8`); render a one-time banner when `accountDeleted === "1"`.

#### 6. Infrastructure risk register update

**File**: `context/foundation/infrastructure.md`

**Intent**: Close the documentation gap the research found — the risk register already tracks availability/latency/cost risk but never named the DB region mismatch.

**Contract**: Add one Risk Register entry naming the Neon `us-east-1` vs. Vercel `cdg1` mismatch, cross-referencing `context/changes/gdpr-assessment/research.md` and the privacy notice's disclosure, and noting the actual region migration is a deliberately separate follow-up.

### Success Criteria:

#### Automated Verification:

- Component spec for `delete-account-form.tsx` passes: confirm button stays disabled until the typed value matches, and the mocked action fires on submit
- Updated `test/app/_components/sidebar-nav.spec.tsx` passes for the new nav entries
- `npm test` passes
- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- While signed out, reach `/privacy` via a link on `/login` and on `/register`
- While signed in, reach `/account` from the sidebar and read the delete-account explanation
- Delete a test account end-to-end and confirm the redirect banner appears on `/`
- Confirm `/account` and `/privacy` render correctly at mobile width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `hasOpenLoanForUser` covering all three role predicates (requester, owner, owned-book) independently and combined

### Integration Tests:

- Full cascade-delete scenario across all four tables in every relational role, including the blocked-by-active-loan path and the atomicity-on-failure path
- `deleteAccountAction` end-to-end: auth failure, mismatched confirmation, blocked, success

### Manual Testing Steps:

1. Sign up a fresh test user, read the privacy notice via the register-page link before signing up
2. Add a book, connect with a second test account as friends, create and approve a loan between them
3. Attempt to delete the account with an open loan — confirm the blocking message
4. Complete the loan's return handshake, then delete the account — confirm success, sign-out, and the `/` confirmation banner
5. As the second test account, confirm the friend connection, loan, and (if applicable) the deleted user's book are all gone from their views

## Performance Considerations

None beyond the transaction itself — cascade volume for a single user (a handful of books/connections/loans) is trivial; no batching or pagination needed.

## Migration Notes

The new `account_deletion_log` table is additive only — no existing data is touched or migrated. No backfill is needed since no accounts have been deleted before this feature exists.

## References

- Related research: `context/changes/gdpr-assessment/research.md`
- Destructive-action pattern: `src/app/(app)/friends/actions.ts:137-158`
- Sign-out: `src/app/_components/sidebar.actions.ts:5-7`
- Public-route allow-list: `src/auth.config.ts:16`
- OR-array delete idiom: `src/server/friend-connection/friend-connection.repository.ts:133-144`
- Migration style reference: `src/migrations/1784146760613-CreateFriendConnectionTable.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data Layer — Cascade Delete & Audit Log

#### Automated

- [x] 1.1 New integration test passes: cascade, blocking, atomicity, audit log — 71a8987
- [x] 1.2 npm test passes — 71a8987
- [x] 1.3 npm run build passes — 71a8987
- [x] 1.4 npm run lint passes — 71a8987

#### Manual

- [x] 1.5 Migration creates `account_deletion_log` table with expected columns — 71a8987

### Phase 2: Server Actions & Auth Wiring

#### Automated

- [x] 2.1 New actions test passes: auth failure, mismatch, blocked, success — 5dae0c3
- [x] 2.2 npm test passes — 5dae0c3
- [x] 2.3 npm run build passes — 5dae0c3
- [x] 2.4 npm run lint passes — 5dae0c3

#### Manual

- [x] 2.5 Mismatched confirmation rejected without deleting anything — 5dae0c3
- [x] 2.6 Correct confirmation deletes the account and ends the session — 5dae0c3
- [x] 2.7 Active-loan account shows the blocking message — 5dae0c3

### Phase 3: UI, Notice Content & Docs

#### Automated

- [x] 3.1 delete-account-form spec passes
- [x] 3.2 sidebar-nav spec passes for new entries
- [x] 3.3 npm test passes
- [x] 3.4 npm run build passes
- [x] 3.5 npm run lint passes

#### Manual

- [x] 3.6 /privacy reachable signed-out from /login and /register
- [x] 3.7 /account reachable signed-in from the sidebar
- [x] 3.8 End-to-end deletion shows the / confirmation banner
- [x] 3.9 /account and /privacy render correctly at mobile width
