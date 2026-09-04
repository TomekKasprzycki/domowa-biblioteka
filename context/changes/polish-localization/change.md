---
id: polish-localization
title: "S-13: Polish Localization — one-off Polish string sweep"
status: implemented
created: 2026-08-22
updated: 2026-09-04
roadmap_id: S-13
prd_refs:
  - "NFR (usable)"
  - "Vision & Problem Statement (Polish persona)"
prerequisites:
  - shelf-view
  - gdpr-assessment
  - forgot-password
  - ux-polish
---

## Notes

Source: `context/design/todo.md` — "przetłumaczyć na polski". Unparks the
"Polish UI / i18n" item in `roadmap.md` § Parked.

Scope is a one-off string sweep to Polish — page text, buttons,
server-action error messages — not a full i18n system: no locale routing,
no message catalogue, no runtime language switching. Sequenced after
S-10/S-11/S-12 specifically so their new UI copy (privacy notice,
delete-account flow, reset-password screen, IconButton labels, friends-list
copy) is translated once rather than twice.

If multi-locale support is wanted later (e.g. keeping an English option),
that's a separate, larger decision needing locale routing and a message
catalogue, and would touch most existing specs since they assert on
English text today.
