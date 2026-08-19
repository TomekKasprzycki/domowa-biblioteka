---
change_id: isbn-lookup
title: "S-07: ISBN Lookup — autofill title and author from ISBN, store the ISBN"
status: implementing
created: 2026-08-11
updated: 2026-08-19
archived_at: null
roadmap_id: S-07
prd_refs:
  - FR-003
  - NFR / Guardrails
prerequisites:
  - collection-modals
---

## Notes

In the add-book modal (built in S-06), the user can optionally enter an ISBN and
have title and author fetched from Open Library and filled in. The fields stay
editable, and the normalized ISBN is stored on the book.

Un-parks what was a PRD Non-Goal — `prd.md` §Non-Goals and FR-003 were both
amended on 2026-08-11 to record the reversal, so this is not scope drift.

Decisions (2026-08-11):
- **Open Library** (`openlibrary.org/api/books`), keyless — no API key, no new
  env var.
- One nullable `isbn` column. **No unique constraint** — a user may own two
  copies, and the existing `@Unique(["userId","title","author"])` already guards
  duplicates.
- A failed lookup must never block manual entry. Timeout, non-200 and
  empty-result all degrade to "not found" with the form still usable.
- First change needing `msw`, which AGENTS.md mandates for HTTP mocking but
  which is not yet installed. Pin it, no `^`.

### Confirmation gate after a lookup (decided 2026-08-15)

Research verified that the lookup can return a *plausible but wrong* book:
practically any well-formed 13-digit string resolves to some record in Open
Library (`9999999999999` returns a real title), and a found record may carry no
`authors` key at all. Autofilled data is therefore untrusted input.

**Rule: a save that follows a lookup must be preceded by an explicit user
confirmation.** Autofill never leads straight to a write. The user reviews what
came back, corrects a wrong match or completes a missing author, and only then
confirms. The fetched fields stay fully editable throughout — the confirmation
is an acknowledgement step, not a lock.

Consequences:

- The gate is **conditional on a lookup having happened**. A book typed in
  entirely by hand keeps the current one-step submit; nothing about the manual
  path gets slower. The add form therefore has to track whether the current
  field values were machine-filled.
- This makes "found, but no author" a normal, well-handled outcome rather than
  an edge case: title fills, author stays empty, and the user cannot confirm
  without supplying it (`author` is a required field).
- It does not replace ISBN checksum validation. The checksum stops a typo
  *before* the request goes out; the confirmation catches a wrong match that
  still looks well-formed. They defend different failures — decide on the
  checksum separately.
- The gate is client-side and pre-submit, so the server action contract and
  `useActionSuccess` are unaffected.

### Display: deferred to S-09 (revised 2026-08-11)

The original scope had this slice render the ISBN on the owner's book row. The
design mockup was updated to show ISBN **in the S-09 detail drawer** instead —
including an explicit missing state (`design.html:801-807`), styled in mono and
italicised when absent.

So this slice does **not** render the ISBN anywhere. The visible outcome here is
the autofill itself; display lands in S-09. Adding it to `book-row.tsx` would be
guaranteed throwaway work, since S-09 replaces that component with spines.

Consequence for S-09: the drawer shows ISBN for a *friend's* books too, so
`DiscoverBook` needs the field. That is S-09's job, not this one — this slice
stays out of `/discover` entirely.
