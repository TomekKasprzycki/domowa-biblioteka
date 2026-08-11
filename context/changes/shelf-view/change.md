---
change_id: shelf-view
title: "S-09: Shelf View — books as spines on a shelf, actions in a detail drawer"
status: new
created: 2026-08-11
updated: 2026-08-11
archived_at: null
roadmap_id: S-09
prd_refs:
  - FR-004
  - FR-007
  - US-01
prerequisites:
  - design-system
---

## Notes

The two signature ideas of `context/design/design.html` that S-08 deliberately
left out, because they change behaviour rather than appearance:

1. **Book spines on a shelf** — the collection and discover pages render books
   as coloured vertical spines standing on a shelf ledge, instead of list rows.
   Colour, height and width are derived deterministically from a hash of the
   title (`design.html:694-701`), so a book keeps its spine across renders.
2. **Detail drawer** — selecting a spine opens a right-hand panel carrying that
   book's title, author, ISBN and actions: edit for your own books,
   request-a-borrow for a friend's.

### ISBN in the drawer (added to the mockup 2026-08-11)

The drawer renders the book's ISBN in mono beneath the author
(`design.html:801-807`), with a designed **missing** state — italicised
`Brak numeru ISBN — dodano ręcznie` — for books entered by hand. Four of the
mockup's fixture books deliberately carry no ISBN, which is the design
confirming two things: the column is genuinely nullable, and manual entry is a
first-class path rather than a degraded one.

Two consequences:
- ISBN display belongs **here**, not in S-07. S-07 stores the value and shows
  nothing; this slice is where it becomes visible.
- The drawer shows ISBN for a friend's books as well as your own, so
  `DiscoverBook` (`src/app/discover/discover.types.ts`) and the reader that
  builds it must carry the field. S-07 deliberately stays out of `/discover`,
  so threading it through is this slice's work.

Decisions (2026-08-11):
- Build the drawer on the native `<dialog>`, reusing the `Modal` groundwork from
  S-06, rather than the mockup's fixed-div-plus-overlay. Focus trapping, Esc and
  background inerting come free; a positioned div needs all three hand-written.
- Spines render as `<button>`, not `<div>` — they must be keyboard reachable.
  The visible title is vertical and clipped, so a full `aria-label` with title
  and author is required, not optional.

Open risk carried into planning: spines hide the author and truncate long
titles, so scanning by author becomes a hover-or-click. This matters at the
PRD's stated 150+ books. Search stays, which mitigates it; a list/shelf toggle
is the fallback if it reads badly against real data.
