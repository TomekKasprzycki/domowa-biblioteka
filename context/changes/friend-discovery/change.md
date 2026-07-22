---
id: friend-discovery
title: "S-03: Friend Discovery — browse and search a confirmed friend's book collection"
status: implemented
created: 2026-07-17
updated: 2026-07-22
roadmap_id: S-03
prd_refs:
  - FR-007
  - US-01
prerequisites:
  - collection-management
  - friend-connections
---

# S-03: Friend Discovery

Users can browse and search (by title or author) the book collection of any confirmed friend, from a single merged cross-friend view, reachable via a nav link or a per-friend deep link from `/friends`.

## Roadmap link

Roadmap item S-03 (`friend-discovery`) — depends on F-02 (auth-scaffold, transitively), S-01 (collection-management), S-02 (friend-connections). Unlocks S-04 (borrow-request), which introduces the Loan entity that will replace this slice's always-"Available" stub with real availability tracking.
