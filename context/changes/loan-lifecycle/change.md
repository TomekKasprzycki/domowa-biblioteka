---
id: loan-lifecycle
title: "S-05: Loan Lifecycle — owner sees loan state; loans close by two-sided return confirmation"
status: implementing
created: 2026-08-01
updated: 2026-08-01
roadmap_id: S-05
prd_refs:
  - FR-010
  - FR-011
  - US-01
prerequisites:
  - borrow-request
---

# S-05: Loan Lifecycle

A book owner can see the current loan state of their own books (which are lent out, to whom, since when), and an active loan can be closed by two-sided confirmation: the borrower marks "I returned it", and the owner confirms "I received it back."

## Roadmap link

Roadmap item S-05 (`loan-lifecycle`) — depends on S-04 (`borrow-request`), which shipped the `LoanEntity` state machine (`requested → active | declined`) and the `/requests` + `/borrowing` surfaces this slice extends. S-05 closes the borrow loop the PRD's primary success criterion depends on. No further slice depends on it; FR-012 (reviews) remains parked.
