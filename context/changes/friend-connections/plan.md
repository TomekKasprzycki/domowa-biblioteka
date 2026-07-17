# Friend Connections (S-02) Implementation Plan

## Overview

Users can invite another registered user (by email) to become a friend, the recipient can accept or reject the invitation, and either side of an accepted connection can remove it. This is the second product slice built on top of the merged auth foundation (F-02), parallel to S-01 (collection-management), and introduces the third entity in the system (`FriendConnectionEntity`) — the first with two relations to the same parent entity (`UserEntity`).

## Current State Analysis

- No `FriendConnection` entity, repository, or `/friends` route exists yet (`src/server/` contains `src/server/user/` and `src/server/book/`).
- `UserEntity` (`src/server/user/user.entity.ts`) has only `id`, `email` (unique), `passwordHash`, `name`, `createdAt`, `updatedAt` — **no `username` field**. FR-005/roadmap S-02 both say "by email or username," but this plan scopes lookup to email only (decided during planning); adding `username` is deferred as its own future slice.
- Auth, session, and route protection are fully wired (F-02, merged): `await auth()` gives `session.user.id` in any Server Component or Server Action; any route not listed in `src/auth.config.ts`'s `publicPaths` is automatically protected by `middleware.ts` — `/friends` needs no config change to be protected.
- The entity/repository/action/UI/test conventions are well established by `BookEntity` / `book.repository.ts` / `collection/actions.ts` / `collection/page.tsx` (S-01, just merged) — this plan follows them exactly, extended for a two-user relation and an invite lifecycle that Book's single-owner CRUD doesn't have.
- Two existing real-DB integration test suites exist (`test/server/book/book.repository.spec.ts`, `test/app/collection/actions.spec.ts`), neither using explicit given/when/then comment structure despite AGENTS.md requiring it — this plan's tests apply the rule strictly (decided during planning), so they will look structurally different from S-01's tests. This divergence is intentional, not an oversight.

### Key Discoveries:

- `src/server/book/book.entity.ts:14-34` — the pattern to copy for a new entity: `@PrimaryColumn({ type: "uuid" })` id (app-generated via `generateId()`, not `@PrimaryGeneratedColumn`), every plain `@Column` with explicit `type:`, and the raw-FK-column + `@ManyToOne`/`@JoinColumn` pair:
  ```ts
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "userId" })
  owner!: UserEntity;
  ```
  `FriendConnectionEntity` needs this pattern **twice** (`requesterId`/`requester` and `addresseeId`/`addressee`), both pointing at `UserEntity` — new territory for this codebase but a mechanical extension of the existing pattern.
- `src/server/book/book.repository.ts:5-43` — plain exported async functions, `getDataSource()` + `ds.getRepository<Entity>("tablename")` string-based lookup, ownership-scoped `WHERE`, `null`-on-no-match for updates, `false`-on-no-match for deletes. `FriendConnectionEntity` has **two** users on a row instead of one owner, so ownership-scoped queries need an `(requesterId = ? OR addresseeId = ?)` shape that doesn't exist anywhere in this codebase yet — this plan introduces a single repository helper (`findConnectionBetween`) that centralizes that OR-query so it isn't duplicated across every read/write path.
- `src/lib/data-source.ts:17` — every entity must be explicitly imported and added to the `entities: [UserEntity, BookEntity]` array; `FriendConnectionEntity` must be added here too. `src/lib/data-source-cli.ts`'s glob needs no change.
- `src/app/collection/actions.ts:23` — the `isDuplicateError` helper (checking `QueryFailedError` + Postgres code `23505`) is the pattern for the friend-invite duplicate case. **It is module-private (no `export`)**, and `src/lib/` has no shared error-util module — so it cannot be imported as-is; see Phase 2 item 1 for how this plan resolves that.
- `src/app/collection/_components/book-row.tsx:42-46` — the `window.confirm()` + `e.preventDefault()`-on-cancel pattern for destructive actions (Book's delete) is reused verbatim for "remove friend."
- `AGENTS.md` — ids are application-generated (`generateId()` from `src/lib/generate-id.utils.ts`, already exists, no new utility needed); one component per file; optional API fields are `T | null` not `T | undefined`.

## Desired End State

A signed-in user can visit `/friends`, send a friend invitation to another registered user by email, see their sent (pending) invitations, see and respond to invitations they've received (accept/reject), see their list of confirmed friends, and remove a confirmed friend. Attempting to invite an email with no matching account, invite themselves, or invite someone they already have a non-rejected connection with is rejected with a friendly message. Inviting someone who has already sent *them* a pending invite auto-resolves as acceptance instead of creating a duplicate row. Re-inviting someone whose invitation was previously rejected succeeds and resets the connection to pending. The nav links to `/friends`.

**Verification**: `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass; manual walkthrough of send/accept/reject/remove/duplicate/self-invite/unknown-email/reverse-pending/re-invite-after-rejection/logged-out-redirect succeeds (see per-phase Manual Verification).

## What We're NOT Doing

- Adding a `username` field to `UserEntity` or supporting invite-by-username — email-only lookup for this slice; the roadmap's "by email or username" wording is only partially satisfied here, by design (see Current State Analysis).
- Canceling a sent (still-pending) invitation — a sender can only wait for the recipient to accept/reject, or let it sit; no cancel action in this slice.
- Any notification (in-app badge/count, email) that a user has a pending invite — PRD non-goal (no push/email notifications in v1); discovery is via visiting `/friends` directly, same gap flagged for S-04/S-05 in the roadmap.
- Blocking or reporting a user — out of scope; "reject" is the only negative signal available.
- Friend suggestions, mutual-friend counts, or any social-graph analytics.
- Browsing or searching friends' collections — that's S-03 (friend-discovery), which depends on this slice's "confirmed friend" state but is a separate plan.
- Soft-delete or history of past friendships — removing a friend is a hard delete of the connection row, matching Book's no-soft-delete precedent.
- Component-level/rendering UI tests — same boundary as S-01; automated coverage stays at the repository and Server Action logic layers, UI behavior covered by manual verification.

## Implementation Approach

Follow the exact `BookEntity` → `book.repository.ts` → Server Action → page/`_components` pattern from S-01, extended for a two-user relation and a three-state lifecycle (pending/accepted/rejected). A single repository function, `findConnectionBetween(userA, userB)`, is the one place that knows how to query a connection regardless of which user was the original requester — every other repository function and the send-invite branching logic in the action layer builds on top of it rather than re-deriving the OR-query.

## Critical Implementation Details

**Stop the dev server before generating the migration**: `src/lib/data-source.ts:15` sets `synchronize: process.env.NODE_ENV === "development"`, and `next dev` sets `NODE_ENV=development` — so a running dev server auto-creates schema on connect. The moment `FriendConnectionEntity` is added to the `entities` array (Phase 1 item 2), the next dev-server request DDL-creates `friend_connections` (FKs and unique constraint included) with no migration involved. `migration:generate` diffs entity metadata against the live DB, and `.env.local`'s `DATABASE_URL` (runtime, pooled) and `DATABASE_URL_UNPOOLED` (CLI) are two Neon endpoints for **the same database** — so if the dev server has touched the DB first, the diff comes back empty, TypeORM exits with "No changes in database schema were found", and no migration file is written. `migration:run` (1.3) then trivially passes against a synchronize-created table and `migration:revert` (1.6) has nothing to revert, while production (`synchronize: false`) would receive the schema with no migration backing it.

Required order for Phase 1: **stop the dev server → write the entity → add it to `data-source.ts` → `npm run migration:generate` → `npm run migration:run` → only then restart `next dev`.** If `migration:generate` reports no changes, that is the symptom of this trap, not a sign the entity is already migrated — drop the auto-created table and regenerate. The jest suites are unaffected (`NODE_ENV=test` ⇒ `synchronize: false`), which is exactly why they depend on the migration having been run for real.

**Send-invite branching**: `sendInviteAction` must call `findConnectionBetween(session.user.id, targetUserId)` *before* attempting to create a row, and branch on what it finds:
- No existing row → create a new one, `status: "pending"`, `requesterId: session.user.id`, `addresseeId: targetUserId`.
- Existing row, `status: "rejected"` → update the same row in place: flip `requesterId`/`addresseeId` to the current direction, set `status: "pending"` (this is the re-invite-after-rejection path; it reuses the row rather than inserting a second one, and flipping direction preserves the row's canonical-pair key, so the pair index is never violated by this path).
- Existing row, `status: "pending"`, and the current actor is the row's `addresseeId` (i.e., the other user invited *them* first) → auto-accept: update `status: "accepted"` in place. This is the reverse-pending-resolves-as-mutual-accept behavior decided during planning.
- Existing row, `status: "pending"`, and the current actor is already the row's `requesterId` → duplicate-invite friendly error, no write.
- Existing row, `status: "accepted"` → "already friends" friendly error, no write.

This branching lives in the repository as a single `sendInvite(requesterId, addresseeId)` function (not split across the action layer) so the action stays a thin auth+validation wrapper, consistent with how `addBookAction` delegates duplicate-detection to the DB constraint — here the equivalent detection is `findConnectionBetween` plus the branch above, run inside `sendInvite`.

**The pair invariant is enforced by a canonical expression index, not by a column-list constraint**: at most one connection may exist per *pair* of users, regardless of who invited whom. A `@Unique(["requesterId", "addresseeId"])` constraint cannot express this — it is unique on the ordered tuple, so `(A,B)` and `(B,A)` are distinct rows and both are permitted. Relying on it would leave the invariant resting entirely on `findConnectionBetween`'s check-then-act, which has a TOCTOU window: if A and B invite each other near-simultaneously, both calls find nothing, both insert, and the DB accepts both. The damage compounds — with two rows present, `findConnectionBetween`'s `findOne` over a symmetric OR has no deterministic ordering, so `sendInvite` branches arbitrarily; the re-invite-after-rejection flip then collides with a genuine `23505`, which Phase 2's defensive catch would report to the user as "You've already sent an invitation to this user" — a misleading message for corrupted state, wedging the pair with no in-app recovery. S-03/S-04 will query this table to make access-control decisions, so duplicate pair rows are not a cosmetic problem.

The unique expression index on `(LEAST(requesterId, addresseeId), GREATEST(requesterId, addresseeId))` (added by hand to the migration, Phase 1 item 3) closes this: the DB rejects the second insert of a pair in either direction, making `findConnectionBetween`'s single-row assumption a guaranteed fact rather than a hope. Direction still varies per row (the flip path stays legal — flipping `(A,B)` to `(B,A)` keeps the same canonical key), which is exactly what the re-invite path needs. With the index in place, a `23505` from `sendInvite` means "the other party inserted concurrently", which the action should surface as the ordinary duplicate/already-friends message after re-reading the row — not as corrupted state.

**Relation loading is mandatory and unverified by the type system**: the three finder functions must pass explicit `relations` in their find options (see Phase 1 item 4 for which relation each one needs). This is the first place in this codebase that loads a TypeORM relation — `BookEntity.owner` is declared but no query has ever used it, so there is no in-repo precedent to copy. TypeORM 1.0.0 does support `relations` and array-of-conditions `where` on the string-keyed `ds.getRepository<T>("tablename")` form this project uses, but nothing here proves it yet. The failure mode is silent: the entity declares `requester!: UserEntity` (non-nullable), so omitting `relations` leaves the property `undefined` at runtime while `tsc --noEmit` still passes — Phase 3's page would throw `TypeError: Cannot read properties of undefined` on first render. Phase 1's repository tests must therefore assert that the relation objects are actually populated (e.g. `expect(result[0].requester.email).toBe(...)`), not merely that rows are returned.

**Ownership-scoped accept/reject**: `updateStatus(id, actingUserId, newStatus)` must scope its `WHERE` to `id = ? AND addresseeId = ?` — only the addressee can accept or reject, never the requester. Return `null` when no row matches (covers "not found" and "not the addressee" identically, same information-hiding rationale as Book's ownership scoping).

**Ownership-scoped remove**: `deleteConnection(id, actingUserId)` must scope to `id = ? AND status = 'accepted' AND (requesterId = ? OR addresseeId = ?)` — either side of an accepted connection can remove it, but a pending or rejected row cannot be removed this way (rejecting/re-inviting are the paths for those states). Return `false` on no match.

## Phase 1: FriendConnection Entity, Migration & Repository

### Overview

Establish the data layer: the `FriendConnection` entity, its migration, and a repository exposing the invite lifecycle (send/accept/reject/remove) plus the shared `findConnectionBetween` query helper.

### Changes Required:

#### 1. FriendConnection entity

**File**: `src/server/friend-connection/friend-connection.entity.ts`

**Intent**: Define the `FriendConnection` entity representing a directed invite that resolves into a symmetric friendship once accepted.

**Contract**: `@Entity("friend_connections")` class `FriendConnectionEntity` with `id` (`@PrimaryColumn({ type: "uuid" })`, populated by `generateId()` in the repository), `requesterId` + `requester` relation, `addresseeId` + `addressee` relation (both following the raw-column + `@ManyToOne`/`@JoinColumn` pattern from `book.entity.ts`, both pointing at `UserEntity`), `status` (`@Column({ type: "varchar" })`, validated as `"pending" | "accepted" | "rejected"` at the application layer via zod, not a DB enum type — consistent with this codebase having no existing Postgres-enum-column precedent), `createdAt`/`updatedAt` (`@CreateDateColumn()`/`@UpdateDateColumn()`).

**No class-level `@Unique(["requesterId", "addresseeId"])`** — an ordered-tuple constraint would permit `(A,B)` and `(B,A)` to coexist, i.e. it fails to enforce the one invariant that matters here (at most one connection per *pair*, regardless of direction). The pair invariant is enforced instead by a unique expression index added by hand to the migration (see item 3 and Critical Implementation Details). Do not add a TypeORM `@Unique`/`@Index` decorator for this — TypeORM cannot express a `LEAST`/`GREATEST` expression index in entity metadata, so declaring a column-list constraint here would only create a second, weaker constraint alongside the real one.

#### 2. Register the entity with the runtime data source

**File**: `src/lib/data-source.ts`

**Intent**: Make the app's TypeORM connection aware of `FriendConnectionEntity` (the CLI data source's glob picks it up automatically for migration generation — no change needed there).

**Contract**: Import `FriendConnectionEntity` from `@/server/friend-connection/friend-connection.entity` and add it to the `entities` array: `entities: [UserEntity, BookEntity, FriendConnectionEntity]`.

#### 3. Migration

**File**: `src/migrations/<generated-timestamp>-CreateFriendConnectionTable.ts`

**Intent**: Create the `friend_connections` table matching the entity above.

**Contract**: **Stop the dev server first** (see Critical Implementation Details — a running `next dev` auto-syncs the schema and silently makes this generation a no-op). Generate via `npm run migration:generate -- src/migrations/CreateFriendConnectionTable` after the entity is written. Review the generated file for two FK constraints on `requesterId`/`addresseeId` → `users.id`, and confirm the `id` column has no DB-side default/generation expression.

Then **hand-add one statement** to the generated migration's `up()` (and its `down()` counterpart) — the canonical-pair unique index that TypeORM cannot express in entity metadata:

```sql
CREATE UNIQUE INDEX "UQ_friend_connections_pair"
  ON "friend_connections" (LEAST("requesterId", "addresseeId"), GREATEST("requesterId", "addresseeId"));
```

This is the sole deliberate exception to the "do not hand-write the SQL" rule, and it is what actually enforces the at-most-one-connection-per-pair invariant (see Critical Implementation Details). Everything else in the file stays as generated. Run `npm run migration:run` after adding it.

#### 4. FriendConnection repository

**File**: `src/server/friend-connection/friend-connection.repository.ts`

**Intent**: Expose the invite lifecycle and the shared symmetric-query helper, following `book.repository.ts`'s plain-function, string-lookup style.

**Contract**:
- `findConnectionBetween(userA: string, userB: string): Promise<FriendConnectionEntity | null>` — `WHERE (requesterId = userA AND addresseeId = userB) OR (requesterId = userB AND addresseeId = userA)`, expressed as TypeORM's array-of-conditions OR (`where: [{...}, {...}]`). The canonicalized-pair helper every other function below builds on; its single-row assumption is guaranteed by the canonical-pair unique index (see Critical Implementation Details), not merely assumed.
- `sendInvite(requesterId: string, addresseeId: string): Promise<{ connection: FriendConnectionEntity; autoAccepted: boolean } | "duplicate" | "already-friends">` — implements the branching in Critical Implementation Details using `findConnectionBetween` internally; generates `id` via `generateId()` only on the no-existing-row path.
- `findPendingReceived(userId: string): Promise<FriendConnectionEntity[]>` — `addresseeId = userId AND status = 'pending'`, ordered by `createdAt` descending. Must load `relations: { requester: true }` — the addressee is always the session user, so only the requester needs resolving (see Relation loading below).
- `findPendingSent(userId: string): Promise<FriendConnectionEntity[]>` — `requesterId = userId AND status = 'pending'`, ordered by `createdAt` descending. Must load `relations: { addressee: true }` — the requester is always the session user.
- `findFriends(userId: string): Promise<FriendConnectionEntity[]>` — `(requesterId = userId OR addresseeId = userId) AND status = 'accepted'`, ordered by `updatedAt` descending. Must load `relations: { requester: true, addressee: true }` — either side can be the session user, so both are needed to resolve "the other user".
- `updateStatus(id: string, actingUserId: string, status: "accepted" | "rejected"): Promise<FriendConnectionEntity | null>` — scoped `WHERE id = ? AND addresseeId = ?`; `null` if no row matched.
- `deleteConnection(id: string, actingUserId: string): Promise<boolean>` — scoped `WHERE id = ? AND status = 'accepted' AND (requesterId = ? OR addresseeId = ?)`; `true` iff a row was removed.

#### 5. Repository tests

**File**: `test/server/friend-connection/friend-connection.repository.spec.ts`

**Intent**: Mirror `book.repository.spec.ts`'s real-DB integration style for the new repository, covering the symmetric-query helper and every branch of `sendInvite`, using explicit given/when/then comment blocks inside each `it` (per AGENTS.md, applied strictly for this new suite — see Current State Analysis).

**Contract**: Use a per-test-run unique fixture (timestamp-suffixed emails, three real users: e.g. `userA`, `userB`, `userC`) cleaned up + `ds.destroy()` in `afterAll`. Cover: `sendInvite` creates a pending row when none exists; `sendInvite` from the addressee's side while a pending row exists auto-accepts (returns `autoAccepted: true`, row status becomes `accepted`); `sendInvite` from the same requester while pending returns `"duplicate"` with no new row; `sendInvite` while already `accepted` returns `"already-friends"`; `sendInvite` after a prior `rejected` row updates the same row back to `pending` with the new direction (assert row count stays at 1, i.e. the direction flip does not collide with the canonical-pair index); `findPendingReceived`/`findPendingSent`/`findFriends` each return the expected rows for the right user and exclude others, **and each asserts its declared relations are populated** (e.g. `findPendingReceived` → `result[0].requester.email` matches the inviting fixture user; `findFriends` → both `requester` and `addressee` resolve) — this is the check that catches the silent-undefined failure described in Critical Implementation Details; `updateStatus` succeeds when `actingUserId` is the addressee and returns `null` when it's the requester or an unrelated user; `deleteConnection` succeeds for either side of an accepted connection and returns `false` for a pending/rejected row or an unrelated user; **a direct `repo.save()` of a second row for an already-connected pair in the reverse direction is rejected by the DB with `23505`** — this is the test that proves the canonical-pair index is actually present and working, bypassing `sendInvite`'s application-level check to hit the constraint directly.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit` (no dedicated typecheck script exists in this project)
- Linting passes: `npm run lint`
- Migration file was actually generated: a new `src/migrations/<timestamp>-CreateFriendConnectionTable.ts` exists on disk (guards against the synchronize no-op described in Critical Implementation Details)
- Migration applies cleanly: `npm run migration:run`
- Repository tests pass: `npm test -- friend-connection.repository`

#### Manual Verification:

- Inspect the `friend_connections` table via the Neon console (or `psql`) after `migration:run` and confirm columns, both FKs to `users`, and the `UQ_friend_connections_pair` canonical expression index are all present (`\d friend_connections`)
- Confirm `npm run migration:revert` cleanly drops the table (rollback works)

---

## Phase 2: Server Actions

### Overview

Wire `sendInviteAction`, `acceptInviteAction`, `rejectInviteAction`, and `removeFriendAction` on top of the repository, with validation, session/auth checks, and friendly error messages for every branch decided in Phase 1.

### Changes Required:

#### 1. Extract the duplicate-error helper to a shared module

**Files**: `src/lib/db-error.utils.ts` (new), `src/app/collection/actions.ts` (modified), `test/lib/db-error.utils.spec.ts` (new)

**Intent**: `isDuplicateError` is currently module-private in `collection/actions.ts:23` and this slice needs the same Postgres-`23505` check. Extract it once rather than copy it, so the two features can't drift apart on how they detect a unique-constraint violation.

**Contract**: Move the existing function verbatim into `src/lib/db-error.utils.ts` as `export function isDuplicateError(error: unknown): boolean` (naming follows the `<function-name>.utils.ts` convention set by `generate-id.utils.ts`). Update `collection/actions.ts` to import it and delete its local copy — no behavior change, its two existing call sites (lines 65, 121) stay as-is. This is the only edit this plan makes to S-01 code; `npm test -- collection/actions` must still pass unchanged as the regression check. Add a spec per the project's every-exported-function rule, covering: a `QueryFailedError` with code `23505` → `true`; a `QueryFailedError` with a different code → `false`; a non-`QueryFailedError` → `false`.

#### 2. Friend connection Server Actions

**File**: `src/app/friends/actions.ts`

**Intent**: Provide the four mutating actions the UI will call, following `collection/actions.ts`'s validation + error-handling shape.

**Contract**:
- Module-level zod schema: `emailSchema` (string, trim, valid email format) for `sendInviteAction`'s form field; `connectionIdSchema = z.string().uuid()` for the id field read by `acceptInviteAction`/`rejectInviteAction`/`removeFriendAction` (same rationale as Book's `bookIdSchema` — Server Actions are directly reachable POST endpoints, a malformed id must not reach the repository).
- Shared message constants: `NOT_FOUND_MESSAGE`, `UNKNOWN_EMAIL_MESSAGE` ("No user found with that email."), `SELF_INVITE_MESSAGE` ("You can't invite yourself."), `DUPLICATE_MESSAGE` ("You've already sent an invitation to this user."), `ALREADY_FRIENDS_MESSAGE` ("You're already friends with this user.").
- All four actions call `revalidatePath("/friends")` immediately after a successful mutation, before returning `null` (same Router Cache rationale documented in `collection/actions.ts`).
- `sendInviteAction(prevState: string | null, formData: FormData): Promise<string | null>` — `auth()` for `session.user.id`; parse `email` field; look up the target user via `findByEmail` (from `@/server/user/user.repository`) → `UNKNOWN_EMAIL_MESSAGE` if not found; if the found user's `id === session.user.id` → `SELF_INVITE_MESSAGE`; otherwise call `sendInvite(session.user.id, targetUser.id)` and map its return value (`"duplicate"` → `DUPLICATE_MESSAGE`, `"already-friends"` → `ALREADY_FRIENDS_MESSAGE`, object → success); catch `QueryFailedError` code `23505` from the canonical-pair index — this means the other party inserted concurrently between our `findConnectionBetween` check and our write (the TOCTOU window described in Critical Implementation Details), so re-read via `findConnectionBetween` and map the now-existing row to `DUPLICATE_MESSAGE` or `ALREADY_FRIENDS_MESSAGE` by its status rather than reporting a generic duplicate; on success, `revalidatePath("/friends")` then return `null`.
- `acceptInviteAction(prevState: string | null, formData: FormData): Promise<string | null>` and `rejectInviteAction(prevState: string | null, formData: FormData): Promise<string | null>` — required `connectionId` field validated with `connectionIdSchema`; call `updateStatus(connectionId, session.user.id, "accepted" | "rejected")`; `null` result → `NOT_FOUND_MESSAGE`; on success, `revalidatePath("/friends")` then return `null`.
- `removeFriendAction(prevState: string | null, formData: FormData): Promise<string | null>` — required `connectionId` field, validated the same way; call `deleteConnection(connectionId, session.user.id)`; `false` result → `NOT_FOUND_MESSAGE`; on success, `revalidatePath("/friends")` then return `null`.

#### 3. Server Action tests

**File**: `test/app/friends/actions.spec.ts`

**Intent**: Cover validation, auth, self-invite, unknown-email, duplicate, reverse-pending auto-accept, re-invite-after-rejection, ownership-scoped accept/reject/remove — real DB, only `@/auth` and `next/cache`'s `revalidatePath` mocked (same as `collection/actions.spec.ts`), given/when/then comment blocks inside each `it`.

**Contract**: `jest.mock("@/auth", () => ({ auth: jest.fn() }))`, `jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))`, fixed fake `session.user.id` per test via the mock's return value, timestamp-suffixed fixture users. Cover: valid send creates a pending row (verify via `findPendingSent`/`findPendingReceived`); send to an unknown email returns `UNKNOWN_EMAIL_MESSAGE` without touching the DB; send to self returns `SELF_INVITE_MESSAGE`; send while a pending invite already exists in the same direction returns `DUPLICATE_MESSAGE`; send in the reverse direction of an existing pending invite auto-accepts (row status becomes `accepted`, action returns `null`); send after a prior rejection succeeds and resets status to `pending`; accept/reject succeed only when the mock session's `userId` is the row's addressee, and return `NOT_FOUND_MESSAGE` otherwise; remove succeeds for either side of an accepted connection and returns `NOT_FOUND_MESSAGE` for a pending/rejected row or an unrelated user. Clean up created rows in `afterAll`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Shared helper tests pass: `npm test -- db-error.utils`
- S-01 regression after the extract: `npm test -- collection/actions`
- Action tests pass: `npm test -- friends/actions`

#### Manual Verification:

- After running the action tests, inspect the DB directly (Neon console/`psql`) to confirm created/updated/deleted rows match expectations
- Manually invoke `acceptInviteAction`/`rejectInviteAction`/`removeFriendAction` with a `userId` that isn't a party to the target connection (e.g. via a scratch script) and confirm `NOT_FOUND_MESSAGE` is returned and no row is mutated

---

## Phase 3: Friends Page UI & Navigation

### Overview

Build the `/friends` page: send-invite form, received pending invites with accept/reject, sent pending invites (read-only), and confirmed friends list with remove — and link it from the nav.

### Changes Required:

#### 1. Friends page

**File**: `src/app/friends/page.tsx`

**Intent**: Server component that loads the signed-in user's pending-received, pending-sent, and confirmed-friend connections, and renders the send form + three sections, mirroring `collection/page.tsx`'s server/client split.

**Contract**: `await auth()` for the session; fetch via `findPendingReceived`, `findPendingSent`, `findFriends` (all scoped to `session.user.id`); for each list, resolve "the other user" (requester or addressee, whichever isn't the current user) via the loaded `requester`/`addressee` relations and map to a plain object — e.g. `{ id: connection.id, otherUser: { email: otherUser.email, name: otherUser.name }, createdAt: connection.createdAt }` — before passing to Client Components (TypeORM entities are class instances and cannot cross the Server→Client boundary as props, same constraint as Book). Sent-pending invites render directly in this server component as a plain read-only list (no interactivity, so no client component needed for that section). Renders `<SendInviteForm />`, `<ReceivedInvitesList invites={...} />`, and `<FriendsList friends={...} />`.

#### 2. Send-invite form

**File**: `src/app/friends/_components/send-invite-form.tsx`

**Intent**: Client component for the send flow, matching `add-book-form.tsx`'s `useActionState` wiring.

**Contract**: `useActionState(sendInviteAction, null)`; single `email` field (required); submit disabled while pending; error rendered as `<p role="alert">`.

#### 3. Received invites list + row

**Files**: `src/app/friends/_components/received-invites-list.tsx`, `src/app/friends/_components/received-invite-row.tsx` (split per this project's one-component-per-file convention, matching `book-list.tsx`/`book-row.tsx`).

**Intent**: Client components rendering invites the signed-in user has received, each with Accept/Reject controls.

**Contract**: `received-invites-list.tsx` exports `type ReceivedInvite = { id: string; otherUser: { email: string; name: string }; createdAt: Date }` and `ReceivedInvitesList({ invites: ReceivedInvite[] })`, rendering each as `ReceivedInviteRow`. `ReceivedInviteRow` renders two independent `useActionState` forms (`acceptInviteAction`, `rejectInviteAction`), each with a hidden `connectionId` input — no `window.confirm()` needed for accept/reject (non-destructive, reversible via the other action or a later remove).

#### 4. Friends list + row

**Files**: `src/app/friends/_components/friends-list.tsx`, `src/app/friends/_components/friend-row.tsx`.

**Intent**: Client components rendering confirmed friends, each with a Remove control gated by confirmation.

**Contract**: `friends-list.tsx` exports `type Friend = { id: string; otherUser: { email: string; name: string }; createdAt: Date }` (`id` is the connection id, used for removal) and `FriendsList({ friends: Friend[] })`, rendering each as `FriendRow`. `FriendRow`'s Remove button is gated by `window.confirm(...)` before submitting a `useActionState(removeFriendAction, null)` form with hidden `connectionId` — identical pattern to `book-row.tsx`'s delete gating.

#### 5. Navigation link

**File**: `src/app/_components/nav.tsx`

**Intent**: Give signed-in users a way to reach `/friends` from anywhere.

**Contract**: Add a "Friends" link to `/friends` in the authenticated branch, alongside the existing "Collection" link and sign-out control.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- Sign in as user A, click the nav "Friends" link, land on `/friends`
- Send an invite to user B's email; it appears in "Sent" immediately without a manual refresh
- Sign in as user B, see the invite from A in "Received"; accept it; confirm it now appears in both users' "Friends" list and no longer in either's pending sections
- As user B, reject a separate invite from a third user C; confirm it disappears from B's "Received" and does not appear in either user's "Friends" list
- As user C, re-invite user B (whose invite B just rejected); confirm the invite succeeds and appears in B's "Received" again
- As user A, attempt to invite an email with no registered account; see `UNKNOWN_EMAIL_MESSAGE`
- As user A, attempt to invite themselves; see `SELF_INVITE_MESSAGE`
- As user A, attempt to invite user B again while already friends; see `ALREADY_FRIENDS_MESSAGE`
- As user D, invite user E who has *not yet* invited D back — then as E, invite D back before responding; confirm this auto-resolves to an accepted friendship (reverse-pending auto-accept) rather than creating a second pending row
- As user A, remove friend B from the Friends list (confirm the `window.confirm()` gate), confirm the connection disappears from both users' Friends lists
- Sign out and navigate directly to `/friends`; confirm redirect to `/login`

---

## Testing Strategy

### Unit Tests:

- None distinct from the integration tests below — matches this project's existing test style; only `@/auth` and `next/cache` are mocked, never the DB.

### Integration Tests:

- `test/server/friend-connection/friend-connection.repository.spec.ts` (Phase 1) — `sendInvite` branching (create/auto-accept/duplicate/already-friends/re-invite-after-rejection), `findConnectionBetween`, `findPendingReceived`/`findPendingSent`/`findFriends`, ownership-scoped `updateStatus`/`deleteConnection`, against the real DB.
- `test/app/friends/actions.spec.ts` (Phase 2) — validation, auth, self-invite, unknown-email, duplicate, reverse-pending auto-accept, re-invite-after-rejection, ownership-scoped accept/reject/remove, real DB + mocked session.

### Manual Testing Steps:

1. Full send → accept walkthrough with two real accounts (see Phase 3 Manual Verification).
2. Reject + re-invite-after-rejection walkthrough with a third account.
3. Reverse-pending auto-accept walkthrough with a fourth/fifth account pair.
4. Self-invite and unknown-email rejection.
5. Already-friends duplicate rejection.
6. Remove-friend walkthrough, confirming both users' lists update.
7. Logged-out redirect from `/friends`.

## Performance Considerations

None beyond what's already in place — target data volume is small (PRD `target_scale`), and every repository query here is a single indexed-by-FK (or FK-pair) query with no pagination needed at this scale.

## Migration Notes

This migration only creates a new table (`friend_connections`) with two FKs to the existing `users` table — no existing data to migrate or backfill.

## References

- Prior pattern: `src/server/book/book.entity.ts`, `src/server/book/book.repository.ts`, `src/app/collection/actions.ts`, `src/app/collection/page.tsx`, `src/app/collection/_components/*`
- Roadmap: `context/foundation/roadmap.md` (S-02)
- PRD: `context/foundation/prd.md` (FR-005, FR-006)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: FriendConnection Entity, Migration & Repository

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 417be88
- [x] 1.2 Linting passes: `npm run lint` — 417be88
- [x] 1.3 Migration file was actually generated on disk — 417be88
- [x] 1.4 Migration applies cleanly: `npm run migration:run` — 417be88
- [x] 1.5 Repository tests pass: `npm test -- friend-connection.repository` — 417be88

#### Manual

- [x] 1.6 Inspect the `friend_connections` table schema/constraints via Neon console/psql — 417be88
- [x] 1.7 Confirm `npm run migration:revert` cleanly drops the table — 417be88

### Phase 2: Server Actions

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit` — 3bdaf45
- [x] 2.2 Linting passes: `npm run lint` — 3bdaf45
- [x] 2.3 Shared helper tests pass: `npm test -- db-error.utils` — 3bdaf45
- [x] 2.4 S-01 regression after the extract: `npm test -- collection/actions` — 3bdaf45
- [x] 2.5 Action tests pass: `npm test -- friends/actions` — 3bdaf45

#### Manual

- [x] 2.6 Inspect DB state after action tests to confirm created/updated/deleted rows — 3bdaf45
- [x] 2.7 Confirm ownership-scoped accept/reject/remove reject an unrelated user via scratch-script check — 3bdaf45

### Phase 3: Friends Page UI & Navigation

#### Automated

- [x] 3.1 Type checking passes: `npx tsc --noEmit` — f95267c
- [x] 3.2 Linting passes: `npm run lint` — f95267c

#### Manual

- [x] 3.3 Nav link reaches `/friends` — f95267c
- [x] 3.4 Send invite appears immediately in Sent — f95267c
- [x] 3.5 Accept moves connection into both users' Friends lists — f95267c
- [x] 3.6 Reject removes it from Received with no Friends entry — f95267c
- [x] 3.7 Re-invite after rejection succeeds and reappears in Received — f95267c
- [x] 3.8 Unknown-email invite rejected with friendly message — f95267c
- [x] 3.9 Self-invite rejected with friendly message — f95267c
- [x] 3.10 Already-friends duplicate invite rejected with friendly message — f95267c
- [x] 3.11 Reverse-pending invite auto-accepts instead of creating a duplicate — f95267c
- [x] 3.12 Remove friend (with confirm) updates both users' Friends lists — f95267c
- [x] 3.13 Logged-out redirect from `/friends` to `/login` — f95267c
