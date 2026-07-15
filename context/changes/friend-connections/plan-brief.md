# Friend Connections (S-02) — Plan Brief

> Full plan: `context/changes/friend-connections/plan.md`

## What & Why

Users can invite another registered user (by email) to connect, the recipient can accept or reject, and either side of an accepted connection can remove it. This unlocks the "confirmed friend" access gate that S-03 (friend-discovery) and everything downstream (borrow requests, loans) depends on — without it, no one's collection is visible to anyone else.

## Starting Point

No `FriendConnection` entity, repository, or `/friends` route exists yet. `UserEntity` has only `email` (no `username`), and Auth/session/route-protection are fully wired from F-02 — any new route is auto-protected without config changes. S-01 (collection-management) just merged and establishes the entity/repository/action/UI/test conventions this plan follows.

## Desired End State

A signed-in user visits `/friends`, sends an invite by email, sees it in "Sent," and the recipient sees it in "Received" with Accept/Reject controls. Accepting moves both users into each other's "Friends" list; either side can remove a friend later. Self-invites, invites to unknown emails, and duplicate/already-friends invites are rejected with friendly messages. Inviting someone who already invited you auto-resolves as acceptance instead of creating a duplicate row.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Plan scope | Full S-02 (send + accept + reject), plus a small remove/unfriend extension | An invite with no resolution path is a dead-end feature; remove gives an escape hatch for mistaken accepts | Plan |
| Email vs username | Email-only lookup | `UserEntity` has no `username` column; adding one is deferred to avoid touching the already-merged auth foundation | Plan |
| Data model | Single `FriendConnection` row with a `status` enum (pending/accepted/rejected) | Simplest schema, mirrors Book's single-entity style already in the codebase | Plan |
| Symmetric query | Canonicalized `findConnectionBetween(userA, userB)` helper | Centralizes the OR-query so every read/write path shares one tested implementation | Plan |
| Duplicate/re-invite handling | Block while a non-rejected row exists; allow re-invite (in place) after rejection | Lets a one-off rejection be recoverable without permanently locking two users out | Plan |
| Reverse-pending invites | Auto-resolve as mutual accept | Avoids a confusing duplicate-pending state when both users try to connect at once | Plan |
| Pair uniqueness | Unique expression index on `(LEAST(ids), GREATEST(ids))`, hand-added to the migration | A column-list `@Unique` is unique on the *ordered* tuple, so it would let (A,B) and (B,A) coexist — it can't express the invariant | Plan review (F3) |
| Duplicate-error helper | Extract `isDuplicateError` to `src/lib/db-error.utils.ts` | It's module-private in collection/actions.ts, so "reuse" required either an unsanctioned copy or an unlisted edit to S-01 | Plan review (F4) |
| Unfriend confirmation | `window.confirm()` + hard delete | Reuses Book's exact delete pattern — no new UI concept, no soft-delete precedent to diverge from | Plan |
| Unknown email | Friendly validation error, no row created | Matches FR-005's literal scope (registered users only); enumeration risk is low in a small trusted friend group | Plan |
| Test style | Given/when/then comment blocks in new specs | Applies AGENTS.md's rule strictly for this new suite, even though S-01's specs don't follow it | Plan |
| Priority cut line | Drop unfriend/remove first under time pressure | It's an extension beyond FR-005/FR-006, so it's the least load-bearing piece | Plan |

## Scope

**In scope:** send invite (by email), accept, reject, remove an accepted connection, self-invite/unknown-email/duplicate/already-friends validation, reverse-pending auto-accept, re-invite after rejection.

**Out of scope:** `username` field/lookup, canceling a sent pending invite, any notification/badge for pending invites, blocking/reporting, friend suggestions or social-graph analytics, browsing a friend's collection (S-03), soft-delete/history of removed friendships.

## Architecture / Approach

Mirrors S-01 exactly: `FriendConnectionEntity` (two FKs to `UserEntity` — `requester`/`addressee` — instead of Book's one `owner`) → `friend-connection.repository.ts` (plain functions, string-keyed `getRepository`, ownership-scoped queries) → `src/app/friends/actions.ts` (Server Actions, `useActionState` shape) → `src/app/friends/page.tsx` + `_components/*` (server component fetches, maps entities to plain objects, passes to client components). The one new concept is `findConnectionBetween`, a single repository helper that queries a connection in either direction so no other function has to re-derive that OR-logic.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. FriendConnection Entity, Migration & Repository | Entity, migration (incl. hand-added canonical-pair index), repository with `sendInvite` branching, `findConnectionBetween`, relation-loading finders | The five-way `sendInvite` branch is new territory here; the dev server must be stopped before `migration:generate` or the migration comes back empty |
| 2. Server Actions | `isDuplicateError` extracted to a shared util, then send/accept/reject/remove actions | Action layer must not re-implement branching already in the repository; the extract touches S-01 code, so `collection/actions` tests are the regression gate |
| 3. Friends Page UI & Navigation | `/friends` page, send form, received/friends lists w/ accept/reject/remove, nav link | Manual walkthrough needs two-plus real accounts to exercise reverse-pending and re-invite scenarios |

**Prerequisites:** F-02 (auth-scaffold, merged). Parallel with S-01 (collection-management, merged) — no shared code dependency between them beyond `UserEntity`.
**Estimated effort:** ~2-3 sessions across 3 phases, similar size to S-01.

## Open Risks & Assumptions

- The at-most-one-connection-per-pair invariant is enforced by a unique expression index on the canonical pair, so the concurrent-mutual-invite race resolves as a `23505` rather than two rows. `sendInvite`'s check-then-act still has a TOCTOU window, but the DB now closes it — the action re-reads the row and reports the ordinary duplicate/already-friends message. (Was an accepted risk pre-review; F3 found the original `@Unique` couldn't enforce the pair invariant at all.)
- Relation loading (`relations: { requester: true, ... }`) is the first of its kind in this codebase — `BookEntity.owner` is declared but never queried. TypeORM 1.0.0 supports it on the string-keyed `getRepository` form, but Phase 1's tests must assert relations actually populate, since `tsc` cannot catch a silent `undefined` on a non-nullable property.
- `synchronize: true` in development means the dev server must be stopped before `migration:generate`, or the migration silently comes back empty. Called out as a hard ordering constraint in the plan.
- Deferring `username` support means FR-005's literal wording ("by email or username") is only partially satisfied; flagged as an explicit scope decision, not an oversight.

## Success Criteria (Summary)

- A user can send, accept, reject, and remove friend connections entirely through `/friends`, with every edge case (self-invite, unknown email, duplicate, already-friends, reverse-pending, re-invite-after-rejection) handled with a friendly message or auto-resolution instead of a crash or silent no-op.
- A user who isn't a party to a connection can never accept, reject, or remove it (ownership-scoped at the repository query level, matching Book's invariant).
