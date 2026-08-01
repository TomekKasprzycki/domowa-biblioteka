# Borrow Request (S-04) — Plan Brief

> Full plan: `context/changes/borrow-request/plan.md`

## What & Why

The ★ North Star slice: let a signed-in user request to borrow a specific book from a confirmed friend's collection, and let the book's owner approve or decline (FR-008, FR-009, US-01). This is the first moment the product hypothesis — *removing the ask changes borrowing behavior* — becomes testable with real users: a friend browses the catalog and requests without starting a conversation.

## Starting Point

S-03 shipped a browsable/searchable cross-friend discover view with a **static "Available" stub** and left `isConfirmedFriend()` in place, unused, explicitly as this slice's access gate. No loan/borrow entity exists yet — S-04 introduces the first one.

## Desired End State

A friend clicks **Borrow** on an available book in `/discover`; the owner sees the request on `/requests` (surfaced by a nav badge) and clicks **Approve**, creating an active loan starting today and flipping the book to unavailable for all friends. The borrower sees it on `/borrowing` as "Borrowed from {owner}." Decline lets the borrower ask again later. Concurrent approvals of the same book yield exactly one active loan.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Data model | Single `LoanEntity` status machine (requested→active/declined) | Mirrors `FriendConnectionStatus`; one row is the whole lifecycle; S-05 adds return states in place | Plan |
| Concurrency invariant | Postgres **partial unique index** `(bookId) WHERE status='active'` | DB-guaranteed exactly-one-active-loan; reuses `isDuplicateError`; correct under true races | Plan |
| Pending multiplicity | Many pending; first approval wins, index blocks the rest | "Requests never silently lost" guardrail; no requester pre-empted | Plan |
| Loan start date | Explicit `startedAt`, stamped on approval | Unambiguous for S-05 duration logic; independent of `updatedAt` | Plan |
| Owner inbox | Dedicated `/requests` page + nav count badge | Clear FR-009 home; badge solves discovery without push | Plan |
| Borrower view | Dedicated `/borrowing` page | Serves US-01 borrower side; seeds S-05 return action | Plan |
| Borrower-name privacy | Owner sees name; other friends see generic "On loan" | Honors privacy posture; discover viewer is never the owner | Plan |
| Re-request after decline | Allowed (new row); dedup scoped to non-terminal | Mirrors friend reject→re-invite | Plan |
| Request message | None — minimal (book, requester) | FR-008 minimal scope + "few seconds" guardrail | Plan |
| Concurrency test | Dedicated real-DB concurrent-approval test | Proves the headline invariant | Plan |
| Cut line | Nav badge is cut-first; core loop + both pages are must-have | Preserves testable US-01 loop | Plan |

## Scope

**In scope:** `LoanEntity` + repository + partial index; request/approve/decline Server Actions with full guards; discover availability + Borrow button; `/requests` inbox; `/borrowing` view; nav links + pending badge.

**Out of scope:** return/close flow (S-05); owner collection-page loan view / FR-010 (S-05); notifications; request messages; borrower-name exposure to third friends.

## Architecture / Approach

Bottom-up vertical slice: **(1)** data layer (entity + repo + DB-enforced invariant) → **(2)** three Server Actions carrying every access/integrity guard (`isConfirmedFriend`, own-book, availability, dedup, `23505`→"already borrowed") → **(3)** discover Borrow button that *creates* requests → **(4)** `/requests` + `/borrowing` + nav badge that *resolve* them. All patterns copy S-01/S-02/S-03 (repositories, actions, list/row components, jsdom specs).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Loan data layer | Entity, repo, CreateLoanTable migration (partial unique index), concurrency test | Partial index ships as a migration (`synchronize` can't create it) — `migration:run` must hit each env |
| 2. Borrow Server Actions | request / approve / decline + guards + tests | Getting the guard matrix + `23505` race mapping right |
| 3. Discover availability & Borrow | Real availability + Borrow button + specs | Correctly folding loan state + viewer-scoped flags into `DiscoverBook` |
| 4. /requests + /borrowing + nav | Resolve requests, close US-01 loop, badge | Badge query on every render (cuttable if hot) |

**Prerequisites:** S-03 (friend-discovery) complete — done. Neon DB access to apply the index.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- The partial unique index ships via a TypeORM migration (`CreateLoanTable`, mirroring `CreateFriendConnectionTable`); `npm run migration:run` must be applied to each environment's DB before the concurrency test / production use — the sole guarantee of the loan invariant.
- Denormalized `ownerId` on the loan assumes books never change owner (true in v1).
- Owner discovers requests only via in-app badge/page (no notifications, per Non-Goal) — acceptable for a small friend group.

## Success Criteria (Summary)

- A friend can request an available book; the owner approves; the book flips to unavailable and both sides see the loan — the full US-01 loop completes.
- A declined request can be re-sent later; two simultaneous approvals produce exactly one active loan.
- `/requests` and `/borrowing` are gated to signed-in users; a book on loan never reads as "available" to any friend.
