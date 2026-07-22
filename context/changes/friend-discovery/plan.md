# Friend Discovery (S-03) Implementation Plan

## Overview

A signed-in user can browse and search, by title or author, a single merged list of books belonging to all their confirmed friends — reachable via a new "Discover" nav link, or a per-friend deep link from the existing `/friends` page. This is the third product slice, building on `BookEntity` (S-01) and `FriendConnectionEntity` (S-02), and the first to query across two entities for a read-only, no-mutation feature (no Server Actions in this slice — pure browse/search).

## Current State Analysis

- `BookEntity` (`src/server/book/book.entity.ts:16-41`) has no availability/status field, and no Loan/borrow entity exists anywhere in the codebase — that's introduced in S-04, which depends on this slice. The roadmap's stated Outcome for S-03 mentions "availability (available / borrowed by whom)," but building real tracking now would be scope creep into S-04's territory (decided during planning — see Key Discoveries).
- `book.repository.ts` only has single-owner queries (`findByUserId`); there is no function that fetches books across multiple owners.
- `friend-connection.repository.ts` has `findConnectionBetween` (OR-query, both directions) and `findFriends` (all confirmed connections for one user, both relations loaded) — but no single-boolean "is X a confirmed friend of Y" helper, and no function that reduces a user's confirmed connections down to just the other side's `{id, name, email}`.
- `src/app/friends/friends.types.ts`'s `Friend` type only carries `otherUser: { email, name }` — missing the counterpart user's `id`, which this slice's deep link needs.
- There is no search/filter UI pattern anywhere in `src/` yet (`BookList`'s only client state is an `editingId` toggle) — this slice introduces client-side list filtering for the first time.
- `redirect()` from `next/navigation` has zero existing call sites in this codebase.
- Next 15's `searchParams: Promise<{...}>` Server Component prop pattern is established once, at `src/app/login/page.tsx:3-8`.

### Key Discoveries:

- `src/server/book/book.repository.ts:17-21` (`findByUserId`) is the shape to mirror for the new `findByOwnerIds` — same `ds.getRepository<BookEntity>("books")` string-lookup style, same plain-function convention.
- `src/server/friend-connection/friend-connection.repository.ts:85-98` (`findFriends`) is the base every new friend-connection helper in this slice builds on — both `isConfirmedFriend` and `findFriendUsers` reuse `findConnectionBetween`/`findFriends` rather than re-deriving the OR-query.
- `src/app/friends/page.tsx:12-19` has a private `otherUserOf` helper, not exported — the new repository functions re-derive the same "other side of the connection" logic once, correctly, at the data layer, rather than importing across page files.
- TypeORM 1.0.0's `In()` operator degrades an empty array to a safe `0=1` predicate (`node_modules/typeorm/query-builder/QueryBuilder.js:765-768`) — it does not throw, confirmed by reading the installed package directly.
- Two existing test fixtures (`test/app/friends/_components/friend-row.spec.tsx`, `friends-list.spec.tsx`) construct `Friend.otherUser` without an `id` and will fail to typecheck the moment `id` is added to the type — must be updated in the same phase as the type change.
- `src/middleware.ts`'s matcher already protects all non-static routes, so the new `/discover` route needs no middleware change.

## Desired End State

A signed-in user clicks "Discover" in the nav (or "View collection" on a friend row in `/friends`) and lands on `/discover`, seeing every book owned by any of their confirmed friends, each tagged with its owner's name and a static "Available" badge. A single search box filters this list live, by title or author, across all friends at once. An optional friend filter (seeded from the `/friends` deep link, still editable) narrows the list to one friend. Visiting `/discover?friend=<id>` for someone who is not a confirmed friend redirects to `/friends` with a "You're not connected with that user" banner.

**Verification**: `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass; manual walkthrough of nav-discover / search-by-title / search-by-author / friend-filter / deep-link / invalid-friend-redirect / logged-out-redirect succeeds (see per-phase Manual Verification).

## What We're NOT Doing

- No borrow/request action, no Loan entity, no real availability tracking — availability is a static "Available" stub with no backing data field; S-04 replaces this.
- No full-text search engine or server-side query filtering — client-side filter over a server-fetched, bounded set (confirmed sufficient by the roadmap's own "150+ books... not needed for MVP" unknown).
- No pagination.
- No toast/notification infrastructure beyond the one `?notice=` query-param banner this slice adds to `/friends`.
- No per-friend dedicated page/route — the primary interaction is the unified cross-friend view; the friend deep link only pre-scopes a filter on the same page (decided during planning).
- Not fixing the stale `status` fields in S-01/S-02's `change.md` (both slices are actually merged to `master` already) — unrelated cleanup, out of scope here.

## Implementation Approach

Add two narrowly-scoped repository functions (one per entity, no new entity/migration), fix a data-shape gap in the existing `Friend` type, then build the new `/discover` route as a Server Component → plain-object-mapping → Client Component (matching `collection`/`friends`), with all filtering as client-side React state — the first search/filter UI in this codebase. Wire the `/friends` page as the entry point via a per-friend deep link and a lightweight, non-persistent notice banner for the one access-denial case.

## Critical Implementation Details

**The `Friend` type is missing the counterpart user id.** `src/app/friends/friends.types.ts:7-10`'s `otherUser` only carries `{ email, name }`. Phase 1 must add `id` and update `friends/page.tsx`'s mapping, or Phase 3's "View collection" link has no user id to build `/discover?friend=<id>` from. Two existing test fixtures (`friend-row.spec.tsx`, `friends-list.spec.tsx`) construct `otherUser` without `id` and must be updated in the same phase to stay green — this is real, otherwise-silent cross-phase breakage if the type change and its fixture updates land in different phases.

**`searchParams` is a Promise in Next 15 Server Components.** Both `/discover/page.tsx` (new) and `/friends/page.tsx` (modified) need a `searchParams: Promise<{...}>` prop and an `await searchParams` inside the function body. `src/app/login/page.tsx:3-8` is the only existing precedent — follow that exact shape.

**`redirect()` is new to this codebase.** Zero existing call sites (the only `redirect` hits are Auth.js's unrelated `redirectTo` option). Call it inside `/discover/page.tsx` before any book fetch, once the supplied `friend` param fails the confirmed-friend membership check. `redirect()` throws internally as Next's control-flow signal — nothing after the call executes, and nothing before the check should assume the `friend` param is valid.

**Validate the `friend` param against the already-fetched friend list, never by querying it directly.** `requesterId`/`addresseeId` are `uuid` columns (`friend-connection.entity.ts`), so passing a raw, user-supplied `friend` string into `isConfirmedFriend` → `findConnectionBetween` runs `WHERE addresseeId = '<raw>'` against a uuid column — a malformed non-uuid value (guessed or tampered URL) makes Postgres raise `invalid input syntax for type uuid`, a 500, not the redirect Phase 3 promises. The page already fetches `findFriendUsers(session.user.id)`; gate the deep link with `friends.some(f => f.id === friendParam)` on that in-memory list. A non-matching or malformed value simply fails the membership test and redirects cleanly, and this avoids a redundant DB round-trip. (`isConfirmedFriend` still exists for S-04 — it is just not the page's gate here.)

**`In()` on an empty array degrades safely, it does not throw.** Verified directly in this project's pinned `typeorm@1.0.0` (`node_modules/typeorm/query-builder/QueryBuilder.js:765-768`) — an empty `In([])` becomes a `0=1` predicate. `findByOwnerIds`'s `if (ownerIds.length === 0) return [];` short-circuit is a round-trip-avoidance optimization for a user with zero confirmed friends, not a correctness workaround — its test should assert the `[]` return, not "it doesn't throw."

## Phase 1: Repository Layer & Friend Type Fix

### Overview

Add the two new repository functions this slice needs, and fix the `Friend` type gap that would otherwise silently break Phase 3's deep link.

### Changes Required:

#### 1. Cross-owner book lookup

**File**: `src/server/book/book.repository.ts`

**Intent**: Fetch every book belonging to any of a given set of owners (a user's confirmed friends), with the owner relation loaded for display.

**Contract**: `findByOwnerIds(ownerIds: string[]): Promise<BookEntity[]>` — `where: { userId: In(ownerIds) }`, `relations: { owner: true }`, `order: { title: "ASC" }`. Short-circuit `if (ownerIds.length === 0) return [];` before querying (see Critical Implementation Details).

#### 2. Confirmed-friend helpers

**File**: `src/server/friend-connection/friend-connection.repository.ts`

**Intent**: Provide the access-control gate check and the "confirmed friends as plain users" projection the new page needs, without duplicating `findConnectionBetween`'s OR-query or `findFriends`' relation-loading.

**Contract**:
- `isConfirmedFriend(userA: string, userB: string): Promise<boolean>` — built on `findConnectionBetween`, true iff a row exists with `status === "accepted"`. **S-04 groundwork**: this slice's `/discover` page does NOT call it (it derives friend membership from the already-fetched `findFriendUsers` list — see Phase 2 and the access-gate note in Critical Implementation Details); it is added here because S-04's borrow-request access gate needs a single-pair confirmed-friend check, and it is the natural home for that logic. Still ships with its own spec this slice.
- `findFriendUsers(userId: string): Promise<{ id: string; name: string; email: string }[]>` — built on `findFriends(userId)`, mapping each connection to whichever side (`requester`/`addressee`) isn't `userId`.

#### 3. `Friend` type gap fix

**Files**: `src/app/friends/friends.types.ts`, `src/app/friends/page.tsx`

**Intent**: Add the counterpart user's `id` to the `Friend` type so Phase 3's deep link has something to link to.

**Contract**: Add `id: string` to `Friend["otherUser"]` (alongside existing `email`, `name`). Update `page.tsx`'s `plainFriends` mapping to include `other.id`. `ReceivedInvite` (a separate type) is untouched.

#### 4. Fix now-broken test fixtures

**Files**: `test/app/friends/_components/friend-row.spec.tsx`, `test/app/friends/_components/friends-list.spec.tsx`

**Intent**: Keep these specs typechecking and passing after the `Friend.otherUser` shape change.

**Contract**: Add an `id` field to each fixture's `otherUser` object.

#### 5. Repository tests

**Files**: `test/server/book/book.repository.spec.ts` (extended), `test/server/friend-connection/friend-connection.repository.spec.ts` (extended)

**Intent**: Cover the new functions with the same real-DB integration style already used in these files (no mocking, `getDataSource()`, fixture users, `afterAll` cleanup, given/when/then).

**Contract**: `findByOwnerIds` — returns books from multiple owners with `owner` relation populated; excludes books from owners outside the given list; returns `[]` for an empty array without querying. `isConfirmedFriend` — `true` only for an accepted connection in either direction, `false` for pending/rejected/no-connection. `findFriendUsers` — returns the correct other-user shape for each confirmed friend, excludes non-confirmed connections.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Book repository tests pass: `npm test -- book.repository`
- Friend-connection repository tests pass: `npm test -- friend-connection.repository`
- Friends component tests still pass after the fixture fix: `npm test -- friends`

#### Manual Verification:

- None — backend-only phase, no user-facing surface yet. Covered entirely by automated verification.

---

## Phase 2: `/discover` Page, Components & Nav

### Overview

Build the new `/discover` route: server-side data fetch and access-gate check, client-side live search and friend filter, read-only book rows, and the nav entry point.

### Changes Required:

#### 1. Discover types

**File**: `src/app/discover/discover.types.ts`

**Intent**: Define the plain-object shape passed from the server page to client components, kept in its own file from the start (per `lessons.md` — don't repeat `collection`'s inline-type debt).

**Contract**: `DiscoverBook = { id: string; title: string; author: string; notes: string | null; createdAt: Date; owner: { id: string; name: string; email: string } }`.

#### 2. Discover page

**File**: `src/app/discover/page.tsx`

**Intent**: Server Component that resolves the signed-in user's confirmed friends, validates an optional `friend` deep-link param, fetches the merged book list, and hands off to the client search component.

**Contract**: `searchParams: Promise<{ friend?: string }>` prop, `await searchParams` (Login page's pattern). `await auth()`; defensive `if (!session?.user) return null;` (matches `collection`/`friends`). Fetch `findFriendUsers(session.user.id)`. If `friend` param present, validate it against the fetched list — `const isFriend = friends.some(f => f.id === friendParam)` — and `redirect("/friends?notice=not-a-friend")` when it fails, before any book fetch. This in-memory check (not a `isConfirmedFriend` DB call) is deliberate: it avoids crashing on a malformed non-uuid param and skips a redundant query (see Critical Implementation Details). Fetch `findByOwnerIds(friends.map(f => f.id))`, map to `DiscoverBook[]`. Render `<DiscoverSearch books={...} friends={...} initialFriendId={valid friend id or null} />`.

#### 3. Search + filter (client)

**File**: `src/app/discover/_components/discover-search.tsx`

**Intent**: Own the live search and friend-filter state; this is the first search/filter client component in the codebase.

**Contract**: `"use client"`. `useState` for `query` (text, filters live on every keystroke — no submit gating) and `friendFilter` (string | null, seeded from `initialFriendId`, changeable via a `<select>` of "All friends" + each friend's name). A book matches when its title or author case-insensitively includes `query`, AND (no `friendFilter` OR `book.owner.id === friendFilter`). Renders `<DiscoverBookRow>` per match; an empty-state message when the friend list itself is empty, and a distinct one when filters produce zero matches.

#### 4. Book row (read-only)

**File**: `src/app/discover/_components/discover-book-row.tsx`

**Intent**: Display one book from a friend's collection — no owner-only actions (edit/delete) and no borrow action (that's S-04).

**Contract**: Renders title, author, notes (if present), owner name, and a static "Available" badge/text — no data field backs it, it's always rendered.

#### 5. Nav link

**File**: `src/app/_components/nav.tsx`

**Intent**: Give signed-in users a way to reach `/discover`.

**Contract**: Add a "Discover" link to `/discover` in the authenticated branch, ordered Collection → Discover → Friends.

#### 6. Component & page tests

**Files**: `test/app/discover/_components/discover-search.spec.tsx`, `test/app/discover/_components/discover-book-row.spec.tsx`, `test/app/discover/page.spec.tsx`, extended `test/app/_components/nav.spec.tsx`

**Intent**: Cover the new filtering logic directly, and — since this page has real conditional/redirect logic for the first time in this codebase — cover the page's access-gate wiring with a dedicated spec (decided during planning) rather than relying only on the repository-layer coverage.

**Contract**: `discover-search.spec.tsx` — typing filters by title; typing filters by author; selecting a friend narrows further; clearing search/filter restores the full list. `discover-book-row.spec.tsx` — renders title/author/owner/"Available". `page.spec.tsx` (new precedent — mock `@/auth`, `findFriendUsers`, `findByOwnerIds`, and `next/navigation`'s `redirect`; no `isConfirmedFriend` mock needed since the page gates on the fetched list) — renders books for confirmed friends when no `friend` param; redirects to `/friends?notice=not-a-friend` when the `friend` param is absent from the mocked `findFriendUsers` result (cover both a valid-uuid-non-friend and a malformed non-uuid value — both must redirect, not throw); pre-scopes correctly when the param matches a friend. `nav.spec.tsx` — assert the "Discover" link appears for a signed-in user.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Discover tests pass: `npm test -- discover`
- Nav tests pass: `npm test -- nav`

#### Manual Verification:

- Sign in, click "Discover" in nav, land on `/discover`, see all confirmed friends' books with owner names and "Available" badges
- Type a title fragment in the search box — results narrow live, across all friends
- Type an author fragment — same
- Select a specific friend in the filter — results narrow to just their books
- Clear search and filter — full list returns
- A user with zero confirmed friends sees an empty state, not a crash

---

## Phase 3: `/friends` Deep Link & Access-Denial Banner

### Overview

Wire the entry point from `/friends` into `/discover`, and close the loop on the access-control redirect with a visible, non-persistent banner.

### Changes Required:

#### 1. "View collection" link

**File**: `src/app/friends/_components/friend-row.tsx`

**Intent**: Let a user jump from a specific friend in their friends list straight into that friend's books.

**Contract**: Add a link to `/discover?friend=${friend.otherUser.id}` next to the existing Remove control.

#### 2. Notice banner

**File**: `src/app/friends/page.tsx`

**Intent**: Surface the access-denial redirect's reason to the user, without introducing general toast infrastructure.

**Contract**: Add a `searchParams: Promise<{ notice?: string }>` prop, `await` it. If `notice === "not-a-friend"`, render a banner near the top of the page (e.g. `role="alert"`, "You're not connected with that user."). A single `if` check, not a lookup table — this slice has exactly one notice case.

#### 3. Tests

**Files**: extended `test/app/friends/_components/friend-row.spec.tsx`, new `test/app/friends/page.spec.tsx`

**Intent**: Cover the new link and the banner's conditional rendering, reusing Phase 2's page-spec pattern (now established, not a fresh one).

**Contract**: `friend-row.spec.tsx` — the "View collection" link's `href` includes `friend.otherUser.id`. `friends/page.spec.tsx` (mock `@/auth`, `findPendingReceived`, `findPendingSent`, `findFriends`) — renders the banner when `notice=not-a-friend` is present in `searchParams`; renders no banner when absent.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Friends tests pass: `npm test -- friends`

#### Manual Verification:

- From `/friends`, click "View collection" on a confirmed friend — land on `/discover` pre-scoped to just their books, with the friend filter showing their name
- Manually navigate to `/discover?friend=<a-non-friend-uuid>` (e.g. a pending-invite user's id, or any random uuid) — confirm redirect to `/friends` with the "not connected" banner, and no crash on a malformed non-uuid value either
- Plain navigation to `/friends` (no `notice` param) shows no banner — it's not sticky across normal visits
- Sign out and navigate directly to `/discover`; confirm redirect to `/login`

---

## Testing Strategy

### Unit Tests:

- None distinct from the integration/component tests below — matches this project's existing test style.

### Integration Tests:

- `test/server/book/book.repository.spec.ts` (Phase 1, extended) — `findByOwnerIds` against the real DB.
- `test/server/friend-connection/friend-connection.repository.spec.ts` (Phase 1, extended) — `isConfirmedFriend`, `findFriendUsers` against the real DB.
- `test/app/discover/page.spec.tsx` (Phase 2, new) — access-gate redirect and data-fetch wiring, mocked auth/repositories.
- `test/app/friends/page.spec.tsx` (Phase 3, new) — notice-banner conditional rendering, mocked auth/repositories.

### Manual Testing Steps:

1. Nav → Discover → see merged cross-friend book list with owner names and "Available" badges.
2. Search by title fragment, then by author fragment — live filtering narrows correctly across all friends.
3. Friend-filter dropdown narrows to one friend; clearing it restores the full list.
4. From `/friends`, "View collection" deep link lands pre-scoped to the right friend.
5. Manually crafted `/discover?friend=<non-friend-id>` redirects to `/friends` with the notice banner; a plain `/friends` visit shows no banner.
6. Zero-confirmed-friends account sees an empty state on `/discover`, not a crash.
7. Logged-out visit to `/discover` redirects to `/login`.

## Performance Considerations

Client-side filtering over a server-fetched, bounded set — target scale is small (PRD `target_scale`, roadmap's own "150+ books... not needed for MVP" unknown) — no pagination or server-side query needed at this scale.

## Migration Notes

No schema changes — this slice adds no entity and no migration, only new repository functions over existing tables.

## References

- Prior pattern: `src/server/book/book.repository.ts`, `src/server/friend-connection/friend-connection.repository.ts`, `src/app/collection/page.tsx`, `src/app/friends/page.tsx`, `src/app/friends/_components/*`
- Roadmap: `context/foundation/roadmap.md` (S-03)
- PRD: `context/foundation/prd.md` (FR-007, US-01)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Repository Layer & Friend Type Fix

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 2aedb1f
- [x] 1.2 Linting passes: `npm run lint` — 2aedb1f
- [x] 1.3 Book repository tests pass: `npm test -- book.repository` — 2aedb1f
- [x] 1.4 Friend-connection repository tests pass: `npm test -- friend-connection.repository` — 2aedb1f
- [x] 1.5 Friends component tests still pass after the fixture fix: `npm test -- friends` — 2aedb1f

### Phase 2: `/discover` Page, Components & Nav

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit`
- [x] 2.2 Linting passes: `npm run lint`
- [x] 2.3 Discover tests pass: `npm test -- discover`
- [x] 2.4 Nav tests pass: `npm test -- nav`

#### Manual

- [x] 2.5 Nav "Discover" link reaches `/discover` with all confirmed friends' books, owner names, and "Available" badges
- [x] 2.6 Search by title fragment narrows results live across all friends
- [x] 2.7 Search by author fragment narrows results live across all friends
- [x] 2.8 Friend filter narrows to one friend
- [x] 2.9 Clearing search and filter restores the full list
- [x] 2.10 Zero-confirmed-friends account sees an empty state, not a crash

### Phase 3: `/friends` Deep Link & Access-Denial Banner

#### Automated

- [ ] 3.1 Type checking passes: `npx tsc --noEmit`
- [ ] 3.2 Linting passes: `npm run lint`
- [ ] 3.3 Friends tests pass: `npm test -- friends`

#### Manual

- [ ] 3.4 "View collection" deep link from `/friends` lands pre-scoped to the right friend
- [ ] 3.5 Invalid `friend` param redirects to `/friends` with the notice banner
- [ ] 3.6 Plain `/friends` visit shows no banner
- [ ] 3.7 Logged-out visit to `/discover` redirects to `/login`
