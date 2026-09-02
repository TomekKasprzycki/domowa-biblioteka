---
id: ux-polish
title: "S-12: Post-Launch UX Polish — IconButton, post-login redirect, friends list layout"
status: impl_reviewed
created: 2026-08-22
updated: 2026-09-02
roadmap_id: S-12
prd_refs:
  - "NFR (usable, responsive)"
  - Guardrails
prerequisites:
  - shelf-view
---

## Notes

Source: `context/design/todo.md`, developer notes captured 2026-08-22:

- Auto-navigate to own collection after login; remove the welcome page.
- New `IconButton` primitive (icon instead of text) with `aria-label` and a
  hover tooltip; label must include context, not just the action (e.g.
  "usuń <tytuł książki>", not just "usuń").
- `/friends`: administrative items collapsed by default; two-column layout
  on `l`/`xl` breakpoints.
- `/friends`: show each friend's shelf book count instead of their email.
- `/friends`: friend cards narrower, matching `context/design/design.html`.

`IconButton` is adopted by every existing delete/edit action across
collection and friends, so this is presentation-plus-navigation, not new
business logic — same "any spec break is an accidental behaviour change"
caveat from S-08 applies. The book-count-per-friend query mirrors the
`countBooksForUser` pattern already used for the sidebar (S-08 planning).
