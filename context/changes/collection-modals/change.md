---
change_id: collection-modals
title: "S-06: Collection Modals — add and edit books in a modal dialog"
status: planned
created: 2026-08-11
updated: 2026-08-11
archived_at: null
roadmap_id: S-06
prd_refs:
  - FR-003
  - FR-004
prerequisites:
  - collection-management
---

## Notes

Adding and updating books should happen in modals instead of the always-visible
inline form (`add-book-form.tsx`) and the inline row-replacement editor
(`edit-book-row.tsx`), so `/collection` reads as a list of books rather than a
form with a list underneath.

Decision (2026-08-11): built on the **native `<dialog>` element** — no dialog
dependency is installed and none is being added. Rejected shadcn/ui + Radix as
disproportionate for a solo project that has no component-system scaffolding
(`components.json`, `cn`) today.

Known trap carried into planning: jsdom implements neither
`HTMLDialogElement.showModal()` nor `.close()`, so component specs need a shared
stub under `test/shared/`.

Prerequisite for S-07 (`isbn-lookup`) — the ISBN field will live inside the add
modal this change creates.
