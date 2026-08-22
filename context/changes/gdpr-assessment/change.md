---
id: gdpr-assessment
title: "S-10: Privacy & Data Rights (RODO) — notice + right-to-erasure"
status: implementing
created: 2026-08-22
updated: 2026-08-22
roadmap_id: S-10
prd_refs:
  - Access Control
  - Non-Goals
  - "Open Roadmap Questions #3"
prerequisites:
  - auth-scaffold
  - collection-management
  - friend-connections
  - borrow-request
---

## Notes

Promoted to a roadmap slice 2026-08-22, on top of the applicability research
in `research.md`. Scope for the first cut: a privacy notice explaining what
is collected and why, plus account deletion (right to erasure) cascading
across `BookEntity`, `FriendConnectionEntity`, and `LoanEntity`. Data export
(Art. 15/20) is explicitly deferred — see roadmap Unknowns for S-10.

Also carries an infra finding from the research: Neon's DB host is
`us-east-1` (USA) while Vercel functions run in `cdg1` (Paris, EU) — an
undocumented cross-border transfer. Resolving that (EU Neon region, or a
documented transfer basis) is part of this change's risk, not a separate
change.
