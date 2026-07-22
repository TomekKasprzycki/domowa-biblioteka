# Friend Discovery (S-03) — Plan Brief

> Full plan: `context/changes/friend-discovery/plan.md`
> Plan review: `context/changes/friend-discovery/reviews/plan-review.md`

## What & Why

FR-007: a signed-in user can browse and search, by title or author, the book collection of any confirmed friend. This is the third product slice, unlocking S-04 (borrow-request) — the roadmap's own "North Star" — which depends on users first being able to find a book worth borrowing.

## Starting Point

`BookEntity` (S-01, merged) and `FriendConnectionEntity` (S-02, merged) both exist on `master`. No Loan/borrow entity exists yet — that's S-04, which this slice unlocks but doesn't build. No cross-owner book query, no confirmed-friend projection, and no search/filter UI pattern exist anywhere in the codebase today.

## Desired End State

A user clicks "Discover" in the nav and sees every book owned by any of their confirmed friends in one merged, live-searchable list, each tagged with its owner and a static "Available" badge. Clicking "View collection" on a friend in `/friends` jumps straight to `/discover` pre-scoped to that friend. A stale or tampered deep link redirects back to `/friends` with a clear message instead of leaking access or crashing.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Availability | Stub as always-"Available", no data field | No Loan entity exists yet (S-04 scope); avoids inventing throwaway schema | Plan |
| Browse scope | Cross-friend search — one unified page, not per-friend pages | User's explicit call over the more literal "per-friend page" FR reading | Plan |
| Search implementation | Client-side, live (no submit gating) | Matches target scale (~150 books/friend); no server round-trip to protect against | Plan |
| Access control | `/discover?friend=<id>` validated against the fetched friend list; invalid → redirect to `/friends?notice=` | Gates a user-suppliable id without a DB query that would crash on a malformed uuid | Plan + Review (F1) |
| Testing depth | Dedicated page-level specs for `/discover` and `/friends` | Both pages get real conditional/redirect logic for the first time in this codebase | Plan |
| Friend filter UI | Must-have `<select>`, not cut | Landing pre-scoped via the deep link needs a visible, clearable control | Plan |

## Scope

**In scope:** cross-friend book browse/search, live client-side filtering, friend-scoped deep link with access-control redirect, nav entry point, repository-layer helpers (`findByOwnerIds`, `findFriendUsers`, plus `isConfirmedFriend` as S-04 groundwork).

**Out of scope:** any borrow/request action, real availability/loan tracking, full-text search, pagination, general toast infrastructure, per-friend dedicated routes.

## Architecture / Approach

Two new repository functions used by the page (`findByOwnerIds` on books, `findFriendUsers` on friend connections) plus `isConfirmedFriend` for S-04 — no new entity, no migration. A new `/discover` route follows the established Server Component → plain-object mapping → Client Component shape, with all filtering as client React state (the first search UI in this codebase). The deep-link access gate validates the `friend` param against the already-fetched friend list in memory (not a DB query), so a malformed value redirects cleanly instead of crashing. `/friends` gains a deep link out and a `?notice=` banner in.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Repository Layer & Friend Type Fix | `findByOwnerIds`, `findFriendUsers`, `isConfirmedFriend` (S-04 groundwork), plus the `Friend.otherUser.id` type fix Phase 3's link depends on | Type fix must land with its two fixture updates in the same phase, or later phases silently break |
| 2. `/discover` Page, Components & Nav | The full browse/search UI, owner-tagged rows, nav link, first page-level spec | First `searchParams`/`redirect()` usage and first page-level spec in this codebase — no copy-paste precedent |
| 3. `/friends` Deep Link & Access-Denial Banner | "View collection" link, notice banner, redirect validation | Reuses Phase 2's new page-spec pattern rather than inventing a second one |

**Prerequisites:** S-01 (collection-management) and S-02 (friend-connections) merged to `master` — confirmed true.
**Estimated effort:** ~3 sessions, one per phase, matching S-01/S-02's cadence.

## Open Risks & Assumptions

- The roadmap's stated S-03 Outcome text ("availability... visible") is only partially satisfied by the always-"Available" stub — flagged explicitly in the plan, not hidden.
- Page-level specs for `/discover` and `/friends` are new ground for this codebase (no existing page has one) — budget real time for the first one; the second reuses the pattern.

## Success Criteria (Summary)

- A user can find a specific friend's book by typing a few letters of its title or author, from a single page, without needing to know which friend owns it.
- A user can jump straight to one friend's books from `/friends` and knows immediately if that link is stale (banner, not a silent failure or crash).
- `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass; the full manual walkthrough (see plan) succeeds end-to-end.
