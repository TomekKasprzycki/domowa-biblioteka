---
id: borrow-request
title: "S-04: Borrow Request — request a friend's book; owner approves or declines; loan created"
status: implementing
created: 2026-07-22
updated: 2026-07-22
roadmap_id: S-04
prd_refs:
  - FR-008
  - FR-009
  - US-01
prerequisites:
  - friend-discovery
---

# S-04: Borrow Request ★ (North Star)

A signed-in user can request to borrow a specific book from a confirmed friend's collection, and the book's owner can approve or decline the request. An approved request creates an active loan and marks the book unavailable to all other friends until it is returned (S-05).

## Roadmap link

Roadmap item S-04 (`borrow-request`), the ★ North Star — depends on S-03 (friend-discovery). Unlocks S-05 (loan-lifecycle), which adds the two-sided return-confirmation flow and the owner's collection-page loan-state view on top of this slice's `LoanEntity`.
